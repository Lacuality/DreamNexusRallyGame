import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useBiome } from "@/lib/stores/useBiome";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";
import { useFrame } from "@react-three/fiber";

interface BiomePropsSceneProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
}

export function BiomePropsScene({ carPositionRef }: BiomePropsSceneProps) {
  const currentBiome = useBiome((s) => s.currentBiome);
  if (currentBiome === "coffee_hills") return <CoffeeHillsProps carPositionRef={carPositionRef} />;
  if (currentBiome === "andes_highland") return <AndesHighlandProps carPositionRef={carPositionRef} />;
  return <PuebloProps carPositionRef={carPositionRef} />;
}

/** ----------------- Coffee Hills ----------------- */
function CoffeeHillsProps({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const { scene: coffeePlant } = useGLTF("/models/coffee-plant.glb");
  const { scene: farmFence } = useGLTF("/models/farm-fence.glb");
  const { scene: jeepWillys } = useGLTF("/models/jeep-willys.glb");
  const groupRef = useRef<THREE.Group>(null);
  const currentSegment = useRef<number | null>(null);

  useFrame(() => {
    const segment = Math.floor(carPositionRef.current.z / 50);
    if (segment !== currentSegment.current) {
      currentSegment.current = segment;
      if (groupRef.current) {
        groupRef.current.clear();
        const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1.4;
        
        for (let i = 0; i < 24; i++) {
          const z = segment * 50 + (i * 12) - 60;
          const side = i % 2 === 0 ? -1 : 1;
          const seed = segment * 97 + i;
          const rand = (n: number) => Math.abs(Math.sin(seed * n));
          const x = side * (roadEdge + 0.5 + rand(1.3) * 2.2);

          let model: THREE.Object3D;
          let scale: number;
          let rotY: number;

          if (rand(2.1) < 0.68) {
            model = coffeePlant.clone(true);
            scale = 2.0 + rand(4.2) * 1.0;
            rotY = rand(3.1) * Math.PI * 2;
          } else if (rand(2.7) < 0.85) {
            model = farmFence.clone(true);
            scale = 1.8;
            rotY = side > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            model = jeepWillys.clone(true);
            scale = 1.2 + rand(5.3) * 0.3;
            rotY = side > 0 ? Math.PI / 2 : -Math.PI / 2;
          }

          model.position.set(x, 0, z);
          model.rotation.y = rotY;
          model.scale.setScalar(scale);
          groupRef.current.add(model);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}

/** ----------------- Andes ----------------- */
function AndesHighlandProps({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const { scene: andesRock } = useGLTF("/models/andes-rock.glb");
  const { scene: fraijelon } = useGLTF("/models/fraijelon.glb");
  const groupRef = useRef<THREE.Group>(null);
  const currentSegment = useRef<number | null>(null);

  useFrame(() => {
    const segment = Math.floor(carPositionRef.current.z / 65);
    if (segment !== currentSegment.current) {
      currentSegment.current = segment;
      if (groupRef.current) {
        groupRef.current.clear();
        const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1.6;
        
        for (let i = 0; i < 18; i++) {
          const z = segment * 65 + (i * 18) - 70;
          const side = i % 2 === 0 ? -1 : 1;
          const seed = segment * 131 + i;
          const rand = (n: number) => Math.abs(Math.sin(seed * n));
          const x = side * (roadEdge + 0.8 + rand(1.1) * 3.5);

          const model = rand(2.2) < 0.6 ? andesRock.clone(true) : fraijelon.clone(true);
          const scale = 2.5 + rand(4.4) * 1.5;
          const rotY = rand(3.3) * Math.PI * 2;

          model.position.set(x, 0, z);
          model.rotation.y = rotY;
          model.scale.setScalar(scale);
          groupRef.current.add(model);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}

/** ----------------- Pueblo ----------------- */
function PuebloProps({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const { scene: puebloHouse } = useGLTF("/models/pueblo-house.glb");
  const { scene: papelPicado } = useGLTF("/models/papel-picado.glb");
  const groupRef = useRef<THREE.Group>(null);
  const currentSegment = useRef<number | null>(null);

  useFrame(() => {
    const segment = Math.floor(carPositionRef.current.z / 70);
    if (segment !== currentSegment.current) {
      currentSegment.current = segment;
      if (groupRef.current) {
        groupRef.current.clear();
        const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1.2;
        
        for (let i = 0; i < 14; i++) {
          const z = segment * 70 + (i * 24) - 72;
          const side = i % 2 === 0 ? -1 : 1;
          const seed = segment * 149 + i;
          const rand = (n: number) => Math.abs(Math.sin(seed * n));

          let model: THREE.Object3D;
          let scale: number;
          let rotY: number;
          let x: number;

          if (i % 3 !== 2) {
            x = side * (roadEdge + 0.6 + rand(1.7) * 1.3);
            model = puebloHouse.clone(true);
            scale = 1.8 + rand(2.4) * 0.6;
            rotY = side > 0 ? Math.PI / 2 : -Math.PI / 2;
            model.position.set(x, 0, z);
          } else {
            model = papelPicado.clone(true);
            scale = 2.8 + rand(3.8) * 0.5;
            rotY = 0;
            model.position.set(0, 3.2 + rand(1.2) * 0.6, z);
          }

          model.rotation.y = rotY;
          model.scale.setScalar(scale);
          groupRef.current.add(model);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}
