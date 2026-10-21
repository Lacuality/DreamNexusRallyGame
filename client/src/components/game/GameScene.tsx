import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { World } from "./World";
import { Car } from "./Car";
import { Camera } from "./Camera";
import { RaceSystem, Scenery } from "./RaceSystem";
import { Rivals } from "./Rivals";
import { NitroParticles, DustTrail, ExhaustSmoke } from "./ParticleEffects";
import { AtmosphericParticles } from "./AtmosphericParticles";
import { SpeedLines } from "./SpeedLines";
import { useRally } from "@/lib/stores/useRally";
import { useSettings } from "@/lib/stores/useSettings";
import { GameHUD } from "../ui/GameHUD";
import { PauseMenu } from "../ui/PauseMenu";
import { MobileControls } from "../ui/MobileControls";
import { installKeyboard, isTouchDevice } from "@/lib/input";
import { run } from "@/lib/game/run";

interface GameSceneProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function NitroFx({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const nitroActive = useRally((s) => s.hud.nitroActive);
  return <NitroParticles active={nitroActive} carPositionRef={carPositionRef} />;
}

export function GameScene({ isFullscreen = false, onToggleFullscreen }: GameSceneProps = {}) {
  const carPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const carSpeedRef = useRef(0);
  const phase = useRally((s) => s.phase);
  const runId = useRally((s) => s.runId);
  const showPhotoMode = useSettings((s) => s.showPhotoMode);
  const touch = isTouchDevice();

  useEffect(() => {
    installKeyboard();
  }, []);

  // keyboard shortcuts: P / Esc pause, F2 photo mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { phase, pause, resume } = useRally.getState();
      if (e.code === "KeyP" || e.code === "Escape") {
        if (phase === "playing" || phase === "countdown") pause();
        else if (phase === "paused") resume();
      }
      if (e.key === "F2") {
        e.preventDefault();
        useSettings.getState().togglePhotoMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // auto-pause when the tab is hidden or the phone locks
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) useRally.getState().pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const inRace = phase === "playing" || phase === "countdown";

  return (
    <>
      <Canvas
        camera={{ position: [0, 4, -9], fov: 62, near: 0.1, far: 900 }}
        dpr={touch ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !touch, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        style={{ position: "fixed", inset: 0 }}
      >
        <Suspense fallback={null}>
          <group key={runId}>
            <World />
            <Scenery />
            <Car />
            <Rivals />
            <RaceSystem carPositionRef={carPositionRef} carSpeedRef={carSpeedRef} />
            <NitroFx carPositionRef={carPositionRef} />
            <DustTrail carPositionRef={carPositionRef} speedRef={carSpeedRef} />
            <ExhaustSmoke carPositionRef={carPositionRef} speedRef={carSpeedRef} />
            <AtmosphericParticles carPositionRef={carPositionRef} />
            <SpeedLines carPositionRef={carPositionRef} speedRef={carSpeedRef} />
            <Camera />
          </group>
        </Suspense>
      </Canvas>

      {!showPhotoMode && (inRace || phase === "paused") && (
        <GameHUD isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} />
      )}
      {!showPhotoMode && inRace && <MobileControls />}
      {!showPhotoMode && phase === "paused" && <PauseMenu />}

      {showPhotoMode && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(14, 27, 36, 0.9)",
            padding: "12px 22px",
            borderRadius: 12,
            color: "#24A0CE",
            fontWeight: 800,
            fontSize: 18,
            zIndex: 1000,
          }}
        >
          Photo Mode — press F2 to exit
        </div>
      )}
    </>
  );
}

// Handy for debugging in the browser console
if (typeof window !== "undefined") (window as any).__rally = run;
