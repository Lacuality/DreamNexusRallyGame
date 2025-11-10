import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

function CarModel() {
  const { scene } = useGLTF("/models/rally-car.glb");
  
  const carModel = useMemo(() => {
    const clonedScene = scene.clone();
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedScene;
  }, [scene]);
  
  return (
    <group scale={2.5} position={[0, -1, 0]}>
      <primitive object={carModel} />
    </group>
  );
}

interface CarModelViewerProps {
  width?: string;
  height?: string;
}

export function CarModelViewer({ width = "300px", height = "200px" }: CarModelViewerProps) {
  return (
    <div style={{ width, height, borderRadius: "10px", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [4, 2, 4], fov: 50 }}
        shadows
      >
        <color attach="background" args={["#0E1B24"]} />
        
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
        />
        <directionalLight
          position={[-5, 3, -5]}
          intensity={0.3}
        />
        
        <CarModel />
        
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
