import { useEffect } from "react";
import { useRally } from "./lib/stores/useRally";
import { useAchievements } from "./lib/stores/useAchievements";
import { TitleScreen } from "./components/ui/TitleScreen";
import { GameScene } from "./components/game/GameScene";
import { GameOverScreen } from "./components/ui/GameOverScreen";
import { AchievementNotification } from "./components/ui/AchievementNotification";
import { audioManager } from "./lib/audio";
import { useFullscreen } from "./hooks/useFullscreen";
import "@fontsource/inter";

function App() {
  const phase = useRally((state) => state.phase);
  const playerName = useRally((state) => state.playerName);
  const { elementRef, isFullscreen, toggle, isSupported } = useFullscreen();
  const loadAchievements = useAchievements((state) => state.loadAchievements);
  const loadPlayerStats = useAchievements((state) => state.loadPlayerStats);

  useEffect(() => {
    console.log("Dream Nexus Rally initialized. Phase:", phase);
    loadAchievements();

    return () => {
      audioManager.cleanup();
    };
  }, [loadAchievements]);

  useEffect(() => {
    if (playerName) {
      loadPlayerStats(playerName);
    }
  }, [playerName, loadPlayerStats]);
  
  useEffect(() => {
    if (phase === "playing") {
      console.log("Game started - playing phase");
    }
  }, [phase]);
  
  return (
    <div ref={elementRef} style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {phase === "menu" && <TitleScreen />}
      {phase === "playing" && <GameScene isFullscreen={isFullscreen} onToggleFullscreen={toggle} />}
      {phase === "paused" && <GameScene isFullscreen={isFullscreen} onToggleFullscreen={toggle} />}
      {phase === "gameover" && (
        <>
          <GameScene isFullscreen={isFullscreen} onToggleFullscreen={toggle} />
          <GameOverScreen />
        </>
      )}
      <AchievementNotification />
    </div>
  );
}

export default App;
