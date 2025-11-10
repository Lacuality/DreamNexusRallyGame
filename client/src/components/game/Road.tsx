// client/src/components/game/Road.tsx
import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GAME_CONFIG, DREAM_NEXUS_COLORS } from "@/lib/constants";

interface RoadProps {
  carPosition: THREE.Vector3;
}

// ---- Tunables -------------------------------------------------------------
const ROAD_LENGTH = 200;            // visible chunk length
const ROAD_Z_OFFSET = -50;          // where the chunk is positioned relative to the car
const EDGE_WIDTH = 0.28;            // yellow curb width
const EDGE_LIFT = 0.015;            // small lift to avoid z-fighting with asphalt
const EDGE_EMISSIVE = "#ffcc00";    // curb emissive
const DASH_LENGTH = 2;
const DASH_THICK = 0.05;
const DASH_GAP = 4.0;               // spacing between dashes
const DASH_LIFT = 0.012;

// Shared curve/elevation function so EVERYTHING matches
function sampleCurveAndElev(t: number) {
  // t is the local "forward" axis of the road geometry (PlaneGeometry Y)
  const curve = Math.sin(t * 0.02) * 2.0;                   // mild lateral sway
  const elev =
    Math.sin(t * 0.03) * 0.45 + Math.cos(t * 0.05) * 0.28;  // rolling hills
  return { curve, elev };
}

// Deform a PlaneGeometry so it follows our curve/elevation.
// width: plane width (X), length: plane length (Y).
function makeDeformedPlane(width: number, length: number, widthSegs: number, lengthSegs: number, xOffset: number, lift = 0) {
  const geo = new THREE.PlaneGeometry(width, length, widthSegs, lengthSegs);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + xOffset; // move plane sideways first
    const y = pos.getY(i);           // forward axis
    const { curve, elev } = sampleCurveAndElev(y);
    pos.setX(i, x + curve);          // push sideways according to curve
    pos.setZ(i, elev + lift);        // lift with terrain
  }
  geo.computeVertexNormals();
  return geo;
}

export function Road({ carPosition }: RoadProps) {
  const roadRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const asphaltTexture = useTexture("/textures/asphalt.png");

  useMemo(() => {
    asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
    // Tile a bit more on the forward axis so the texture doesn't stretch
    asphaltTexture.repeat.set(4, 28);
    asphaltTexture.anisotropy = gl.capabilities.getMaxAnisotropy?.() ?? 8;
  }, [asphaltTexture, gl]);

  const roadGeometry = useMemo(() => {
    // Wider than lane width so we have some shoulder
    const width = GAME_CONFIG.LANE_WIDTH + 0.6;
    return makeDeformedPlane(width, ROAD_LENGTH, 20, 200, 0, 0);
  }, []);

  useFrame(() => {
    if (roadRef.current) {
      roadRef.current.position.z = carPosition.z + ROAD_Z_OFFSET;
    }
  });

  return (
    <group>
      {/* Asphalt */}
      <mesh ref={roadRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={roadGeometry} />
        <meshStandardMaterial
          map={asphaltTexture}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* Curbs & center line that follow the exact same curve */}
      <RoadEdges carPosition={carPosition} />
      <CenterLine carPosition={carPosition} />
    </group>
  );
}

function RoadEdges({ carPosition }: { carPosition: THREE.Vector3 }) {
  const leftEdgeRef = useRef<THREE.Mesh>(null);
  const rightEdgeRef = useRef<THREE.Mesh>(null);

  // Build each curb as a thin deformed plane that hugs the asphalt
  const leftEdgeGeometry = useMemo(() => {
    const xOffset = -(GAME_CONFIG.LANE_WIDTH / 2) - 0.02; // slight outside offset
    return makeDeformedPlane(EDGE_WIDTH, ROAD_LENGTH, 1, 200, xOffset, EDGE_LIFT);
  }, []);
  const rightEdgeGeometry = useMemo(() => {
    const xOffset = (GAME_CONFIG.LANE_WIDTH / 2) + 0.02;
    return makeDeformedPlane(EDGE_WIDTH, ROAD_LENGTH, 1, 200, xOffset, EDGE_LIFT);
  }, []);

  useFrame(() => {
    if (leftEdgeRef.current) leftEdgeRef.current.position.z = carPosition.z + ROAD_Z_OFFSET;
    if (rightEdgeRef.current) rightEdgeRef.current.position.z = carPosition.z + ROAD_Z_OFFSET;
  });

  // polygonOffset removes flicker with asphalt
  const curbMat = (
    <meshStandardMaterial
      color={EDGE_EMISSIVE}
      emissive={EDGE_EMISSIVE}
      emissiveIntensity={0.35}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
    />
  );

  return (
    <>
      <mesh
        ref={leftEdgeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={leftEdgeGeometry}
      >
        {curbMat}
      </mesh>
      <mesh
        ref={rightEdgeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={rightEdgeGeometry}
      >
        {curbMat}
      </mesh>
    </>
  );
}

function CenterLine({ carPosition }: { carPosition: THREE.Vector3 }) {
  const linesRef = useRef<THREE.Group>(null);

  // Prebuild dash geometry
  const dashGeometry = useMemo(
    () => new THREE.BoxGeometry(0.16, DASH_THICK, DASH_LENGTH),
    []
  );

  // Precompute dash transforms along the same curve/elevation
  const dashes = useMemo(() => {
    const list: { key: number; position: [number, number, number] }[] = [];
    const count = Math.floor(ROAD_LENGTH / (DASH_LENGTH + DASH_GAP)) + 6; // extra to avoid popping

    for (let i = 0; i < count; i++) {
      const zLocal =
        -ROAD_LENGTH / 2 + i * (DASH_LENGTH + DASH_GAP); // along the road
      const { curve, elev } = sampleCurveAndElev(zLocal);
      // X follows the curve, Y is slight lift, Z is along the road
      list.push({
        key: i,
        position: [curve, DASH_LIFT + elev, zLocal] as [number, number, number],
      });
    }
    return list;
  }, []);

  useFrame(() => {
    if (linesRef.current) {
      linesRef.current.position.z = carPosition.z + ROAD_Z_OFFSET;
    }
  });

  return (
    <group ref={linesRef}>
      {dashes.map((dash) => (
        <mesh key={dash.key} position={dash.position} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={dashGeometry} />
          <meshStandardMaterial
            color={DREAM_NEXUS_COLORS.roadLine}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
    </group>
  );
}
