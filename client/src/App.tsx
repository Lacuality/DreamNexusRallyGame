import { useEffect } from "react";
import { useRally } from "./lib/stores/useRally";
import { TitleScreenImmersive } from "./components/ui/TitleScreenImmersive";
import { GameScene } from "./components/game/GameScene";
import { GameOverScreen } from "./components/ui/GameOverScreen";
import { audioManager } from "./lib/audio";
import { useFullscreen } from "./hooks/useFullscreen";
import "@fontsource/inter";

function App() {
  const phase = useRally((state) => state.phase);
  const { elementRef, isFullscreen, toggle, isSupported } = useFullscreen();
  
  useEffect(() => {
    console.log("Dream Nexus Rally initialized. Phase:", phase);
    
    return () => {
      audioManager.cleanup();
    };
  }, []);
  
  useEffect(() => {
    if (phase === "playing") {
      console.log("Game started - playing phase");
    }
  }, [phase]);
  
  return (
    <div ref={elementRef} style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {phase === "menu" && <TitleScreenImmersive isFullscreen={isFullscreen} onToggleFullscreen={toggle} isFullscreenSupported={isSupported} />}
      {phase === "playing" && <GameScene isFullscreen={isFullscreen} onToggleFullscreen={toggle} />}
      {phase === "paused" && <GameScene isFullscreen={isFullscreen} onToggleFullscreen={toggle} />}
      {phase === "gameover" && (
        <>
          <GameScene isFullscreen={isFullscreen} onToggleFullscreen={toggle} />
          <GameOverScreen />
        </>
      )}
    </div>
  );
}

export default App;
