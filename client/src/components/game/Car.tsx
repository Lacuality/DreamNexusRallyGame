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
  boostCounter?: number;
}

export function Car({ onPositionChange, onSpeedChange, onCrash, boostCounter = 0 }: CarProps) {
  const carRef = useRef<THREE.Group>(null);
  const targetSpeedRef = useRef(0);
  const actualSpeedRef = useRef(0);
  const yawVelocityRef = useRef(0);
  const carYawRef = useRef(0);
  const lanePositionRef = useRef(0);
  const distanceRef = useRef(0);
  const lastBoostCounterRef = useRef(0);
  
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
    
    const maxSpeedMs = GAME_CONFIG.MAX_SPEED_MS;
    const accelInput = isForward ? 1 : 0;
    const brakeInput = isBack ? 1 : 0;
    const steerInput = (isLeft ? -1 : 0) + (isRight ? 1 : 0);
    
    targetSpeedRef.current += (accelInput * GAME_CONFIG.ACCEL_RATE - brakeInput * GAME_CONFIG.BRAKE_RATE) * delta;
    targetSpeedRef.current = Math.max(0, Math.min(targetSpeedRef.current, maxSpeedMs));
    
    if (boostCounter > lastBoostCounterRef.current) {
      const boostMs = GAME_CONFIG.PICKUP_BURST / 3.6;
      targetSpeedRef.current = Math.min(maxSpeedMs, targetSpeedRef.current + boostMs);
      lastBoostCounterRef.current = boostCounter;
      console.log(`Speed boost applied! +${GAME_CONFIG.PICKUP_BURST} km/h`);
    }
    
    actualSpeedRef.current += (targetSpeedRef.current - actualSpeedRef.current) * 0.12;
    
    const speedFactor = 0.7 + 0.3 * (actualSpeedRef.current / maxSpeedMs);
    const targetYaw = steerInput * GAME_CONFIG.STEER_STRENGTH * speedFactor;
    yawVelocityRef.current += (targetYaw - yawVelocityRef.current) * 0.15;
    carYawRef.current += yawVelocityRef.current * delta;
    
    const yawDamping = Math.pow(0.92, delta / (1/60));
    carYawRef.current *= yawDamping;
    
    lanePositionRef.current += Math.sin(carYawRef.current) * actualSpeedRef.current * delta * 0.8;
    lanePositionRef.current = Math.max(
      -GAME_CONFIG.LANE_WIDTH / 2 + 0.5,
      Math.min(GAME_CONFIG.LANE_WIDTH / 2 - 0.5, lanePositionRef.current)
    );
    
    const isOffRoad = Math.abs(lanePositionRef.current) > GAME_CONFIG.LANE_WIDTH / 2 - 1;
    if (isOffRoad) {
      const offRoadDrag = Math.pow(GAME_CONFIG.OFFROAD_DRAG, delta / (1/60));
      actualSpeedRef.current *= offRoadDrag;
      targetSpeedRef.current *= offRoadDrag;
    }
    
    distanceRef.current += actualSpeedRef.current * delta;
    
    carRef.current.position.x = lanePositionRef.current;
    carRef.current.position.z = distanceRef.current;
    carRef.current.rotation.y = -carYawRef.current * 0.3;
    
    const speedKmh = actualSpeedRef.current * 3.6;
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
