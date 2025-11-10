import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GAME_CONFIG, DREAM_NEXUS_COLORS } from "@/lib/constants";

interface RoadProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const ROAD_LENGTH = 200;
const ROAD_WIDTH = GAME_CONFIG.LANE_WIDTH + 0.6;
const EDGE_WIDTH = 0.28;
const EDGE_OFFSET = 0.02;
const EDGE_LIFT = 0.015;
const DASH_LENGTH = 2;
const DASH_GAP = 4;

function sampleCurveAndElev(z: number) {
  const curve = Math.sin(z * 0.02) * 2.0;
  const elev = Math.sin(z * 0.03) * 0.5 + Math.cos(z * 0.05) * 0.3;
  return { curve, elev };
}

function makeDeformedPlane(
  width: number,
  length: number,
  widthSegs: number,
  lengthSegs: number,
  xOffset: number,
  lift: number = 0
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, widthSegs, lengthSegs);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const { curve, elev } = sampleCurveAndElev(y);
    
    pos.setX(i, x + xOffset + curve);
    pos.setZ(i, elev + lift);
  }

  geo.computeVertexNormals();
  return geo;
}

export function Road({ carPositionRef }: RoadProps) {
  const roadRef = useRef<THREE.Mesh>(null);
  const asphaltTexture = useTexture("/textures/asphalt.png");

  useMemo(() => {
    asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.repeat.set(4, ROAD_LENGTH / 8);
    asphaltTexture.anisotropy = 8;
  }, [asphaltTexture]);

  const roadGeometry = useMemo(() => {
    return makeDeformedPlane(ROAD_WIDTH, ROAD_LENGTH, 20, 200, 0, 0);
  }, []);

  useFrame(() => {
    if (roadRef.current) {
      roadRef.current.position.z = carPositionRef.current.z - 50;
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
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      <RoadEdges carPositionRef={carPositionRef} />
      <CenterLine carPositionRef={carPositionRef} />
    </group>
  );
}

function RoadEdges({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const leftEdgeRef = useRef<THREE.Mesh>(null);
  const rightEdgeRef = useRef<THREE.Mesh>(null);

  const leftEdgeGeometry = useMemo(() => {
    const xOffset = -(ROAD_WIDTH / 2) + (EDGE_WIDTH / 2) - EDGE_OFFSET;
    return makeDeformedPlane(EDGE_WIDTH, ROAD_LENGTH, 1, 200, xOffset, EDGE_LIFT);
  }, []);

  const rightEdgeGeometry = useMemo(() => {
    const xOffset = (ROAD_WIDTH / 2) - (EDGE_WIDTH / 2) + EDGE_OFFSET;
    return makeDeformedPlane(EDGE_WIDTH, ROAD_LENGTH, 1, 200, xOffset, EDGE_LIFT);
  }, []);

  useFrame(() => {
    if (leftEdgeRef.current) {
      leftEdgeRef.current.position.z = carPositionRef.current.z - 50;
    }
    if (rightEdgeRef.current) {
      rightEdgeRef.current.position.z = carPositionRef.current.z - 50;
    }
  });

  const edgeMaterial = (
    <meshStandardMaterial
      color="#ffcc00"
      emissive="#ffcc00"
      emissiveIntensity={0.35}
      roughness={0.4}
      metalness={0.0}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
    />
  );

  return (
    <>
      <mesh
        ref={leftEdgeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={leftEdgeGeometry}
      >
        {edgeMaterial}
      </mesh>
      <mesh
        ref={rightEdgeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={rightEdgeGeometry}
      >
        {edgeMaterial}
      </mesh>
    </>
  );
}

function CenterLine({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const linesRef = useRef<THREE.Group>(null);

  const dashGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.16, 0.05, DASH_LENGTH);
  }, []);

  const dashes = useMemo(() => {
    const dashArray = [];
    const count = Math.floor(ROAD_LENGTH / (DASH_LENGTH + DASH_GAP)) + 6;

    for (let i = 0; i < count; i++) {
      const zLocal = -ROAD_LENGTH / 2 + i * (DASH_LENGTH + DASH_GAP);
      const { curve, elev } = sampleCurveAndElev(zLocal);
      
      dashArray.push({
        key: i,
        position: [curve, EDGE_LIFT * 0.8 + elev, zLocal] as [number, number, number]
      });
    }
    return dashArray;
  }, []);

  useFrame(() => {
    if (linesRef.current) {
      linesRef.current.position.z = carPositionRef.current.z - 50;
    }
  });

  return (
    <group ref={linesRef}>
      {dashes.map((dash) => (
        <mesh
          key={dash.key}
          position={dash.position}
          geometry={dashGeometry}
        >
          <meshStandardMaterial
            color={DREAM_NEXUS_COLORS.roadLine}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
    </group>
  );
}
