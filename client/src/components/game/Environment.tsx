import { useMemo } from "react";
import * as THREE from "three";
import { DREAM_NEXUS_COLORS, GAME_CONFIG } from "@/lib/constants";
import { useSettings } from "@/lib/stores/useSettings";

export function Environment() {
  return (
    <>
      <Sky />
      <Lights />
      <Terrain />
      <PalmTrees />
      <Mountains />
    </>
  );
}

function Sky() {
  const weather = useSettings((state) => state.weather);
  
  const skyColor = weather === "sunny" ? DREAM_NEXUS_COLORS.navy : "#1a2633";
  const fogNear = weather === "sunny" ? 50 : 30;
  const fogFar = weather === "sunny" ? 150 : 100;
  
  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, fogNear, fogFar]} />
    </>
  );
}

function Lights() {
  const weather = useSettings((state) => state.weather);
  
  const sunIntensity = weather === "sunny" ? GAME_CONFIG.SUN_INTENSITY : 0.6;
  const ambientIntensity = weather === "sunny" ? GAME_CONFIG.AMBIENT_INTENSITY : 0.3;
  
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={sunIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.4}
      />
    </>
  );
}

function Terrain() {
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 300, 50, 100);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      const height = Math.sin(x * 0.05) * 2 + Math.cos(y * 0.03) * 1.5;
      positions.setZ(i, height - 2);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);
  
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 50]}
      receiveShadow
    >
      <primitive object={terrainGeometry} />
      <meshStandardMaterial color="#2a5a3a" roughness={0.9} />
    </mesh>
  );
}

function PalmTrees() {
  const trees = useMemo(() => {
    const treePositions = [];
    for (let i = 0; i < 30; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      treePositions.push({
        key: i,
        position: [
          side * (8 + Math.random() * 5),
          0,
          i * 10 + Math.random() * 5
        ] as [number, number, number]
      });
    }
    return treePositions;
  }, []);
  
  return (
    <group>
      {trees.map((tree) => (
        <group key={tree.key} position={tree.position}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 4, 8]} />
            <meshStandardMaterial color="#6b4423" />
          </mesh>
          
          <mesh position={[0, 4.5, 0]} castShadow>
            <coneGeometry args={[1.2, 2, 6]} />
            <meshStandardMaterial color="#2d5016" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Mountains() {
  const mountainPositions = useMemo(() => {
    return [
      { key: 0, position: [-40, -5, 50], scale: 1.5 },
      { key: 1, position: [35, -5, 60], scale: 1.2 },
      { key: 2, position: [-30, -5, 80], scale: 1.8 },
      { key: 3, position: [40, -5, 100], scale: 1.3 },
    ];
  }, []);
  
  return (
    <group>
      {mountainPositions.map((mountain) => (
        <mesh
          key={mountain.key}
          position={mountain.position as [number, number, number]}
          scale={mountain.scale}
        >
          <coneGeometry args={[15, 20, 4]} />
          <meshStandardMaterial color="#1a3a4a" />
        </mesh>
      ))}
    </group>
  );
}
