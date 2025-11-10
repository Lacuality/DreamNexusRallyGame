import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";
import { useSettings } from "@/lib/stores/useSettings";
import { CollectibleSparkles } from "./ParticleEffects";

export type CollectibleType = "arequipe" | "nitro" | "shield";

interface Collectible {
  id: number;
  type: CollectibleType;
  position: THREE.Vector3;
  rotation: number;
}

interface CollectiblesProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
  onCollect: (collectible: Collectible) => void;
}

export function Collectibles({ carPositionRef, onCollect }: CollectiblesProps) {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [nextCollectibleId, setNextCollectibleId] = useState(0);
  const [lastSpawnZ, setLastSpawnZ] = useState(0);
  const showPhotoMode = useSettings((state) => state.showPhotoMode);
  
  useFrame((state, delta) => {
    if (showPhotoMode) return;
    let newCollectibles = [...collectibles];
    let updatedLastSpawnZ = lastSpawnZ;
    let updatedNextId = nextCollectibleId;
    
    if (carPositionRef.current.z > lastSpawnZ + 20) {
      if (Math.random() < 0.3) {
        const laneOffset = (Math.random() - 0.5) * (GAME_CONFIG.LANE_WIDTH - 3);
        
        const rand = Math.random();
        let type: CollectibleType = "arequipe";
        if (rand < 0.7) {
          type = "arequipe";
        } else if (rand < 0.85) {
          type = "nitro";
        } else {
          type = "shield";
        }
        
        newCollectibles.push({
          id: updatedNextId,
          type,
          position: new THREE.Vector3(laneOffset, 0.5, carPositionRef.current.z + 60),
          rotation: Math.random() * Math.PI * 2
        });
        
        updatedNextId++;
      }
      updatedLastSpawnZ = carPositionRef.current.z;
    }
    
    newCollectibles = newCollectibles.filter((collectible) => {
      const distanceToCar = new THREE.Vector2(
        carPositionRef.current.x - collectible.position.x,
        carPositionRef.current.z - collectible.position.z
      ).length();
      
      if (distanceToCar < 1.2) {
        onCollect(collectible);
        return false;
      }
      
      return collectible.position.z > carPositionRef.current.z - 20;
    });
    
    newCollectibles.forEach((collectible) => {
      collectible.rotation += delta * 2;
    });
    
    if (newCollectibles.length !== collectibles.length || updatedLastSpawnZ !== lastSpawnZ) {
      setCollectibles(newCollectibles);
      setLastSpawnZ(updatedLastSpawnZ);
      setNextCollectibleId(updatedNextId);
    }
  });
  
  return (
    <group>
      {collectibles.map((collectible) => (
        <group key={collectible.id}>
          <CollectibleModel collectible={collectible} />
          <CollectibleSparkles position={collectible.position} />
        </group>
      ))}
    </group>
  );
}

function CollectibleModel({ collectible }: { collectible: Collectible }) {
  if (collectible.type === "arequipe") {
    return <ArequipeJar collectible={collectible} />;
  } else if (collectible.type === "nitro") {
    return <NitroPowerUp collectible={collectible} />;
  } else {
    return <ShieldPowerUp collectible={collectible} />;
  }
}

function ArequipeJar({ collectible }: { collectible: Collectible }) {
  const position: [number, number, number] = [
    collectible.position.x,
    collectible.position.y,
    collectible.position.z
  ];
  
  return (
    <group position={position} rotation={[0, collectible.rotation, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.4, 16]} />
        <meshStandardMaterial 
          color="#D4A574"
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.1, 16]} />
        <meshStandardMaterial 
          color="#8B4513"
          roughness={0.5}
        />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color="#FDC6B5"
          transparent
          opacity={0.3}
          emissive="#FDC6B5"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function NitroPowerUp({ collectible }: { collectible: Collectible }) {
  const position: [number, number, number] = [
    collectible.position.x,
    collectible.position.y,
    collectible.position.z
  ];
  
  return (
    <group position={position} rotation={[0, collectible.rotation, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.6, 8]} />
        <meshStandardMaterial 
          color="#ff3333"
          emissive="#ff0000"
          emissiveIntensity={0.5}
          metalness={0.6}
        />
      </mesh>
      
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.22, 0.2, 8]} />
        <meshStandardMaterial 
          color="#ffaa00"
          emissive="#ff5500"
          emissiveIntensity={0.7}
        />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial 
          color="#ff6633"
          transparent
          opacity={0.2}
          emissive="#ff3300"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

function ShieldPowerUp({ collectible }: { collectible: Collectible }) {
  const position: [number, number, number] = [
    collectible.position.x,
    collectible.position.y,
    collectible.position.z
  ];
  
  return (
    <group position={position} rotation={[0, collectible.rotation, 0]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial 
          color="#24A0CE"
          emissive="#24A0CE"
          emissiveIntensity={0.6}
          metalness={0.8}
        />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial 
          color="#24A0CE"
          transparent
          opacity={0.25}
          emissive="#24A0CE"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}
