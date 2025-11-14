import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SpeedLinesProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
  speedRef: React.MutableRefObject<number>;
}

export function SpeedLines({ carPositionRef, speedRef }: SpeedLinesProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const lineCount = 40;

  const { positions, geometry } = useMemo(() => {
    const positions = new Float32Array(lineCount * 6);

    for (let i = 0; i < lineCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 6;
      const x = Math.cos(angle) * radius;
      const y = Math.random() * 8 - 2;

      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = 0;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = -2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return { positions, geometry };
  }, []);

  useFrame((state, delta) => {
    if (!linesRef.current) return;

    const speedFactor = Math.max(0, (speedRef.current - 80) / 120);

    if (speedFactor < 0.1) {
      linesRef.current.visible = false;
      return;
    }

    linesRef.current.visible = true;

    const positionAttribute = linesRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;

    for (let i = 0; i < lineCount; i++) {
      positions[i * 6 + 2] -= delta * 60 * speedFactor;
      positions[i * 6 + 5] -= delta * 60 * speedFactor;

      if (positions[i * 6 + 2] < -20) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + Math.random() * 6;
        const x = Math.cos(angle) * radius;
        const y = Math.random() * 8 - 2;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = 20;

        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y;
        positions[i * 6 + 5] = 18;
      }
    }

    positionAttribute.needsUpdate = true;

    linesRef.current.position.copy(carPositionRef.current);

    const material = linesRef.current.material as THREE.LineBasicMaterial;
    material.opacity = speedFactor * 0.4;
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
