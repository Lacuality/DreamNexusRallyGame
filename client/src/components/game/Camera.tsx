import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
  shakeIntensity?: number;
}

export function Camera({ carPositionRef, shakeIntensity = 0 }: CameraProps) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3(0, 6, -12));
  const shakeOffset = useRef(new THREE.Vector3());
  const shakeDecay = useRef(0);
  const previousIntensity = useRef(0);
  
  useFrame(() => {
    targetPosition.current.set(
      carPositionRef.current.x * 0.5,
      carPositionRef.current.y + 6,
      carPositionRef.current.z - 12
    );
    
    currentPosition.current.lerp(targetPosition.current, 0.1);
    
    if (shakeIntensity > 0 && shakeIntensity !== previousIntensity.current) {
      shakeDecay.current = shakeIntensity;
      previousIntensity.current = shakeIntensity;
    } else if (shakeIntensity === 0 && previousIntensity.current !== 0) {
      previousIntensity.current = 0;
    }
    
    if (shakeDecay.current > 0.01) {
      shakeOffset.current.set(
        (Math.random() - 0.5) * shakeDecay.current * 0.3,
        (Math.random() - 0.5) * shakeDecay.current * 0.3,
        (Math.random() - 0.5) * shakeDecay.current * 0.2
      );
      shakeDecay.current *= 0.9;
    } else {
      shakeOffset.current.set(0, 0, 0);
      shakeDecay.current = 0;
    }
    
    camera.position.copy(currentPosition.current).add(shakeOffset.current);
    camera.lookAt(carPositionRef.current.x, carPositionRef.current.y + 1.5, carPositionRef.current.z + 3);
  });
  
  return null;
}
