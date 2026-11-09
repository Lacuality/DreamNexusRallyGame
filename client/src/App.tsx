import { useEffect, useState } from "react";
import { preloadAssets } from "./lib/game/assets";
import { asset } from "./lib/env";
import { useRally } from "./lib/stores/useRally";
import { useAchievements } from "./lib/stores/useAchievements";
import { TitleScreenImmersive } from "./components/ui/TitleScreenImmersive";
import { GameScene } from "./components/game/GameScene";
import { GameOverScreen } from "./components/ui/GameOverScreen";
import { GameStyles } from "./components/ui/gameUi";
import { audioManager } from "./lib/audio";
import { useFullscreen } from "./hooks/useFullscreen";
import { room } from "./lib/game/net";
import "@fontsource/inter";

function App() {
  const phase = useRally((state) => state.phase);
  const playerName = useRally((state) => state.playerName);
  const { elementRef, isFullscreen, toggle, isSupported } = useFullscreen();
  const loadAchievements = useAchievements((state) => state.loadAchievements);
  const loadPlayerStats = useAchievements((state) => state.loadPlayerStats);

  useEffect(() => {
    loadAchievements();
    // Browsers only allow sound after the player interacts with the page.
    const unlock = () => audioManager.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      audioManager.cleanup();
    };
  }, [loadAchievements]);

  useEffect(() => {
    if (playerName) loadPlayerStats(playerName);
  }, [playerName, loadPlayerStats]);

  // real 3D models load once up front (a few seconds); if they fail we fall back to procedural ones
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    preloadAssets().then(finish, finish);
    const t = setTimeout(finish, 12000);
    return () => clearTimeout(t);
  }, []);

  // online rooms: when the host starts a race, everyone starts it
  useEffect(
    () =>
      room.onMessage((m) => {
        if (m.t === "start") {
          audioManager.unlock();
          useRally.getState().start({ mode: "online", circuitId: m.circuitId, laps: m.laps, room: room.code, battle: !!m.battle });
        }
      }),
    [],
  );

  return (
    <div ref={elementRef} style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", background: "#0E1B24" }}>
      <GameStyles />
      {!ready ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, color: "#fff", fontFamily: "'Nunito', system-ui, sans-serif" }}>
          <img src={asset("/dream-nexus-logo.png")} alt="Dream Nexus" style={{ width: 160, filter: "drop-shadow(0 0 12px rgba(255,255,255,0.8))", animation: "dnrFloat 2s ease-in-out infinite" }} />
          <div style={{ fontFamily: "'Bungee', sans-serif", fontSize: 28, color: "#5fd8ff", animation: "dnrPulse 1s ease-in-out infinite" }}>CARGANDO LA PISTA…</div>
          <div style={{ fontWeight: 800, opacity: 0.8 }}>Preparando los karts 🏁</div>
        </div>
      ) : phase === "menu" ? (
        <TitleScreenImmersive isFullscreen={isFullscreen} onToggleFullscreen={toggle} isFullscreenSupported={isSupported} />
      ) : (
        <GameScene isFullscreen={isFullscreen} onToggleFullscreen={isSupported ? toggle : undefined} />
      )}
      {phase === "gameover" && <GameOverScreen />}
    </div>
  );
}

// handy for debugging from the browser console
if (typeof window !== "undefined") (window as any).__store = useRally;

export default App;
