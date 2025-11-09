import { useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";

interface Obstacle {
  id: number;
  type: "cone" | "rock" | "puddle";
  position: THREE.Vector3;
}

interface ObstaclesProps {
  carPosition: THREE.Vector3;
  carSpeed: number;
  onCollision: (obstacle: Obstacle) => void;
}

export function Obstacles({ carPosition, carSpeed, onCollision }: ObstaclesProps) {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [nextObstacleId, setNextObstacleId] = useState(0);
  const [lastSpawnZ, setLastSpawnZ] = useState(0);
  const [startTime] = useState(Date.now());
  
  useFrame(() => {
    const elapsedTime = Date.now() - startTime;
    const difficultyLevel = Math.floor(elapsedTime / GAME_CONFIG.DIFFICULTY_RAMP_INTERVAL);
    const spawnChance = GAME_CONFIG.OBSTACLE_DENSITY_BASE + 
      (difficultyLevel * GAME_CONFIG.OBSTACLE_DENSITY_INCREASE);
    
    let newObstacles = [...obstacles];
    let updatedLastSpawnZ = lastSpawnZ;
    let updatedNextId = nextObstacleId;
    
    if (carPosition.z > lastSpawnZ + 10) {
      if (Math.random() < spawnChance) {
        const laneOffset = (Math.random() - 0.5) * (GAME_CONFIG.LANE_WIDTH - 2);
        const obstacleTypes: Array<"cone" | "rock" | "puddle"> = ["cone", "rock", "puddle"];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        newObstacles.push({
          id: updatedNextId,
          type,
          position: new THREE.Vector3(laneOffset, 0, carPosition.z + 50)
        });
        
        updatedNextId++;
      }
      updatedLastSpawnZ = carPosition.z;
    }
    
    newObstacles = newObstacles.filter((obstacle) => {
      const distanceToCar = carPosition.distanceTo(obstacle.position);
      
      if (distanceToCar < GAME_CONFIG.HIT_RADIUS) {
        onCollision(obstacle);
        return false;
      }
      
      return obstacle.position.z > carPosition.z - 20;
    });
    
    if (newObstacles.length !== obstacles.length || updatedLastSpawnZ !== lastSpawnZ) {
      setObstacles(newObstacles);
      setLastSpawnZ(updatedLastSpawnZ);
      setNextObstacleId(updatedNextId);
    }
  });
  
  return (
    <group>
      {obstacles.map((obstacle) => (
        <ObstacleModel key={obstacle.id} obstacle={obstacle} />
      ))}
    </group>
  );
}

function ObstacleModel({ obstacle }: { obstacle: Obstacle }) {
  const position: [number, number, number] = [
    obstacle.position.x,
    obstacle.position.y,
    obstacle.position.z
  ];
  
  if (obstacle.type === "cone") {
    return (
      <mesh position={position} castShadow>
        <coneGeometry args={[0.3, 0.8, 8]} />
        <meshStandardMaterial color="#ff6b00" />
      </mesh>
    );
  }
  
  if (obstacle.type === "rock") {
    return (
      <mesh position={position} castShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#666666" roughness={0.9} />
      </mesh>
    );
  }
  
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.8, 16]} />
      <meshStandardMaterial color="#1a4a6a" transparent opacity={0.6} />
    </mesh>
  );
}
