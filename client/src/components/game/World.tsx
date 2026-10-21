import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { roadX, roadY, ROAD_HALF, hash } from "@/lib/track";
import { blendedBiome, useBiome } from "@/lib/stores/useBiome";
import { run } from "@/lib/game/run";

/**
 * Everything static-ish around the car: sky, fog, lights, the road strip,
 * shoulders and the valley terrain. Geometry is rebuilt in world space every
 * few metres (cheap), so the road can curve and climb for ever.
 */

const STEP = 3; // metres between rows
const BEHIND = 45;
const AHEAD = 270;
const ROWS = Math.ceil((BEHIND + AHEAD) / STEP) + 1;
const REBUILD_EVERY = 6;

const ROAD_W = ROAD_HALF + 0.3;

// lateral columns for the terrain (metres from road centre) and their base height
const TERRAIN_COLS: [number, number][] = [
  [-150, 26],
  [-70, 9],
  [-32, 2.6],
  [-16, 0.4],
  [-8.5, -0.15],
  [-ROAD_W - 0.2, -0.08],
  [ROAD_W + 0.2, -0.08],
  [8.5, -0.15],
  [16, 0.4],
  [32, 2.6],
  [70, 9],
  [150, 26],
];

function makeStripeTexture(colors: string[], size = 64, vertical = true) {
  const c = document.createElement("canvas");
  c.width = vertical ? 4 : size;
  c.height = vertical ? size : 4;
  const ctx = c.getContext("2d")!;
  const band = size / colors.length;
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    if (vertical) ctx.fillRect(0, i * band, 4, band);
    else ctx.fillRect(i * band, 0, band, 4);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeAsphaltTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#4a4d52";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 60 + Math.random() * 50;
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // subtle tyre tracks
  ctx.fillStyle = "rgba(20,20,24,0.18)";
  ctx.fillRect(40, 0, 36, 256);
  ctx.fillRect(180, 0, 36, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A strip of quads following the road, between given lateral offsets. */
function makeStrip(cols: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(ROWS * cols * 3);
  const uv = new Float32Array(ROWS * cols * 2);
  const idx: number[] = [];
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function fillStrip(
  geo: THREE.BufferGeometry,
  z0: number,
  lats: number[],
  lift: number,
  vScale: number,
) {
  const pos = geo.attributes.position.array as Float32Array;
  const uv = geo.attributes.uv.array as Float32Array;
  const cols = lats.length;
  for (let r = 0; r < ROWS; r++) {
    const z = z0 + r * STEP;
    const cx = roadX(z);
    const cy = roadY(z) + lift;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      pos[i * 3] = cx + lats[c];
      pos[i * 3 + 1] = cy;
      pos[i * 3 + 2] = z;
      uv[i * 2] = c / (cols - 1);
      uv[i * 2 + 1] = z / vScale;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;
  geo.computeBoundingSphere();
}

export function World() {
  return (
    <>
      <SkyDome />
      <Atmosphere />
      <RoadAndTerrain />
      <Mountains />
    </>
  );
}

/* ---------------- Sky ---------------- */
function SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color("#3d9be0") },
          horizon: { value: new THREE.Color("#bfe6f5") },
          sunDir: { value: new THREE.Vector3(-0.5, 0.42, 1).normalize() },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y * 1.6 + 0.05, 0.0, 1.0);
            vec3 col = mix(horizon, top, pow(h, 0.7));
            float sun = max(dot(normalize(vDir), sunDir), 0.0);
            col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9985, 0.9995, sun);
            col += vec3(1.0, 0.85, 0.6) * pow(sun, 24.0) * 0.22;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );

  useFrame(() => {
    const b = blendedBiome();
    mat.uniforms.top.value.set(b.skyTop);
    mat.uniforms.horizon.value.set(b.skyHorizon);
    if (ref.current) ref.current.position.copy(camera.position);
  });

  return (
    <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  );
}

/* ---------------- Fog + lights ---------------- */
function Atmosphere() {
  const { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fog = useMemo(() => new THREE.Fog("#bfe6f5", 60, 230), []);
  const target = useMemo(() => new THREE.Object3D(), []);
  const updateTransition = useBiome((s) => s.updateTransition);

  useMemo(() => {
    scene.fog = fog;
    scene.add(target);
  }, [scene, fog, target]);

  useFrame((_, dt) => {
    updateTransition(dt);
    const b = blendedBiome();
    fog.color.set(b.fogColor);
    fog.near = b.fogNear;
    fog.far = b.fogFar;
    const x = roadX(run.z) + run.lat;
    const y = roadY(run.z);
    if (sun.current) {
      sun.current.intensity = b.sunIntensity;
      sun.current.color.set(b.sunColor);
      sun.current.position.set(x + 14, y + 26, run.z - 10);
      target.position.set(x, y, run.z + 8);
      sun.current.target = target;
    }
    if (amb.current) amb.current.intensity = b.ambientIntensity;
    if (hemi.current) hemi.current.color.set(b.skyHorizon);
  });

  return (
    <>
      <hemisphereLight ref={hemi} intensity={0.55} color="#bfe6f5" groundColor="#4a5a30" />
      <ambientLight ref={amb} intensity={0.55} />
      <directionalLight
        ref={sun}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={30}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />
    </>
  );
}

/* ---------------- Road + terrain ---------------- */
function RoadAndTerrain() {
  const lastBuild = useRef(-9999);
  const lastColor = useRef("");

  const asphalt = useMemo(makeAsphaltTexture, []);
  const rumbleTex = useMemo(() => makeStripeTexture(["#e23b3b", "#ffffff"]), []);
  const dashTex = useMemo(() => {
    const t = makeStripeTexture(["#ffd23f", "#ffd23f", "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0)"]);
    return t;
  }, []);

  const roadGeo = useMemo(() => makeStrip(2), []);
  const leftRumble = useMemo(() => makeStrip(2), []);
  const rightRumble = useMemo(() => makeStrip(2), []);
  const dashGeo = useMemo(() => makeStrip(2), []);
  const terrainGeo = useMemo(() => {
    const g = makeStrip(TERRAIN_COLS.length);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(ROWS * TERRAIN_COLS.length * 3), 3));
    return g;
  }, []);

  const tmpA = useMemo(() => new THREE.Color(), []);
  const tmpB = useMemo(() => new THREE.Color(), []);

  const rebuild = (z0: number) => {
    fillStrip(roadGeo, z0, [-ROAD_W, ROAD_W], 0, 10);
    fillStrip(leftRumble, z0, [-ROAD_W - 0.35, -ROAD_W + 0.35], 0.02, 4);
    fillStrip(rightRumble, z0, [ROAD_W - 0.35, ROAD_W + 0.35], 0.02, 4);
    fillStrip(dashGeo, z0, [-0.12, 0.12], 0.015, 12);
    roadGeo.computeVertexNormals();
    leftRumble.computeVertexNormals();
    rightRumble.computeVertexNormals();
    dashGeo.computeVertexNormals();

    // terrain: valley that rises away from the road, with bumpy hills
    const b = blendedBiome();
    tmpA.set(b.terrainColor);
    tmpB.set(b.shoulderColor);
    const pos = terrainGeo.attributes.position.array as Float32Array;
    const uv = terrainGeo.attributes.uv.array as Float32Array;
    const col = terrainGeo.attributes.color.array as Float32Array;
    const cols = TERRAIN_COLS.length;
    for (let r = 0; r < ROWS; r++) {
      const z = z0 + r * STEP;
      const cx = roadX(z);
      const cy = roadY(z);
      for (let c = 0; c < cols; c++) {
        const [lat, base] = TERRAIN_COLS[c];
        const i = r * cols + c;
        const far = Math.abs(lat) > 20 ? 1 : 0;
        const bumps =
          far *
          (Math.sin(z * 0.021 + lat * 0.07) * 4 +
            Math.sin(z * 0.053 + lat * 0.13 + 1.7) * 2 +
            hash(Math.floor(z / STEP) * 13 + c) * 1.5);
        pos[i * 3] = cx + lat;
        pos[i * 3 + 1] = cy + base + bumps;
        pos[i * 3 + 2] = z;
        uv[i * 2] = lat / 8;
        uv[i * 2 + 1] = z / 8;
        const isShoulder = Math.abs(lat) < 9 ? 1 : 0;
        const shade = 0.88 + hash(Math.floor(z / STEP) * 7 + c * 3) * 0.2;
        const cc = isShoulder ? tmpB : tmpA;
        col[i * 3] = cc.r * shade;
        col[i * 3 + 1] = cc.g * shade;
        col[i * 3 + 2] = cc.b * shade;
      }
    }
    terrainGeo.attributes.position.needsUpdate = true;
    terrainGeo.attributes.uv.needsUpdate = true;
    terrainGeo.attributes.color.needsUpdate = true;
    terrainGeo.computeVertexNormals();
    terrainGeo.computeBoundingSphere();
    lastColor.current = b.terrainColor;
  };

  useFrame(() => {
    const z0 = Math.floor((run.z - BEHIND) / STEP) * STEP;
    const colorChanged = useBiome.getState().isTransitioning;
    if (Math.abs(z0 - lastBuild.current) >= REBUILD_EVERY || (colorChanged && Math.abs(z0 - lastBuild.current) >= STEP)) {
      lastBuild.current = z0;
      rebuild(z0);
    }
  });

  return (
    <group>
      <mesh geometry={terrainGeo} receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
      </mesh>
      <mesh geometry={roadGeo} receiveShadow frustumCulled={false}>
        <meshStandardMaterial map={asphalt} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh geometry={leftRumble} receiveShadow frustumCulled={false}>
        <meshStandardMaterial map={rumbleTex} roughness={0.7} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh geometry={rightRumble} receiveShadow frustumCulled={false}>
        <meshStandardMaterial map={rumbleTex} roughness={0.7} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh geometry={dashGeo} frustumCulled={false}>
        <meshStandardMaterial
          map={dashTex}
          transparent
          alphaTest={0.5}
          roughness={0.6}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </group>
  );
}

/* ---------------- Far mountains (follow the car, so they feel infinitely far) */
function Mountains() {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => [new THREE.MeshStandardMaterial({ color: "#3f7f5a", flatShading: true, roughness: 1, fog: false }),
      new THREE.MeshStandardMaterial({ color: "#f4f8ff", flatShading: true, roughness: 1, fog: false })],
    [],
  );
  const tmp = useMemo(() => new THREE.Color(), []);
  const peaks = useMemo(() => {
    const arr: { x: number; z: number; s: number; h: number; snow: boolean }[] = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      arr.push({
        x: side * (150 + hash(i * 3.1) * 90),
        z: -60 + (i / 16) * 520,
        s: 40 + hash(i * 5.7) * 40,
        h: 50 + hash(i * 9.3) * 70,
        snow: hash(i * 2.2) > 0.5,
      });
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!group.current) return;
    group.current.position.set(roadX(run.z) * 0.85, roadY(run.z) - 8, run.z);
    const b = blendedBiome();
    // atmospheric haze: mix the mountain colour toward the horizon
    mats[0].color.set(b.mountainColor).lerp(tmp.set(b.skyHorizon), 0.35);
  });

  return (
    <group ref={group}>
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh material={mats[0]} scale={[p.s, p.h, p.s]}>
            <coneGeometry args={[1, 1, 5]} />
          </mesh>
          {p.snow && (
            <mesh material={mats[1]} position={[0, p.h * 0.36, 0]} scale={[p.s * 0.29, p.h * 0.29, p.s * 0.29]}>
              <coneGeometry args={[1, 1, 5]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
