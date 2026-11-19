import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { roadX, roadY, toWorld, roadCurvature, currentLoop, ROAD_HALF, roadHalf, hash, isCircuit } from "@/lib/track";
import { blendedBiome, useBiome } from "@/lib/stores/useBiome";
import { run } from "@/lib/game/run";
import { toonMat } from "@/lib/game/toon";

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

const ROAD_W = ROAD_HALF + 0.3; // endless road (circuits read roadHalf() at mount)

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

function makeGravelTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e3c88f";
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 160; i++) {
    const v = 190 + Math.floor(Math.random() * 50);
    g.fillStyle = `rgb(${v},${v - 14},${v - 40})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeAsphaltTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#676b7c";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const v = 92 + Math.random() * 26;
    ctx.fillStyle = `rgb(${v},${v + 4},${v + 20})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // subtle tyre tracks
  ctx.fillStyle = "rgba(30,30,50,0.12)";
  ctx.fillRect(40, 0, 36, 256);
  ctx.fillRect(180, 0, 36, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A strip of quads following the road, between given lateral offsets. */
function makeStrip(cols: number, rows: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  const idx: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
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

const tmpP = { x: 0, y: 0, z: 0 };

/** Vertical strip (a barrier) `lat` metres from the centre, from height h0 to h1. */
function fillWall(geo: THREE.BufferGeometry, z0: number, lat: number, h0: number, h1: number, vScale: number, rows: number) {
  const pos = geo.attributes.position.array as Float32Array;
  const uv = geo.attributes.uv.array as Float32Array;
  for (let r = 0; r < rows; r++) {
    const z = z0 + r * STEP;
    toWorld(z, lat, 0, tmpP);
    const i = r * 2;
    pos[i * 3] = tmpP.x;
    pos[i * 3 + 1] = tmpP.y + h0;
    pos[i * 3 + 2] = tmpP.z;
    pos[i * 3 + 3] = tmpP.x;
    pos[i * 3 + 4] = tmpP.y + h1;
    pos[i * 3 + 5] = tmpP.z;
    uv[i * 2] = 0;
    uv[i * 2 + 1] = z / vScale;
    uv[i * 2 + 2] = 1;
    uv[i * 2 + 3] = z / vScale;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

function fillStrip(geo: THREE.BufferGeometry, z0: number, lats: number[], lift: number, vScale: number, rows: number) {
  const pos = geo.attributes.position.array as Float32Array;
  const uv = geo.attributes.uv.array as Float32Array;
  const cols = lats.length;
  for (let r = 0; r < rows; r++) {
    const z = z0 + r * STEP;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      toWorld(z, lats[c], lift, tmpP);
      pos[i * 3] = tmpP.x;
      pos[i * 3 + 1] = tmpP.y;
      pos[i * 3 + 2] = tmpP.z;
      uv[i * 2] = c / (cols - 1);
      uv[i * 2 + 1] = z / vScale;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;
  geo.computeVertexNormals();
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
          cloud: { value: new THREE.Color("#ffffff") },
          cloudShade: { value: new THREE.Color("#c9dcf0") },
          night: { value: 0 },
          time: { value: 0 },
          sunDir: { value: new THREE.Vector3(-0.5, 0.42, 1).normalize() },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 cloud; uniform vec3 cloudShade; uniform vec3 sunDir;
          uniform float night; uniform float time;
          varying vec3 vDir;
          float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
          }
          float fbm(vec2 p) { return noise(p) * 0.55 + noise(p * 2.1 + 7.3) * 0.3 + noise(p * 4.3 + 1.9) * 0.15; }
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y * 1.6 + 0.05, 0.0, 1.0);
            // painted sky: three flat-ish bands that melt into each other
            vec3 mid = mix(horizon, top, 0.55);
            vec3 col = mix(horizon, mid, smoothstep(0.0, 0.28, h));
            col = mix(col, top, smoothstep(0.3, 0.85, h));
            // sun: a hard cartoon disc with a soft halo
            float sun = max(dot(d, sunDir), 0.0);
            col += vec3(1.0, 0.88, 0.62) * pow(sun, 10.0) * 0.28 * (1.0 - night);
            col = mix(col, vec3(1.0, 0.97, 0.82), smoothstep(0.9965, 0.9975, sun) * (1.0 - night * 0.2));
            // stars at night
            vec2 sp = d.xz / (abs(d.y) + 0.35) * 42.0;
            float star = step(0.992, hash2(floor(sp))) * step(0.05, d.y);
            col += vec3(1.0, 0.95, 0.85) * star * night * (0.6 + 0.4 * sin(time * 2.0 + hash2(floor(sp)) * 40.0));
            // clouds: puffy cut-outs with a flat shaded underside
            if (d.y > 0.015) {
              vec2 cp = d.xz / (d.y + 0.22) * 1.25 + vec2(time * 0.012, time * 0.004);
              float n = fbm(cp);
              float body = smoothstep(0.56, 0.585, n);
              float lit = smoothstep(0.6, 0.62, fbm(cp + vec2(0.06, 0.05)));
              vec3 cc = mix(cloudShade, cloud, lit);
              float fade = smoothstep(0.015, 0.14, d.y);
              col = mix(col, cc, body * fade * mix(0.95, 0.55, night));
            }
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const b = blendedBiome();
    const u = mat.uniforms;
    u.top.value.set(b.skyTop);
    u.horizon.value.set(b.skyHorizon);
    u.time.value = state.clock.elapsedTime;
    const hsl = { h: 0, s: 0, l: 0 };
    u.top.value.getHSL(hsl);
    const night = THREE.MathUtils.clamp((0.22 - hsl.l) / 0.12, 0, 1);
    u.night.value = night;
    // clouds borrow the horizon's tint, so a sunset has peach clouds and the night has violet ones
    u.cloud.value.set("#ffffff").lerp(u.horizon.value, 0.18 + night * 0.5);
    u.cloudShade.value.copy(u.horizon.value).lerp(tmpC.set(b.skyTop), 0.35).lerp(tmpC.set("#ffffff"), 0.25 * (1 - night));
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
    // circuits: clearer air, so you can see the rest of the track (and the cars on it) across the infield
    const clear = isCircuit() ? 1.6 : 1;
    fog.near = b.fogNear * (clear > 1 ? 1.4 : 1);
    fog.far = b.fogFar * clear;
    toWorld(run.z, run.lat, 0, tmpP);
    const x = tmpP.x, y = tmpP.y, zz = tmpP.z;
    if (sun.current) {
      sun.current.intensity = b.sunIntensity * 1.35;
      sun.current.color.set(b.sunColor);
      sun.current.position.set(x + 14, y + 26, zz - 10);
      target.position.set(x, y, zz + 8);
      sun.current.target = target;
    }
    if (amb.current) amb.current.intensity = b.ambientIntensity * 1.25;
    if (hemi.current) hemi.current.color.set(b.skyHorizon);
  });

  return (
    <>
      <hemisphereLight ref={hemi} intensity={0.7} color="#bfe6f5" groundColor="#4a5a30" />
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
// circuit terrain: a narrow shoulder strip; the big flat ground plane is underneath
const circuitCols = (rw: number): [number, number][] => [
  [-40, 0],
  [-26, 0.5],
  [-rw - 4, -0.05],
  [rw + 4, -0.05],
  [26, 0.5],
  [40, 0],
];

function RoadAndTerrain() {
  const lastBuild = useRef(-9999);
  const circuit = isCircuit();
  const loop = currentLoop();
  const RW = roadHalf() + 0.3; // half road width (+ kerb) for this track
  const L = loop ? loop.length : 0;
  const rows = circuit ? Math.ceil(L / STEP) + 1 : ROWS;
  const groundY = loop ? loop.minY - 0.45 : 0;

  const asphalt = useMemo(makeAsphaltTexture, []);
  const rumbleTex = useMemo(() => makeStripeTexture(["#e23b3b", "#ffffff"]), []);
  const dashTex = useMemo(() => makeStripeTexture(["#ffd23f", "#ffd23f", "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0)"]), []);
  const gravelTex = useMemo(makeGravelTexture, []);

  const roadGeo = useMemo(() => makeStrip(2, rows), [rows]);
  const leftRumble = useMemo(() => makeStrip(2, rows), [rows]);
  const rightRumble = useMemo(() => makeStrip(2, rows), [rows]);
  const dashGeo = useMemo(() => makeStrip(2, rows), [rows]);
  const leftGravel = useMemo(() => makeStrip(2, rows), [rows]);
  const leftRail = useMemo(() => makeStrip(2, rows), [rows]);
  const rightRail = useMemo(() => makeStrip(2, rows), [rows]);
  const railTex = useMemo(() => makeStripeTexture(["#ffffff", "#ffffff", "#e23b3b", "#e23b3b"]), []);
  const rightGravel = useMemo(() => makeStrip(2, rows), [rows]);
  const cols = useMemo(() => (circuit ? circuitCols(RW) : TERRAIN_COLS), [circuit, RW]);
  const terrainGeo = useMemo(() => {
    const g = makeStrip(cols.length, rows);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(rows * cols.length * 3), 3));
    return g;
  }, [cols, rows]);
  const groundMat = useMemo(() => toonMat({ color: "#5a8f3a" }), []);
  const mats = useMemo(
    () => ({
      terrain: toonMat({ vertexColors: true }),
      road: toonMat({ map: asphalt }),
      gravel: toonMat({ map: gravelTex }),
      rail: toonMat({ map: railTex, side: THREE.DoubleSide }),
      rumble: toonMat({ map: rumbleTex, polygonOffset: true, polygonOffsetFactor: -1 }),
      dash: toonMat({ map: dashTex, transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }),
    }),
    [asphalt, gravelTex, railTex, rumbleTex, dashTex],
  );

  const tmpA = useMemo(() => new THREE.Color(), []);
  const tmpB = useMemo(() => new THREE.Color(), []);

  const rebuild = (z0: number) => {
    fillStrip(roadGeo, z0, [-RW, RW], 0, 10, rows);
    fillStrip(leftRumble, z0, [-RW - 0.35, -RW + 0.35], 0.02, 4, rows);
    fillStrip(rightRumble, z0, [RW - 0.35, RW + 0.35], 0.02, 4, rows);
    fillStrip(dashGeo, z0, [-0.12, 0.12], 0.015, 12, rows);
    if (circuit) {
      // gravel traps: leave the track and you bog down
      fillStrip(leftGravel, z0, [-RW - 3.6, -RW - 0.3], 0.01, 6, rows);
      fillStrip(rightGravel, z0, [RW + 0.3, RW + 3.6], 0.01, 6, rows);
      // guard rails: the edge of the track you can't drive through
      fillWall(leftRail, z0, -RW - 3.75, 0, 0.75, 6, rows);
      fillWall(rightRail, z0, RW + 3.75, 0, 0.75, 6, rows);
    }

    // terrain: valley that rises away from the road, with bumpy hills
    const b = blendedBiome();
    tmpA.set(b.terrainColor);
    tmpB.set(b.shoulderColor);
    groundMat.color.set(b.terrainColor);
    const pos = terrainGeo.attributes.position.array as Float32Array;
    const uv = terrainGeo.attributes.uv.array as Float32Array;
    const col = terrainGeo.attributes.color.array as Float32Array;
    const nCols = cols.length;
    for (let r = 0; r < rows; r++) {
      const z = z0 + r * STEP;
      const k = circuit ? roadCurvature(z) : 0;
      for (let c = 0; c < nCols; c++) {
        let [lat, base] = cols[c];
        // inside a tight bend the strip would fold over itself: pull it in
        if (circuit && lat * k > 0.8) lat = 0.8 / k;
        const i = r * nCols + c;
        const far = Math.abs(lat) > 20 ? 1 : 0;
        const bumps = circuit
          ? 0
          : far * (Math.sin(z * 0.021 + lat * 0.07) * 4 + Math.sin(z * 0.053 + lat * 0.13 + 1.7) * 2 + hash(Math.floor(z / STEP) * 13 + c) * 1.5);
        toWorld(z, lat, base + bumps, tmpP);
        pos[i * 3] = tmpP.x;
        pos[i * 3 + 1] = circuit && Math.abs(cols[c][0]) >= 40 ? groundY : tmpP.y;
        pos[i * 3 + 2] = tmpP.z;
        uv[i * 2] = lat / 8;
        uv[i * 2 + 1] = z / 8;
        const isShoulder = Math.abs(lat) < 9 ? 1 : 0;
        const shade = isShoulder ? 1 : Math.floor(z / 12) % 2 === 0 ? 1.06 : 0.9;
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
  };

  useFrame(() => {
    const colorChanged = useBiome.getState().isTransitioning;
    if (circuit) {
      // the whole lap is built once (and again while the colours settle)
      if (lastBuild.current === -9999 || colorChanged) {
        lastBuild.current = 0;
        rebuild(0);
      }
      return;
    }
    const z0 = Math.floor((run.z - BEHIND) / STEP) * STEP;
    if (Math.abs(z0 - lastBuild.current) >= REBUILD_EVERY || (colorChanged && Math.abs(z0 - lastBuild.current) >= STEP)) {
      lastBuild.current = z0;
      rebuild(z0);
    }
  });

  return (
    <group>
      {circuit && loop && (
        <mesh
          material={groundMat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(loop.minX + loop.maxX) / 2, groundY - 0.02, (loop.minZ + loop.maxZ) / 2]}
          receiveShadow
        >
          <planeGeometry args={[3000, 3000, 1, 1]} />
        </mesh>
      )}
      <mesh geometry={terrainGeo} material={mats.terrain} receiveShadow frustumCulled={false} />
      <mesh geometry={roadGeo} material={mats.road} receiveShadow frustumCulled={false} />
      {circuit && (
        <>
          <mesh geometry={leftGravel} material={mats.gravel} receiveShadow frustumCulled={false} />
          <mesh geometry={rightGravel} material={mats.gravel} receiveShadow frustumCulled={false} />
        </>
      )}
      {circuit && (
        <>
          <mesh geometry={leftRail} material={mats.rail} castShadow frustumCulled={false} />
          <mesh geometry={rightRail} material={mats.rail} castShadow frustumCulled={false} />
        </>
      )}
      <mesh geometry={leftRumble} material={mats.rumble} receiveShadow frustumCulled={false} />
      <mesh geometry={rightRumble} material={mats.rumble} receiveShadow frustumCulled={false} />
      <mesh geometry={dashGeo} material={mats.dash} frustumCulled={false} />
    </group>
  );
}

/* ---------------- Far mountains ---------------- */
// Endless road: they follow the car so they feel infinitely far.
// Circuits: a fixed ring of peaks around the whole track.
function Mountains() {
  const group = useRef<THREE.Group>(null);
  const loop = currentLoop();
  const mats = useMemo(
    () => [
      toonMat({ color: "#3f7f5a", fog: false }),
      toonMat({ color: "#f4f8ff", fog: false }),
    ],
    [],
  );
  const tmp = useMemo(() => new THREE.Color(), []);
  const peaks = useMemo(() => {
    const arr: { x: number; z: number; s: number; h: number; snow: boolean }[] = [];
    if (loop) {
      const R = Math.max(loop.maxX - loop.minX, loop.maxZ - loop.minZ) / 2 + 240;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const r = R + hash(i * 3.1) * 120;
        arr.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 60 + hash(i * 5.7) * 50, h: 60 + hash(i * 9.3) * 80, snow: hash(i * 2.2) > 0.5 });
      }
      return arr;
    }
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
  }, [loop]);

  useFrame(() => {
    if (!group.current) return;
    if (loop) group.current.position.set((loop.minX + loop.maxX) / 2, loop.minY - 8, (loop.minZ + loop.maxZ) / 2);
    else group.current.position.set(roadX(run.z) * 0.85, roadY(run.z) - 8, run.z);
    const b = blendedBiome();
    // atmospheric haze: mix the mountain colour toward the horizon
    mats[0].color.set(b.mountainColor).lerp(tmp.set(b.skyHorizon), 0.22);
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
