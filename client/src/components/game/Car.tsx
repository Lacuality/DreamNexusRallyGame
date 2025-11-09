import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { GAME_CONFIG } from "@/lib/constants";
import { useRally } from "@/lib/stores/useRally";
import { useMobileControls } from "@/lib/stores/useMobileControls";
import { useSettings } from "@/lib/stores/useSettings";

export enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

interface CarProps {
  onPositionChange: (position: THREE.Vector3) => void;
  onSpeedChange: (speed: number) => void;
  onCrash: () => void;
}

export function Car({ onPositionChange, onSpeedChange, onCrash }: CarProps) {
  const carRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(0);
  const lanePositionRef = useRef(0);
  const distanceRef = useRef(0);
  
  const [, getKeys] = useKeyboardControls<Controls>();
  const phase = useRally((state) => state.phase);
  const mobileControls = useMobileControls();
  const showPhotoMode = useSettings((state) => state.showPhotoMode);
  
  useEffect(() => {
    const controls = getKeys();
    console.log("Keyboard controls initialized:", {
      forward: controls.forward,
      back: controls.back,
      left: controls.left,
      right: controls.right
    });
  }, [getKeys]);
  
  useFrame((state, delta) => {
    if (!carRef.current || phase !== "playing" || showPhotoMode) return;
    
    const keys = getKeys();
    const isForward = keys.forward || mobileControls.forward;
    const isBack = keys.back || mobileControls.back;
    const isLeft = keys.left || mobileControls.left;
    const isRight = keys.right || mobileControls.right;
    const maxSpeed = GAME_CONFIG.MAX_SPEED_MS;
    
    if (isForward) {
      velocityRef.current = Math.min(
        velocityRef.current + GAME_CONFIG.ACCELERATION * delta,
        maxSpeed
      );
    } else if (isBack) {
      velocityRef.current = Math.max(
        velocityRef.current - GAME_CONFIG.BRAKE_FORCE * delta,
        0
      );
    } else {
      velocityRef.current *= 0.98;
    }
    
    if (isLeft) {
      lanePositionRef.current = Math.max(
        lanePositionRef.current - 8 * delta,
        -GAME_CONFIG.LANE_WIDTH / 2 + 0.5
      );
    }
    
    if (isRight) {
      lanePositionRef.current = Math.min(
        lanePositionRef.current + 8 * delta,
        GAME_CONFIG.LANE_WIDTH / 2 - 0.5
      );
    }
    
    lanePositionRef.current *= GAME_CONFIG.DRIFT_ASSIST;
    
    distanceRef.current += velocityRef.current * delta;
    
    carRef.current.position.x = lanePositionRef.current;
    carRef.current.position.z = distanceRef.current;
    
    const speedKmh = velocityRef.current * 3.6;
    onSpeedChange(speedKmh);
    onPositionChange(carRef.current.position.clone());
  });
  
  return (
    <group ref={carRef} position={[0, 0.5, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1, 0.6, 2]} />
        <meshStandardMaterial color="#24A0CE" />
      </mesh>
      
      <mesh position={[0, 0.5, -0.3]} castShadow>
        <boxGeometry args={[0.9, 0.4, 0.8]} />
        <meshStandardMaterial color="#0E1B24" />
      </mesh>
      
      <mesh position={[-0.6, -0.2, 0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.6, -0.2, 0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.6, -0.2, -0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.6, -0.2, -0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}
