import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSettings } from "@/lib/stores/useSettings";
import { useBiome, lerpColor, lerpNumber } from "@/lib/stores/useBiome";

/**
 * Lightweight value noise (smooth enough for rolling hills)
 * deterministic for the same input, no dependencies.
 */
function snoise2(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (s - Math.floor(s));
}
function smoothNoise(x: number, y: number) {
  // 4-sample bilinear
  const iX = Math.floor(x), iY = Math.floor(y);
  const fx = x - iX, fy = y - iY;
  const n00 = snoise2(iX, iY);
  const n10 = snoise2(iX + 1, iY);
  const n01 = snoise2(iX, iY + 1);
  const n11 = snoise2(iX + 1, iY + 1);
  const nx0 = n00 * (1 - fx) + n10 * fx;
  const nx1 = n01 * (1 - fx) + n11 * fx;
  return nx0 * (1 - fy) + nx1 * fy;
}
function fbm(x: number, y: number, octaves = 4, falloff = 0.5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * smoothNoise(x * freq, y * freq);
    norm += amp;
    amp *= falloff;
    freq *= 2;
  }
  return sum / norm;
}

export function Environment() {
  const updateTransition = useBiome((s) => s.updateTransition);
  useFrame((_, delta) => updateTransition(delta));
  return (
    <>
      <SkyAndFog />
      <Lights />
      <Terrain />
      <BackgroundSilhouette />
    </>
  );
}

/** ---------- Sky + Fog (biome-aware, with transitions & weather override) */
function SkyAndFog() {
  const weather = useSettings((s) => s.weather);
  const current = useBiome((s) => s.getCurrentConfig());
  const prev = useBiome((s) => s.getPreviousConfig());
  const t = useBiome((s) => s.transitionProgress);
  const isX = useBiome((s) => s.isTransitioning);

  let sky = current.skyColor;
  let fog = current.fogColor;
  let near = current.fogNear;
  let far = current.fogFar;

  if (isX && prev) {
    sky = lerpColor(prev.skyColor, current.skyColor, t);
    fog = lerpColor(prev.fogColor, current.fogColor, t);
    near = lerpNumber(prev.fogNear, current.fogNear, t);
    far  = lerpNumber(prev.fogFar,  current.fogFar,  t);
  }

  if (weather === "overcast") {
    sky = "#1b2430";
    fog = "#1b2430";
    near = 28;
    far  = 95;
  }

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[fog, near, far]} />
    </>
  );
}

/** ---------- Lights (sun + fill + rim), biome-aware intensities */
function Lights() {
  const weather = useSettings((s) => s.weather);
  const current = useBiome((s) => s.getCurrentConfig());
  const prev = useBiome((s) => s.getPreviousConfig());
  const t = useBiome((s) => s.transitionProgress);
  const isX = useBiome((s) => s.isTransitioning);

  let sun = current.sunIntensity;
  let amb = current.ambientIntensity;

  if (isX && prev) {
    sun = lerpNumber(prev.sunIntensity, current.sunIntensity, t);
    amb = lerpNumber(prev.ambientIntensity, current.ambientIntensity, t);
  }
  if (weather === "overcast") {
    sun = 0.65;
    amb = 0.35;
  }

  return (
    <>
      <hemisphereLight intensity={0.25} color={"#8fbcd4"} groundColor={"#3b4b3e"} />
      <ambientLight intensity={amb} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      {/* subtle back rim so silhouettes read against the sky */}
      <directionalLight position={[-10, 8, -12]} intensity={0.25} />
    </>
  );
}

/** ---------- Terrain: wide rolling hills with FBM noise, biome-tinted */
function Terrain() {
  const current = useBiome((s) => s.getCurrentConfig());
  const prev = useBiome((s) => s.getPreviousConfig());
  const t = useBiome((s) => s.transitionProgress);
  const isX = useBiome((s) => s.isTransitioning);

  // blend terrain colors across biomes
  let terrainColor = current.terrainColor;
  if (isX && prev) terrainColor = lerpColor(prev.terrainColor, current.terrainColor, t);

  // one big ground sheet so you always see “land” under the road
  const geo = useMemo(() => {
    const w = 220, h = 520, wSeg = 90, hSeg = 180;
    const g = new THREE.PlaneGeometry(w, h, wSeg, hSeg);
    const p = g.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);

      // gentle FBM hills; tuned to be road-friendly (no cliffs next to road)
      const base = fbm((x + 1000) * 0.015, (y + 1000) * 0.02, 4, 0.55); // 0..1
      const ridge = fbm((x - 50) * 0.006, (y + 200) * 0.006, 3, 0.5);
      const height = (base * 3.2 + ridge * 1.2) - 2.6;

      p.setZ(i, height);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 60]} receiveShadow>
      <primitive object={geo} />
      <meshStandardMaterial color={terrainColor} roughness={0.95} metalness={0.02} />
    </mesh>
  );
}

/** ---------- Far mountains silhouettes for depth (super cheap) */
function BackgroundSilhouette() {
  const groupRef = useRef<THREE.Group>(null);
  // very lightweight parallax (slow drift) to avoid “static poster” feel
  useFrame((state) => {
    if (groupRef.current) groupRef.current.position.z = (state.clock.getElapsedTime() * 0.25) % 80;
  });

  const cones = useMemo(
    () => ([
      { k: 0, pos: [-70, -8, -10], s: 2.5, c: "#132833" },
      { k: 1, pos: [ 60, -8,  20], s: 2.0, c: "#163141" },
      { k: 2, pos: [-55, -8,  55], s: 2.8, c: "#122233" },
      { k: 3, pos: [ 75, -8,  85], s: 2.2, c: "#152a3a" },
    ]),
    []
  );

  return (
    <group ref={groupRef}>
      {cones.map(m => (
        <mesh key={m.k} position={m.pos as [number, number, number]} scale={m.s} receiveShadow>
          <coneGeometry args={[22, 30, 4]} />
          <meshStandardMaterial color={m.c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
