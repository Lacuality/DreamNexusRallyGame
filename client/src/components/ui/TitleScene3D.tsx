import { Canvas } from "@react-three/fiber";
import { useGLTF, PerspectiveCamera, Environment as DreiEnvironment, Float, Html } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

function LoadingFallback() {
  return (
    <Html center>
      <div style={{ color: "#24A0CE", fontFamily: "monospace", fontSize: "18px" }}>
        Loading 3D Scene...
      </div>
    </Html>
  );
}

function PixelBunny() {
  const { scene } = useGLTF("/pixel-bunny-3d.glb");
  const bunnyRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (bunnyRef.current) {
      bunnyRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      bunnyRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <primitive ref={bunnyRef} object={scene.clone()} scale={1.5} position={[0, 0, 0]} />
    </Float>
  );
}

function RallyCar() {
  const { scene } = useGLTF("/models/rally-car.glb");
  const carRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (carRef.current) {
      carRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6 + 1) * 0.03;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.2}>
      <primitive ref={carRef} object={scene.clone()} scale={0.8} position={[2, -0.3, 0.5]} rotation={[0, -0.5, 0]} />
    </Float>
  );
}

function CoffeeParticles({ isMobile }: { isMobile: boolean }) {
  const count = isMobile ? 15 : 30;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const matrix = new THREE.Matrix4();
        const y = positions[i3 + 1] + state.clock.elapsedTime * 0.1;
        const wrappedY = ((y + 3) % 6) - 3;
        
        matrix.setPosition(
          positions[i3] + Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.2,
          wrappedY,
          positions[i3 + 2]
        );
        matrix.scale(new THREE.Vector3(0.05, 0.05, 0.05));
        meshRef.current.setMatrixAt(i, matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
    </instancedMesh>
  );
}

function AutoRotateCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame((state) => {
    if (cameraRef.current) {
      const radius = 6;
      const x = Math.sin(state.clock.elapsedTime * 0.15) * radius;
      const z = Math.cos(state.clock.elapsedTime * 0.15) * radius;
      cameraRef.current.position.set(x, 2, z);
      cameraRef.current.lookAt(0, 0.5, 0);
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[5, 2, 5]} fov={50} />;
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight position={[5, 8, 5]} intensity={1.2} angle={0.4} penumbra={0.5} castShadow color="#24A0CE" />
      <spotLight position={[-5, 5, -5]} intensity={0.8} angle={0.3} penumbra={0.6} color="#FDC6B5" />
      <pointLight position={[0, 1, 2]} intensity={0.5} color="#24A0CE" />
    </>
  );
}

export function TitleScene3D() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
      <Canvas 
        shadows 
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <AutoRotateCamera />
          <SceneLighting />
          
          <PixelBunny />
          <RallyCar />
          <CoffeeParticles isMobile={isMobile} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0E1B24" roughness={0.8} />
          </mesh>

          <DreiEnvironment preset="sunset" />
          <fog attach="fog" args={["#0E1B24", 5, 15]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
