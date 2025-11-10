import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useBiome } from "@/lib/stores/useBiome";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";

interface BiomePropsSceneProps {
  carPosition: THREE.Vector3;
}

export function BiomePropsScene({ carPosition }: BiomePropsSceneProps) {
  const currentBiome = useBiome((state) => state.currentBiome);
  
  if (currentBiome === "coffee_hills") {
    return <CoffeeHillsProps carPosition={carPosition} />;
  } else if (currentBiome === "andes_highland") {
    return <AndesHighlandProps carPosition={carPosition} />;
  } else {
    return <PuebloProps carPosition={carPosition} />;
  }
}

function CoffeeHillsProps({ carPosition }: { carPosition: THREE.Vector3 }) {
  const { scene: coffeePlant } = useGLTF("/models/coffee-plant.glb");
  const { scene: farmFence } = useGLTF("/models/farm-fence.glb");
  const { scene: jeepWillys } = useGLTF("/models/jeep-willys.glb");
  
  const segment = Math.floor(carPosition.z / 50);
  
  const props = useMemo(() => {
    const items = [];
    const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1;
    
    for (let i = 0; i < 20; i++) {
      const zPos = segment * 50 + (i * 15) - 50;
      const side = i % 2 === 0 ? -1 : 1;
      const seed = segment * 100 + i;
      const pseudoRandom = Math.sin(seed) * 10000;
      const xOffset = (pseudoRandom - Math.floor(pseudoRandom)) * 2;
      const xPos = side * (roadEdge + xOffset);
      
      const propTypeSeed = Math.abs(Math.sin(seed * 1.23) * 10);
      const propType = Math.floor(propTypeSeed);
      
      const rotationSeed = Math.abs(Math.sin(seed * 2.34) * Math.PI * 2);
      const scaleSeed = 0.8 + Math.abs(Math.sin(seed * 3.45)) * 0.4;
      
      let model;
      if (propType < 6) {
        model = coffeePlant.clone(true);
        items.push({
          id: `coffee-${segment}-${i}`,
          model,
          position: [xPos, 0, zPos] as [number, number, number],
          rotation: rotationSeed,
          scale: scaleSeed,
        });
      } else if (propType < 8) {
        model = farmFence.clone(true);
        items.push({
          id: `fence-${segment}-${i}`,
          model,
          position: [xPos, 0, zPos] as [number, number, number],
          rotation: side > 0 ? Math.PI / 2 : -Math.PI / 2,
          scale: 0.6,
        });
      } else {
        model = jeepWillys.clone(true);
        items.push({
          id: `jeep-${segment}-${i}`,
          model,
          position: [xPos, 0, zPos] as [number, number, number],
          rotation: side > 0 ? Math.PI / 2 : -Math.PI / 2,
          scale: 0.4,
        });
      }
    }
    
    return items;
  }, [segment, coffeePlant, farmFence, jeepWillys]);
  
  return (
    <group>
      {props.map((prop) => (
        <group
          key={prop.id}
          position={prop.position}
          rotation={[0, prop.rotation, 0]}
          scale={prop.scale}
        >
          <primitive object={prop.model} />
        </group>
      ))}
    </group>
  );
}

function AndesHighlandProps({ carPosition }: { carPosition: THREE.Vector3 }) {
  const { scene: andesRock } = useGLTF("/models/andes-rock.glb");
  const { scene: fraijelon } = useGLTF("/models/fraijelon.glb");
  
  const segment = Math.floor(carPosition.z / 60);
  
  const props = useMemo(() => {
    const items = [];
    const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1;
    
    for (let i = 0; i < 15; i++) {
      const zPos = segment * 60 + (i * 20) - 60;
      const side = i % 2 === 0 ? -1 : 1;
      const seed = segment * 100 + i;
      const xOffset = Math.abs(Math.sin(seed * 1.11) * 3);
      const xPos = side * (roadEdge + xOffset);
      
      const propTypeSeed = Math.abs(Math.sin(seed * 2.22));
      const rotationSeed = Math.abs(Math.sin(seed * 3.33) * Math.PI * 2);
      const scaleSeed = 0.6 + Math.abs(Math.sin(seed * 4.44)) * 0.6;
      
      const model = propTypeSeed < 0.6 ? andesRock.clone(true) : fraijelon.clone(true);
      
      items.push({
        id: `andes-${segment}-${i}`,
        model,
        position: [xPos, 0, zPos] as [number, number, number],
        rotation: rotationSeed,
        scale: scaleSeed,
      });
    }
    
    return items;
  }, [segment, andesRock, fraijelon]);
  
  return (
    <group>
      {props.map((prop) => (
        <group
          key={prop.id}
          position={prop.position}
          rotation={[0, prop.rotation, 0]}
          scale={prop.scale}
        >
          <primitive object={prop.model} />
        </group>
      ))}
    </group>
  );
}

function PuebloProps({ carPosition }: { carPosition: THREE.Vector3 }) {
  const { scene: puebloHouse } = useGLTF("/models/pueblo-house.glb");
  const { scene: papelPicado } = useGLTF("/models/papel-picado.glb");
  
  const segment = Math.floor(carPosition.z / 70);
  
  const props = useMemo(() => {
    const items = [];
    const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1;
    
    for (let i = 0; i < 12; i++) {
      const zPos = segment * 70 + (i * 25) - 70;
      const side = i % 2 === 0 ? -1 : 1;
      const xPos = side * (roadEdge + 0.5);
      
      const propType = i % 3;
      
      if (propType < 2) {
        items.push({
          id: `house-${segment}-${i}`,
          model: puebloHouse.clone(true),
          position: [xPos, 0, zPos] as [number, number, number],
          rotation: side > 0 ? Math.PI / 2 : -Math.PI / 2,
          scale: 0.7,
        });
      } else {
        items.push({
          id: `papel-${segment}-${i}`,
          model: papelPicado.clone(true),
          position: [0, 3, zPos] as [number, number, number],
          rotation: 0,
          scale: 1.2,
        });
      }
    }
    
    return items;
  }, [segment, puebloHouse, papelPicado]);
  
  return (
    <group>
      {props.map((prop) => (
        <group
          key={prop.id}
          position={prop.position}
          rotation={[0, prop.rotation, 0]}
          scale={prop.scale}
        >
          <primitive object={prop.model} />
        </group>
      ))}
    </group>
  );
}
