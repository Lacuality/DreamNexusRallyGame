import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
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
  nitroActive?: boolean;
  puddleSlowdown?: boolean;
}

export function Car({ onPositionChange, onSpeedChange, onCrash, boostCounter = 0, nitroActive = false, puddleSlowdown = false }: CarProps) {
  const carRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const carModelRef = useRef<THREE.Group>(null);
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const rearLeftWheelRef = useRef<THREE.Group>(null);
  const rearRightWheelRef = useRef<THREE.Group>(null);
  
  const { scene: carScene } = useGLTF("/models/rally-car.glb");
  const { scene: wheelScene } = useGLTF("/models/rally-wheel.glb");
  
  const carModel = useMemo(() => {
    const clonedScene = carScene.clone();
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedScene;
  }, [carScene]);
  
  const wheelModels = useMemo(() => {
    return {
      frontLeft: wheelScene.clone(),
      frontRight: wheelScene.clone(),
      rearLeft: wheelScene.clone(),
      rearRight: wheelScene.clone(),
    };
  }, [wheelScene]);
  
  const targetSpeedRef = useRef(0);
  const actualSpeedRef = useRef(0);
  const yawVelocityRef = useRef(0);
  const carYawRef = useRef(0);
  const lanePositionRef = useRef(0);
  const distanceRef = useRef(0);
  const lastBoostCounterRef = useRef(0);
  const wheelRotationRef = useRef(0);
  const suspensionTimeRef = useRef(0);
  
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
    
    const maxSpeedMs = nitroActive ? GAME_CONFIG.MAX_SPEED_MS * 1.2 : GAME_CONFIG.MAX_SPEED_MS;
    const accelInput = isForward ? 1 : 0;
    const brakeInput = isBack ? 1 : 0;
    const steerInput = (isLeft ? -1 : 0) + (isRight ? 1 : 0);
    
    targetSpeedRef.current += (accelInput * GAME_CONFIG.ACCEL_RATE - brakeInput * GAME_CONFIG.BRAKE_RATE) * delta;
    
    if (nitroActive && targetSpeedRef.current < maxSpeedMs) {
      targetSpeedRef.current = Math.min(maxSpeedMs, targetSpeedRef.current + GAME_CONFIG.ACCEL_RATE * delta * 0.5);
    }
    
    if (puddleSlowdown) {
      targetSpeedRef.current *= Math.pow(0.85, delta / (1/60));
      actualSpeedRef.current *= Math.pow(0.90, delta / (1/60));
    }
    
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
    
    const wheelRadius = 0.15;
    const angularVelocity = actualSpeedRef.current / wheelRadius;
    wheelRotationRef.current += angularVelocity * delta;
    
    if (frontLeftWheelRef.current) frontLeftWheelRef.current.rotation.x = wheelRotationRef.current;
    if (frontRightWheelRef.current) frontRightWheelRef.current.rotation.x = wheelRotationRef.current;
    if (rearLeftWheelRef.current) rearLeftWheelRef.current.rotation.x = wheelRotationRef.current;
    if (rearRightWheelRef.current) rearRightWheelRef.current.rotation.x = wheelRotationRef.current;
    
    suspensionTimeRef.current += delta;
    const baseMaxSpeed = GAME_CONFIG.MAX_SPEED_MS;
    const suspensionBob = Math.sin(suspensionTimeRef.current * 8 + actualSpeedRef.current * 0.5) * 0.03 * (actualSpeedRef.current / baseMaxSpeed);
    
    const targetBodyRoll = steerInput * THREE.MathUtils.degToRad(4);
    if (bodyRef.current) {
      bodyRef.current.rotation.z += (targetBodyRoll - bodyRef.current.rotation.z) * delta * 6;
      bodyRef.current.position.y = suspensionBob;
    }
    
    carRef.current.position.x = lanePositionRef.current;
    carRef.current.position.z = distanceRef.current;
    carRef.current.rotation.y = -carYawRef.current * 0.3;
    
    const speedKmh = actualSpeedRef.current * 3.6;
    onSpeedChange(speedKmh);
    onPositionChange(carRef.current.position.clone());
  });
  
  return (
    <group ref={carRef} position={[0, 0.5, 0]}>
      <group ref={bodyRef}>
        <group ref={carModelRef} scale={1.4}>
          <primitive object={carModel} />
        </group>
      </group>
      
      <group ref={frontLeftWheelRef} position={[-0.6, -0.2, 0.6]} rotation={[0, 0, 0]}>
        <primitive object={wheelModels.frontLeft} scale={0.7} />
      </group>
      <group ref={frontRightWheelRef} position={[0.6, -0.2, 0.6]} rotation={[0, 0, 0]}>
        <primitive object={wheelModels.frontRight} scale={0.7} />
      </group>
      <group ref={rearLeftWheelRef} position={[-0.6, -0.2, -0.6]} rotation={[0, 0, 0]}>
        <primitive object={wheelModels.rearLeft} scale={0.7} />
      </group>
      <group ref={rearRightWheelRef} position={[0.6, -0.2, -0.6]} rotation={[0, 0, 0]}>
        <primitive object={wheelModels.rearRight} scale={0.7} />
      </group>
    </group>
  );
}
