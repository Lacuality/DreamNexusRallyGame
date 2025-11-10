import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { Car, Controls } from "./Car";
import { Road } from "./Road";
import { Camera } from "./Camera";
import { Environment } from "./Environment";
import { Obstacles } from "./Obstacles";
import { Collectibles } from "./Collectibles";
import { SponsorBanners } from "./SponsorBanners";
import { NitroParticles, DustTrail } from "./ParticleEffects";
import { BiomePropsScene } from "./BiomeProps";
import { useRally } from "@/lib/stores/useRally";
import { useSettings } from "@/lib/stores/useSettings";
import { useBiome } from "@/lib/stores/useBiome";
import { GameHUD } from "../ui/GameHUD";
import { PauseMenu } from "../ui/PauseMenu";
import { MobileControls } from "../ui/MobileControls";
import { TuningPanel } from "../ui/TuningPanel";
import { GAME_CONFIG } from "@/lib/constants";
import { audioManager } from "@/lib/audio";

function FrameSync({ carPositionRef, carSpeedRef }: { 
  carPositionRef: React.MutableRefObject<THREE.Vector3>, 
  carSpeedRef: React.MutableRefObject<number> 
}) {
  const frameCountRef = useRef(0);
  const phase = useRally((state) => state.phase);
  const updateDistance = useRally((state) => state.updateDistance);
  const updateSpeed = useRally((state) => state.updateSpeed);
  const updateBiomeDistance = useBiome((state) => state.updateDistance);

  useFrame(() => {
    if (phase !== "playing") return;
    
    frameCountRef.current++;
    if (frameCountRef.current % 10 === 0) {
      updateDistance(carPositionRef.current.z);
      updateBiomeDistance(carPositionRef.current.z);
      updateSpeed(carSpeedRef.current);
    }
  });

  return null;
}

export function GameScene() {
  const carPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const carSpeedRef = useRef(0);
  const [boostCounter, setBoostCounter] = useState(0);
  const [nitroActive, setNitroActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [puddleSlowdownActive, setPuddleSlowdownActive] = useState(false);
  const nitroTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const puddleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { phase, updateDistance, updateSpeed, gameOver, pause, resume, addCollectible } = useRally();
  const showPhotoMode = useSettings((state) => state.showPhotoMode);
  const updateBiomeDistance = useBiome((state) => state.updateDistance);
  
  useEffect(() => {
    if (phase === "menu" || phase === "gameover") {
      if (nitroTimeoutRef.current) {
        clearTimeout(nitroTimeoutRef.current);
        nitroTimeoutRef.current = null;
      }
      if (puddleTimeoutRef.current) {
        clearTimeout(puddleTimeoutRef.current);
        puddleTimeoutRef.current = null;
      }
      setNitroActive(false);
      setShieldActive(false);
      setPuddleSlowdownActive(false);
      setBoostCounter(0);
      carPositionRef.current.set(0, 0, 0);
      carSpeedRef.current = 0;
    }
  }, [phase]);
  
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
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        useSettings.getState().togglePhotoMode();
        const newPhotoMode = useSettings.getState().showPhotoMode;
        console.log("Photo mode:", newPhotoMode ? "ON" : "OFF");
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  const handlePuddleHit = () => {
    console.log("Hit puddle - splash and slowdown!");
    audioManager.playSplash();
    setPuddleSlowdownActive(true);
    if (puddleTimeoutRef.current) {
      clearTimeout(puddleTimeoutRef.current);
    }
    puddleTimeoutRef.current = setTimeout(() => {
      setPuddleSlowdownActive(false);
      puddleTimeoutRef.current = null;
    }, 800);
  };
  
  const handleCollision = (obstacle: any) => {
    console.log("Collision with obstacle:", obstacle.type, "at speed:", carSpeedRef.current);
    
    if (obstacle.type === "puddle") {
      handlePuddleHit();
      return;
    }
    
    if (shieldActive) {
      console.log("Shield absorbed the hit!");
      setShieldActive(false);
      return;
    }
    
    if (carSpeedRef.current > GAME_CONFIG.CRASH_SPEED_THRESHOLD) {
      console.log("High-speed crash! Game over.");
      audioManager.playCrash();
      gameOver();
    } else {
      console.log("Low-speed collision - speed penalty only");
      audioManager.playCrash();
    }
  };
  
  const handleCollect = (collectible: any) => {
    if (collectible.type === "arequipe") {
      console.log("Collected arequipe jar! +50 points, speed burst!");
      addCollectible();
      audioManager.playSuccess();
      setBoostCounter(prev => prev + 1);
    } else if (collectible.type === "nitro") {
      console.log("Collected nitro! +20% speed for 2 seconds!");
      audioManager.playNitro();
      setNitroActive(true);
      if (nitroTimeoutRef.current) {
        clearTimeout(nitroTimeoutRef.current);
      }
      nitroTimeoutRef.current = setTimeout(() => {
        setNitroActive(false);
        nitroTimeoutRef.current = null;
      }, 2000);
    } else if (collectible.type === "shield") {
      console.log("Collected shield! Protection from 1 hit!");
      audioManager.playShield();
      setShieldActive(true);
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
            <SponsorBanners />
            <Road carPositionRef={carPositionRef} />
            <BiomePropsScene carPositionRef={carPositionRef} />
            <Car
              carPositionRef={carPositionRef}
              carSpeedRef={carSpeedRef}
              onCrash={gameOver}
              boostCounter={boostCounter}
              nitroActive={nitroActive}
              puddleSlowdown={puddleSlowdownActive}
            />
            <Obstacles
              carPositionRef={carPositionRef}
              carSpeedRef={carSpeedRef}
              onCollision={handleCollision}
            />
            <Collectibles
              carPositionRef={carPositionRef}
              onCollect={handleCollect}
            />
            <NitroParticles active={nitroActive} carPositionRef={carPositionRef} />
            <DustTrail carPositionRef={carPositionRef} speedRef={carSpeedRef} />
            <Camera carPositionRef={carPositionRef} />
            <FrameSync carPositionRef={carPositionRef} carSpeedRef={carSpeedRef} />
          </Suspense>
        </Canvas>
      </KeyboardControls>
      
      {!showPhotoMode && phase === "playing" && <GameHUD nitroActive={nitroActive} shieldActive={shieldActive} />}
      {!showPhotoMode && phase === "playing" && <TuningPanel />}
      {!showPhotoMode && phase === "paused" && <PauseMenu />}
      {!showPhotoMode && <MobileControls />}
      
      {showPhotoMode && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(14, 27, 36, 0.9)",
            padding: "10px 20px",
            borderRadius: "8px",
            color: "#24A0CE",
            fontFamily: "monospace",
            fontSize: "16px",
            zIndex: 1000,
          }}
        >
          Photo Mode (Press F2 to exit)
        </div>
      )}
    </>
  );
}
