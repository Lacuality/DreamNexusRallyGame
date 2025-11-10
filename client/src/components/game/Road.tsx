import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GAME_CONFIG, DREAM_NEXUS_COLORS } from "@/lib/constants";

interface RoadProps {
  carPosition: THREE.Vector3;
}

export function Road({ carPosition }: RoadProps) {
  const roadRef = useRef<THREE.Mesh>(null);
  const asphaltTexture = useTexture("/textures/asphalt.png");
  
  useMemo(() => {
    asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.repeat.set(4, 100);
  }, [asphaltTexture]);
  
  const roadGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      GAME_CONFIG.LANE_WIDTH + 2,
      200,
      20,
      200
    );
    
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      const curveAmount = Math.sin(y * 0.02) * 2;
      const elevation = Math.sin(y * 0.03) * 0.5 + Math.cos(y * 0.05) * 0.3;
      
      positions.setX(i, x + curveAmount);
      positions.setZ(i, elevation);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  
  useFrame(() => {
    if (roadRef.current) {
      roadRef.current.position.z = carPosition.z - 50;
    }
  });
  
  return (
    <group>
      <mesh
        ref={roadRef}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <primitive object={roadGeometry} />
        <meshStandardMaterial
          map={asphaltTexture}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      <RoadEdges carPosition={carPosition} />
      <CenterLine carPosition={carPosition} />
    </group>
  );
}

function RoadEdges({ carPosition }: { carPosition: THREE.Vector3 }) {
  const leftEdgeRef = useRef<THREE.Mesh>(null);
  const rightEdgeRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (leftEdgeRef.current) {
      leftEdgeRef.current.position.z = carPosition.z - 50;
    }
    if (rightEdgeRef.current) {
      rightEdgeRef.current.position.z = carPosition.z - 50;
    }
  });
  
  const edgeGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.3, 0.15, 200);
  }, []);
  
  return (
    <>
      <mesh
        ref={leftEdgeRef}
        position={[-GAME_CONFIG.LANE_WIDTH / 2, 0.1, 0]}
        geometry={edgeGeometry}
      >
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.2} />
      </mesh>
      <mesh
        ref={rightEdgeRef}
        position={[GAME_CONFIG.LANE_WIDTH / 2, 0.1, 0]}
        geometry={edgeGeometry}
      >
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.2} />
      </mesh>
    </>
  );
}

function CenterLine({ carPosition }: { carPosition: THREE.Vector3 }) {
  const linesRef = useRef<THREE.Group>(null);
  
  const dashGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.15, 0.05, 2);
  }, []);
  
  useFrame(() => {
    if (linesRef.current) {
      linesRef.current.position.z = carPosition.z - 50;
    }
  });
  
  const dashes = useMemo(() => {
    const dashArray = [];
    for (let i = 0; i < 50; i++) {
      dashArray.push({
        key: i,
        position: [0, 0.1, i * 6 - 150] as [number, number, number]
      });
    }
    return dashArray;
  }, []);
  
  return (
    <group ref={linesRef}>
      {dashes.map((dash) => (
        <mesh
          key={dash.key}
          position={dash.position}
          geometry={dashGeometry}
        >
          <meshStandardMaterial color={DREAM_NEXUS_COLORS.roadLine} />
        </mesh>
      ))}
    </group>
  );
}
