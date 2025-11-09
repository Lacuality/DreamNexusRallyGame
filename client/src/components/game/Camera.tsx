import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraProps {
  carPosition: THREE.Vector3;
}

export function Camera({ carPosition }: CameraProps) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3(0, 4, -8));
  
  useFrame(() => {
    targetPosition.current.set(
      carPosition.x * 0.5,
      carPosition.y + 4,
      carPosition.z - 8
    );
    
    currentPosition.current.lerp(targetPosition.current, 0.1);
    
    camera.position.copy(currentPosition.current);
    camera.lookAt(carPosition.x, carPosition.y + 0.5, carPosition.z + 2);
  });
  
  return null;
}
