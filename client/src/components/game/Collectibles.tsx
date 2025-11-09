import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";
import { useSettings } from "@/lib/stores/useSettings";

interface Collectible {
  id: number;
  position: THREE.Vector3;
  rotation: number;
}

interface CollectiblesProps {
  carPosition: THREE.Vector3;
  onCollect: (collectible: Collectible) => void;
}

export function Collectibles({ carPosition, onCollect }: CollectiblesProps) {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [nextCollectibleId, setNextCollectibleId] = useState(0);
  const [lastSpawnZ, setLastSpawnZ] = useState(0);
  const showPhotoMode = useSettings((state) => state.showPhotoMode);
  
  useFrame((state, delta) => {
    if (showPhotoMode) return;
    let newCollectibles = [...collectibles];
    let updatedLastSpawnZ = lastSpawnZ;
    let updatedNextId = nextCollectibleId;
    
    if (carPosition.z > lastSpawnZ + 20) {
      if (Math.random() < 0.3) {
        const laneOffset = (Math.random() - 0.5) * (GAME_CONFIG.LANE_WIDTH - 3);
        
        newCollectibles.push({
          id: updatedNextId,
          position: new THREE.Vector3(laneOffset, 0.5, carPosition.z + 60),
          rotation: Math.random() * Math.PI * 2
        });
        
        updatedNextId++;
      }
      updatedLastSpawnZ = carPosition.z;
    }
    
    newCollectibles = newCollectibles.filter((collectible) => {
      const distanceToCar = new THREE.Vector2(
        carPosition.x - collectible.position.x,
        carPosition.z - collectible.position.z
      ).length();
      
      if (distanceToCar < 1.2) {
        onCollect(collectible);
        return false;
      }
      
      return collectible.position.z > carPosition.z - 20;
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
        <ArequipeJar key={collectible.id} collectible={collectible} />
      ))}
    </group>
  );
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
