import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useBiome } from "@/lib/stores/useBiome";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";

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
  const segment = Math.floor(carPositionRef.current.z / 50);
  const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1.4;

  const data = useMemo(() => {
    const items: { m: THREE.Object3D; pos: [number, number, number]; rotY: number; s: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const z = segment * 50 + (i * 12) - 60;
      const side = i % 2 === 0 ? -1 : 1;
      const seed = segment * 97 + i;
      const rand = (n: number) => Math.abs(Math.sin(seed * n));
      const x = side * (roadEdge + 0.5 + rand(1.3) * 2.2);

      if (rand(2.1) < 0.68) {
        items.push({ m: coffeePlant, pos: [x, 0, z], rotY: rand(3.1) * Math.PI * 2, s: 0.75 + rand(4.2) * 0.5 });
      } else if (rand(2.7) < 0.85) {
        items.push({ m: farmFence, pos: [x, 0, z], rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 0.66 });
      } else {
        items.push({ m: jeepWillys, pos: [x, 0, z], rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 0.42 + rand(5.3) * 0.1 });
      }
    }
    return items;
  }, [segment, coffeePlant, farmFence, jeepWillys, roadEdge]);

  return <GenericProps items={data} />;
}

/** ----------------- Andes ----------------- */
function AndesHighlandProps({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const { scene: andesRock } = useGLTF("/models/andes-rock.glb");
  const { scene: fraijelon } = useGLTF("/models/fraijelon.glb");
  const segment = Math.floor(carPositionRef.current.z / 65);
  const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1.6;

  const data = useMemo(() => {
    const items: { m: THREE.Object3D; pos: [number, number, number]; rotY: number; s: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const z = segment * 65 + (i * 18) - 70;
      const side = i % 2 === 0 ? -1 : 1;
      const seed = segment * 131 + i;
      const rand = (n: number) => Math.abs(Math.sin(seed * n));
      const x = side * (roadEdge + 0.8 + rand(1.1) * 3.5);

      const model = rand(2.2) < 0.6 ? andesRock : fraijelon;
      items.push({ m: model, pos: [x, 0, z], rotY: rand(3.3) * Math.PI * 2, s: 0.65 + rand(4.4) * 0.6 });
    }
    return items;
  }, [segment, andesRock, fraijelon, roadEdge]);

  return <GenericProps items={data} />;
}

/** ----------------- Pueblo ----------------- */
function PuebloProps({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const { scene: puebloHouse } = useGLTF("/models/pueblo-house.glb");
  const { scene: papelPicado } = useGLTF("/models/papel-picado.glb");
  const segment = Math.floor(carPositionRef.current.z / 70);
  const roadEdge = GAME_CONFIG.LANE_WIDTH / 2 + 1.2;

  const data = useMemo(() => {
    const items: { m: THREE.Object3D; pos: [number, number, number]; rotY: number; s: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const z = segment * 70 + (i * 24) - 72;
      const side = i % 2 === 0 ? -1 : 1;
      const seed = segment * 149 + i;
      const rand = (n: number) => Math.abs(Math.sin(seed * n));

      if (i % 3 !== 2) {
        const x = side * (roadEdge + 0.6 + rand(1.7) * 1.3);
        items.push({ m: puebloHouse, pos: [x, 0, z], rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 0.68 + rand(2.4) * 0.25 });
      } else {
        items.push({ m: papelPicado, pos: [0, 3.2 + rand(1.2) * 0.6, z], rotY: 0, s: 1.1 + rand(3.8) * 0.2 });
      }
    }
    return items;
  }, [segment, puebloHouse, papelPicado, roadEdge]);

  return <GenericProps items={data} />;
}

/** ---------- Generic renderer (fast) */
function GenericProps({
  items,
}: {
  items: { m: THREE.Object3D; pos: [number, number, number]; rotY: number; s: number }[];
}) {
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={[0, it.rotY, 0]} scale={it.s}>
          <primitive object={it.m.clone(true)} />
        </group>
      ))}
    </group>
  );
}
