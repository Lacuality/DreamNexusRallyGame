import { useEffect } from "react";
import { useRally } from "./lib/stores/useRally";
import { useAchievements } from "./lib/stores/useAchievements";
import { TitleScreenImmersive } from "./components/ui/TitleScreenImmersive";
import { GameScene } from "./components/game/GameScene";
import { GameOverScreen } from "./components/ui/GameOverScreen";
import { AchievementNotification } from "./components/ui/AchievementNotification";
import { GameStyles } from "./components/ui/gameUi";
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

  return (
    <div ref={elementRef} style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", background: "#0E1B24" }}>
      <GameStyles />
      {phase === "menu" ? (
        <TitleScreenImmersive isFullscreen={isFullscreen} onToggleFullscreen={toggle} isFullscreenSupported={isSupported} />
      ) : (
        <GameScene isFullscreen={isFullscreen} onToggleFullscreen={isSupported ? toggle : undefined} />
      )}
      {phase === "gameover" && <GameOverScreen />}
      <AchievementNotification />
    </div>
  );
}

export default App;
