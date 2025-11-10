// client/src/components/game/Road.tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GAME_CONFIG, DREAM_NEXUS_COLORS } from "@/lib/constants";

/**
 * Single source of truth: we sample lateral curve (x) and elevation (y)
 * from the same function for road, edges and center dashes.
 */
function sampleCurveAndElev(zLocal: number) {
  // tweakable params – gentle OutRun-style curves/hills
  const x =
    Math.sin(zLocal * 0.015) * 1.8 + // wide slow bend
    Math.sin(zLocal * 0.045) * 0.6;  // small wiggle overlay

  const elev =
    Math.sin(zLocal * 0.022) * 0.35 + // rolling hill
    Math.cos(zLocal * 0.035) * 0.25;  // smaller undulation

  return { x, elev };
}

type RoadProps = { carPosition: THREE.Vector3 };

// ---- tunables (safe to tweak) ----
const ROAD_LENGTH = 260;           // world units visible at once
const ROAD_WIDTH  = GAME_CONFIG.LANE_WIDTH + 0.6;
const LEN_SEGS    = 220;           // longitudinal resolution
const WID_SEGS    = 2;             // cross resolution for the road (flat strip)

const EDGE_WIDTH  = 0.28;
const EDGE_OFFSET = 0.02;          // tiny push outward from the road edge
const EDGE_LIFT   = 0.015;         // lifts above asphalt to avoid z-fighting

const DASH_LENGTH = 2.0;
const DASH_GAP    = 4.0;
// ----------------------------------

export function Road({ carPosition }: RoadProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Asphalt
  const asphaltTexture = useTexture("/textures/asphalt.png");
  useMemo(() => {
    asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.anisotropy = 8;
    // tile by real distance so it doesn’t smear when the curve stretches
    asphaltTexture.repeat.set(2, ROAD_LENGTH / 8);
  }, [asphaltTexture]);

  // Shared helpers
  const lenStep = ROAD_LENGTH / LEN_SEGS;
  const halfWidth = ROAD_WIDTH * 0.5;

  // ==== ROAD GEOMETRY (deformed strip) ====
  const roadGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH, WID_SEGS, LEN_SEGS);
    // We will bend the geo by moving vertices according to sampleCurveAndElev
    const pos = geo.attributes.position as THREE.BufferAttribute;

    for (let j = 0; j <= LEN_SEGS; j++) {
      const zLocal = -ROAD_LENGTH * 0.5 + j * lenStep; // local Z along the strip
      const { x, elev } = sampleCurveAndElev(zLocal);

      for (let i = 0; i <= WID_SEGS; i++) {
        const idx = j * (WID_SEGS + 1) + i;
        // original plane is centered at (0,0,0) with width along X and length along Y.
        // We rotate later, but we reshape in local plane space now.
        const xLateral = -halfWidth + (i / WID_SEGS) * ROAD_WIDTH;

        pos.setX(idx, xLateral + x);
        pos.setY(idx, zLocal);     // use Y for length (before rotation)
        pos.setZ(idx, elev);
      }
    }

    // Fix UVs so V follows length
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let j = 0; j <= LEN_SEGS; j++) {
      for (let i = 0; i <= WID_SEGS; i++) {
        const idx = j * (WID_SEGS + 1) + i;
        uv.setX(idx, i / WID_SEGS * 1.0);        // 0..1 across width
        uv.setY(idx, j / LEN_SEGS * (ROAD_LENGTH / 8)); // tile along length
      }
    }

    geo.computeVertexNormals();
    // Rotate so Y(length) -> Z, Z(elev) -> Y (standard ground orientation)
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  // ==== EDGE RIBBONS (left & right) ====
  function buildEdgeGeometry(side: "left" | "right") {
    const strip = new THREE.BufferGeometry();
    // 2 vertices per segment row (inner & outer of the ribbon)
    const verts = new Float32Array((LEN_SEGS + 1) * 2 * 3);
    const idxs: number[] = [];

    const sign = side === "left" ? -1 : 1;
    const baseX = sign * (halfWidth + EDGE_OFFSET);

    for (let j = 0; j <= LEN_SEGS; j++) {
      const zLocal = -ROAD_LENGTH * 0.5 + j * lenStep;
      const { x, elev } = sampleCurveAndElev(zLocal);

      // inner edge (touches road)
      const iIdx = j * 2 * 3;
      verts[iIdx + 0] = baseX + x;                 // X
      verts[iIdx + 1] = elev + EDGE_LIFT;          // Y (height)
      verts[iIdx + 2] = zLocal;                    // Z (forward)

      // outer edge (ribbon thickness)
      const oIdx = iIdx + 3;
      verts[oIdx + 0] = baseX + x + sign * EDGE_WIDTH;
      verts[oIdx + 1] = elev + EDGE_LIFT;
      verts[oIdx + 2] = zLocal;

      // triangles along the strip
      if (j < LEN_SEGS) {
        const a = j * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        idxs.push(a, b, c, b, d, c);
      }
    }

    strip.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    strip.setIndex(idxs);
    strip.computeVertexNormals();
    // rotate to ground orientation: Y(up) stays Y, Z(forward) stays Z (already correct)
    return strip;
  }

  const leftEdgeGeometry  = useMemo(() => buildEdgeGeometry("left"),  []);
  const rightEdgeGeometry = useMemo(() => buildEdgeGeometry("right"), []);

  // ==== CENTER DASHES ====
  const dashes = useMemo(() => {
    const arr: { pos: THREE.Vector3 }[] = [];
    const period = DASH_LENGTH + DASH_GAP;
    const count = Math.floor(ROAD_LENGTH / period) + 6;

    for (let k = -3; k < count - 3; k++) {
      const localZ = -ROAD_LENGTH * 0.5 + k * period + DASH_GAP * 0.5;
      const { x, elev } = sampleCurveAndElev(localZ);
      arr.push({ pos: new THREE.Vector3(x, elev + EDGE_LIFT * 0.5, localZ) });
    }
    return arr;
  }, []);

  // Follow the car
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.z = carPosition.z;
  });

  return (
    <group ref={groupRef}>
      {/* ROAD */}
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial
          map={asphaltTexture}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* LEFT EDGE */}
      <mesh geometry={leftEdgeGeometry}>
        <meshStandardMaterial
          color={"#ffcc00"}
          emissive={"#ffcc00"}
          emissiveIntensity={0.35}
          roughness={0.4}
          metalness={0.0}
        />
      </mesh>

      {/* RIGHT EDGE */}
      <mesh geometry={rightEdgeGeometry}>
        <meshStandardMaterial
          color={"#ffcc00"}
          emissive={"#ffcc00"}
          emissiveIntensity={0.35}
          roughness={0.4}
          metalness={0.0}
        />
      </mesh>

      {/* CENTER LINE DASHES */}
      {dashes.map((d, i) => (
        <mesh key={i} position={d.pos}>
          <boxGeometry args={[0.16, 0.04, DASH_LENGTH]} />
          <meshStandardMaterial color={DREAM_NEXUS_COLORS.roadLine} />
        </mesh>
      ))}
    </group>
  );
}
