import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useBiome } from "@/lib/stores/useBiome";

interface CloudData {
  position: THREE.Vector3;
  scale: number;
  speed: number;
  offset: number;
}

export function Sky() {
  const skyRef = useRef<THREE.Mesh>(null);
  const cloudsGroupRef = useRef<THREE.Group>(null);
  const { currentBiome } = useBiome();

  const clouds = useMemo<CloudData[]>(() => {
    const cloudArray: CloudData[] = [];
    for (let i = 0; i < 20; i++) {
      cloudArray.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          20 + Math.random() * 15,
          -50 - Math.random() * 150
        ),
        scale: 3 + Math.random() * 4,
        speed: 0.3 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return cloudArray;
  }, []);

  const skyColors = useMemo(() => {
    switch (currentBiome) {
      case "coffee_hills":
        return {
          top: new THREE.Color(0x87CEEB),
          bottom: new THREE.Color(0xE8D4A0),
        };
      case "andes_highland":
        return {
          top: new THREE.Color(0x6BA3D8),
          bottom: new THREE.Color(0xB8C5D6),
        };
      case "pueblo":
        return {
          top: new THREE.Color(0xFFAA66),
          bottom: new THREE.Color(0xFFE5CC),
        };
      default:
        return {
          top: new THREE.Color(0x87CEEB),
          bottom: new THREE.Color(0xFFE5CC),
        };
    }
  }, [currentBiome]);

  const skyGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(300, 32, 32);
    const colors = [];
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 300) / 600;
      const color = new THREE.Color();
      color.lerpColors(skyColors.bottom, skyColors.top, t);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [skyColors]);

  useFrame((state) => {
    if (!cloudsGroupRef.current) return;

    cloudsGroupRef.current.children.forEach((cloud, i) => {
      const cloudData = clouds[i];
      cloud.position.z += cloudData.speed * 0.05;
      
      if (cloud.position.z > 100) {
        cloud.position.z = -200;
        cloud.position.x = (Math.random() - 0.5) * 200;
      }

      cloud.position.y += Math.sin(state.clock.elapsedTime * 0.5 + cloudData.offset) * 0.002;
    });
  });

  return (
    <group>
      <mesh ref={skyRef} scale={[-1, 1, 1]}>
        <primitive object={skyGeometry} />
        <meshBasicMaterial vertexColors side={THREE.BackSide} />
      </mesh>

      <group ref={cloudsGroupRef}>
        {clouds.map((cloud, i) => (
          <Cloud key={i} cloudData={cloud} biome={currentBiome} />
        ))}
      </group>
    </group>
  );
}

function Cloud({ cloudData, biome }: { cloudData: CloudData; biome: string }) {
  const cloudRef = useRef<THREE.Mesh>(null);

  const cloudColor = useMemo(() => {
    switch (biome) {
      case "coffee_hills":
        return new THREE.Color(0xFFFFFF);
      case "andes_highland":
        return new THREE.Color(0xE8F4F8);
      case "pueblo":
        return new THREE.Color(0xFFE8D0);
      default:
        return new THREE.Color(0xFFFFFF);
    }
  }, [biome]);

  useFrame(() => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={cloudRef} position={cloudData.position} scale={cloudData.scale}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={cloudColor}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
      <mesh position={[0.8, 0, 0]} scale={[1.2, 0.8, 0.8]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={cloudColor}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-0.8, 0, 0]} scale={[0.9, 0.9, 0.9]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={cloudColor}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </mesh>
  );
}
