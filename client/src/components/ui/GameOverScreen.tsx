import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { useEffect } from "react";
import { Leaderboard } from "./Leaderboard";

export function GameOverScreen() {
  const { currentScore, highScore, restart } = useRally();
  const isNewHighScore = currentScore === highScore && currentScore > 0;
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      restart();
    }
  };
  
  useEffect(() => {
    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, []);
  
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(14, 27, 36, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "monospace",
        color: DREAM_NEXUS_COLORS.white,
        overflow: "auto",
        padding: "20px",
      }}
    >
      <h1
        style={{
          fontSize: "56px",
          color: DREAM_NEXUS_COLORS.cyan,
          marginBottom: "20px",
        }}
      >
        GAME OVER
      </h1>
      
      {isNewHighScore && (
        <div
          style={{
            fontSize: "32px",
            color: DREAM_NEXUS_COLORS.warm,
            marginBottom: "20px",
            fontWeight: "bold",
          }}
        >
          🎉 NEW HIGH SCORE! 🎉
        </div>
      )}
      
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          padding: "30px 50px",
          borderRadius: "15px",
          marginBottom: "40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            marginBottom: "15px",
            color: DREAM_NEXUS_COLORS.cyan,
          }}
        >
          Distance Traveled
        </div>
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: DREAM_NEXUS_COLORS.warm,
            marginBottom: "20px",
          }}
        >
          {currentScore}m
        </div>
        
        <div
          style={{
            fontSize: "20px",
            color: DREAM_NEXUS_COLORS.white,
          }}
        >
          High Score: {highScore}m
        </div>
      </div>
      
      <Leaderboard />
      
      <button
        onClick={restart}
        style={{
          fontSize: "28px",
          padding: "15px 50px",
          backgroundColor: DREAM_NEXUS_COLORS.cyan,
          color: DREAM_NEXUS_COLORS.navy,
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: "bold",
          fontFamily: "monospace",
          marginTop: "30px",
        }}
      >
        Play Again (Enter)
      </button>
      
      <div
        style={{
          marginTop: "30px",
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <img
          src="/pixel-bunny.png"
          alt="Pixel"
          style={{ width: "60px", height: "60px", objectFit: "contain" }}
        />
        <div style={{ fontSize: "16px", color: DREAM_NEXUS_COLORS.warm }}>
          Thanks for playing Dream Nexus Rally!
        </div>
      </div>
    </div>
  );
}
