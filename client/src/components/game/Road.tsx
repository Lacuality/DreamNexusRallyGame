import { useRef, useMemo, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GAME_CONFIG, DREAM_NEXUS_COLORS } from "@/lib/constants";

interface RoadProps {
  carPosition: THREE.Vector3;
}

const ROAD_LENGTH = 300;
const ROAD_SEGMENTS = 300;
const ROAD_WIDTH = GAME_CONFIG.LANE_WIDTH + 0.6;
const EDGE_WIDTH = 0.28;
const EDGE_HEIGHT = 0.12;
const DASH_LENGTH = 2;
const DASH_GAP = 4;
const SHOULDER_INSET = 0.02;
const LIFT_FROM_ZFIGHT = 0.015;

function roadCurve(z: number) {
  const bend = Math.sin(z * 0.02) * 2;
  const elev = Math.sin(z * 0.03) * 0.5 + Math.cos(z * 0.05) * 0.3;

  const dbend = 0.02 * Math.cos(z * 0.02) * 2;
  const yaw = Math.atan2(dbend, 1);

  return { bend, elev, yaw };
}

export function Road({ carPosition }: RoadProps) {
  const roadRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const asphaltTexture = useTexture("/textures/asphalt.png");

  useLayoutEffect(() => {
    asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.repeat.set(4, ROAD_LENGTH / 8);
    asphaltTexture.anisotropy = 8;
  }, [asphaltTexture]);

  const roadGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      ROAD_WIDTH,
      ROAD_LENGTH,
      20,
      ROAD_SEGMENTS
    );
    const pos = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const zWorld = y - ROAD_LENGTH / 2;

      const { bend, elev } = roadCurve(zWorld);

      pos.setX(i, x + bend);
      pos.setZ(i, elev);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.z = carPosition.z;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={roadRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <primitive object={roadGeometry} />
        <meshStandardMaterial map={asphaltTexture} roughness={0.9} metalness={0.1} />
      </mesh>

      <RoadEdges />
      <CenterLine />
    </group>
  );
}

function RoadEdges() {
  const leftRef = useRef<THREE.InstancedMesh>(null);
  const rightRef = useRef<THREE.InstancedMesh>(null);

  const edgeGeom = useMemo(
    () => new THREE.BoxGeometry(EDGE_WIDTH, EDGE_HEIGHT, DASH_LENGTH),
    []
  );
  const edgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffcc00",
        emissive: "#ffcc00",
        emissiveIntensity: 0.35,
      }),
    []
  );

  const segmentCount = useMemo(
    () => Math.ceil(ROAD_LENGTH / (DASH_LENGTH + 0.25)) + 4,
    []
  );

  useLayoutEffect(() => {
    if (!leftRef.current || !rightRef.current) return;
    leftRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rightRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame(() => {
    const half = ROAD_LENGTH / 2;
    const sideX = (ROAD_WIDTH / 2) - EDGE_WIDTH / 2 - SHOULDER_INSET;

    const dummy = new THREE.Object3D();

    if (leftRef.current && rightRef.current) {
      for (let i = 0; i < segmentCount; i++) {
        const zLocal = -half + i * (DASH_LENGTH + 0.25);

        const { bend, elev, yaw } = roadCurve(zLocal);

        dummy.position.set(-sideX + bend, EDGE_HEIGHT / 2 + LIFT_FROM_ZFIGHT + elev, zLocal);
        dummy.rotation.set(0, yaw, 0);
        dummy.updateMatrix();
        leftRef.current.setMatrixAt(i, dummy.matrix);

        dummy.position.set(+sideX + bend, EDGE_HEIGHT / 2 + LIFT_FROM_ZFIGHT + elev, zLocal);
        dummy.rotation.set(0, yaw, 0);
        dummy.updateMatrix();
        rightRef.current.setMatrixAt(i, dummy.matrix);
      }
      leftRef.current.instanceMatrix.needsUpdate = true;
      rightRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={leftRef}
        args={[edgeGeom, edgeMat, segmentCount]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={rightRef}
        args={[edgeGeom, edgeMat, segmentCount]}
        castShadow
        receiveShadow
      />
    </>
  );
}

function CenterLine() {
  const lineRef = useRef<THREE.InstancedMesh>(null);

  const dashGeom = useMemo(
    () => new THREE.BoxGeometry(0.15, 0.05, DASH_LENGTH),
    []
  );
  const dashMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: DREAM_NEXUS_COLORS.roadLine,
      }),
    []
  );

  const dashCount = useMemo(
    () => Math.ceil(ROAD_LENGTH / (DASH_LENGTH + DASH_GAP)) + 4,
    []
  );

  useLayoutEffect(() => {
    if (!lineRef.current) return;
    lineRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame(() => {
    const half = ROAD_LENGTH / 2;
    const dummy = new THREE.Object3D();

    if (!lineRef.current) return;

    for (let i = 0; i < dashCount; i++) {
      const zLocal = -half + i * (DASH_LENGTH + DASH_GAP);
      const { bend, elev, yaw } = roadCurve(zLocal);

      dummy.position.set(0 + bend, LIFT_FROM_ZFIGHT + elev, zLocal);
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      lineRef.current.setMatrixAt(i, dummy.matrix);
    }
    lineRef.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={lineRef} args={[dashGeom, dashMat, dashCount]} receiveShadow />;
}
