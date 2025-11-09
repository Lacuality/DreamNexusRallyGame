import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { Car, Controls } from "./Car";
import { Road } from "./Road";
import { Camera } from "./Camera";
import { Environment } from "./Environment";
import { Obstacles } from "./Obstacles";
import { useRally } from "@/lib/stores/useRally";
import { GameHUD } from "../ui/GameHUD";
import { PauseMenu } from "../ui/PauseMenu";
import { MobileControls } from "../ui/MobileControls";
import { GAME_CONFIG } from "@/lib/constants";

export function GameScene() {
  const [carPosition, setCarPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [carSpeed, setCarSpeed] = useState(0);
  const { phase, updateDistance, updateSpeed, gameOver, pause, resume } = useRally();
  
  useEffect(() => {
    updateDistance(carPosition.z);
  }, [carPosition.z, updateDistance]);
  
  useEffect(() => {
    updateSpeed(carSpeed);
  }, [carSpeed, updateSpeed]);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") {
        if (phase === "playing") {
          pause();
        } else if (phase === "paused") {
          resume();
        }
      }
    };
    
    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [phase, pause, resume]);
  
  const handleCollision = (obstacle: any) => {
    console.log("Collision with obstacle:", obstacle.type, "at speed:", carSpeed);
    
    if (obstacle.type === "puddle") {
      console.log("Hit puddle - speed penalty");
      return;
    }
    
    if (carSpeed > GAME_CONFIG.CRASH_SPEED_THRESHOLD) {
      console.log("High-speed crash! Game over.");
      gameOver();
    } else {
      console.log("Low-speed collision - speed penalty only");
    }
  };
  
  const keyMap = [
    { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
    { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
    { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
    { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
  ];
  
  return (
    <>
      <KeyboardControls map={keyMap}>
        <Canvas
          shadows
          camera={{
            position: [0, 4, -8],
            fov: 60,
            near: 0.1,
            far: 200,
          }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <Suspense fallback={null}>
            <Environment />
            <Road carPosition={carPosition} />
            <Car
              onPositionChange={setCarPosition}
              onSpeedChange={setCarSpeed}
              onCrash={gameOver}
            />
            <Obstacles
              carPosition={carPosition}
              carSpeed={carSpeed}
              onCollision={handleCollision}
            />
            <Camera carPosition={carPosition} />
          </Suspense>
        </Canvas>
      </KeyboardControls>
      
      {phase === "playing" && <GameHUD />}
      {phase === "paused" && <PauseMenu />}
      
      <MobileControls />
    </>
  );
}
