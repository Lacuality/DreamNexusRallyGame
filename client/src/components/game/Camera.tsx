import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
}

export function Camera({ carPositionRef }: CameraProps) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3(0, 4, -8));
  
  useFrame(() => {
    targetPosition.current.set(
      carPositionRef.current.x * 0.5,
      carPositionRef.current.y + 4,
      carPositionRef.current.z - 8
    );
    
    currentPosition.current.lerp(targetPosition.current, 0.1);
    
    camera.position.copy(currentPosition.current);
    camera.lookAt(carPositionRef.current.x, carPositionRef.current.y + 0.5, carPositionRef.current.z + 2);
  });
  
  return null;
}
