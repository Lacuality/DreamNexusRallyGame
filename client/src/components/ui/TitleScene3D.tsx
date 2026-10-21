import { asset } from "@/lib/env";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Float } from "@react-three/drei";
import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ShowcaseCar } from "../game/Car";
import { isTouchDevice } from "@/lib/input";

/** If the 3D bunny ever fails to load, just skip it instead of crashing. */
class SafeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("Title model failed to load:", err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Pull the camera back on tall/narrow (phone) screens so everything fits. */
function CameraFit() {
  const { camera, size } = useThree();
  useFrame(() => {
    const aspect = size.width / size.height;
    const z = aspect < 1 ? 8 + 5.5 / aspect : 10;
    camera.position.set(0, aspect < 1 ? 4 : 2.6, z);
    camera.lookAt(aspect < 1 ? -0.8 : -0.6, aspect < 1 ? -1.2 : 0.2, 0);
  });
  return null;
}

function PixelBunny() {
  const { size } = useThree();
  const narrow = size.width / size.height < 1;
  const { scene } = useGLTF(asset("/pixel-bunny-3d.glb"));
  const model = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
        m.castShadow = true;
      }
    });
    return s;
  }, [scene]);
  return (
    <Float speed={2} rotationIntensity={0.25} floatIntensity={0.6}>
      <primitive object={model} scale={2.3} position={narrow ? [-2.2, 1.15, 2.2] : [-3.3, 1.15, 0.8]} rotation={[0, 0.35, 0]} />
    </Float>
  );
}

function Turntable({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

function Confetti() {
  const count = 60;
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 14,
        y: Math.random() * 8,
        z: (Math.random() - 0.5) * 8 - 2,
        s: 0.4 + Math.random() * 0.8,
        r: Math.random() * 6,
      })),
    [],
  );
  const colors = useMemo(() => {
    const pal = ["#ffd23f", "#24A0CE", "#FDC6B5", "#ff5a5f", "#7bd389"];
    const arr = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      c.set(pal[i % pal.length]);
      arr.set([c.r, c.g, c.b], i * 3);
    }
    return arr;
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    if (!ref.current) return;
    data.forEach((d, i) => {
      d.y -= dt * d.s;
      d.r += dt * 2;
      if (d.y < -1) d.y = 8;
      e.set(d.r, d.r * 0.7, 0);
      q.setFromEuler(e);
      v.set(d.x + Math.sin(state.clock.elapsedTime + i) * 0.3, d.y, d.z);
      sc.set(0.12, 0.2, 0.02);
      m.compose(v, q, sc);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </boxGeometry>
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

export function TitleScene3D() {
  const touch = isTouchDevice();
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
      <Canvas
        shadows
        dpr={touch ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 2.6, 10], fov: 45 }}
        onCreated={({ camera }) => camera.lookAt(-0.6, 0.2, 0)}
      >
        <color attach="background" args={["#3d9be0"]} />
        <fog attach="fog" args={["#bfe6f5", 14, 40]} />
        <hemisphereLight intensity={0.8} color="#bfe6f5" groundColor="#4f9a3c" />
        <directionalLight position={[6, 10, 6]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

        {/* sky gradient backdrop */}
        <mesh position={[0, 8, -20]}>
          <planeGeometry args={[120, 40]} />
          <meshBasicMaterial color="#8fd0f0" fog={false} />
        </mesh>
        {/* hills */}
        {[-14, -6, 5, 13].map((x, i) => (
          <mesh key={i} position={[x, -1, -12 - (i % 2) * 4]} scale={[7 + i, 5 + (i % 3) * 2, 6]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={i % 2 ? "#3f7f5a" : "#4f9a3c"} flatShading />
          </mesh>
        ))}
        {/* ground + road piece */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
          <circleGeometry args={[30, 40]} />
          <meshStandardMaterial color="#4f9a3c" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
          <circleGeometry args={[3.6, 40]} />
          <meshStandardMaterial color="#3a3d42" />
        </mesh>

        <CameraFit />
        <Turntable>
          <ShowcaseCar position={[0, 0.02, 0]} />
        </Turntable>

        <SafeBoundary>
          <Suspense fallback={null}>
            <PixelBunny />
          </Suspense>
        </SafeBoundary>

        <Confetti />
      </Canvas>
    </div>
  );
}
