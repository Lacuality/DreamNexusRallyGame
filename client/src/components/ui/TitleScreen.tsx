import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { useEffect } from "react";

export function TitleScreen() {
  const { start, highScore, loadHighScore } = useRally();
  
  useEffect(() => {
    loadHighScore();
  }, [loadHighScore]);
  
  const handleStart = () => {
    console.log("Starting game");
    start();
  };
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleStart();
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
        backgroundColor: DREAM_NEXUS_COLORS.navy,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "monospace",
        color: DREAM_NEXUS_COLORS.white,
      }}
    >
      <img
        src="/dream-nexus-logo.png"
        alt="Dream Nexus"
        style={{ width: "300px", marginBottom: "20px" }}
      />
      
      <h1
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          color: DREAM_NEXUS_COLORS.cyan,
          marginBottom: "10px",
          textAlign: "center",
        }}
      >
        Dream Nexus Rally
      </h1>
      
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <img
          src="/pixel-bunny.png"
          alt="Pixel the Bunny"
          style={{ width: "80px", height: "80px", objectFit: "contain" }}
        />
        <p
          style={{
            fontSize: "18px",
            color: DREAM_NEXUS_COLORS.warm,
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          Help Pixel the Bunny race through Colombia!
        </p>
      </div>
      
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          padding: "20px 30px",
          borderRadius: "10px",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ fontSize: "20px", marginBottom: "15px", color: DREAM_NEXUS_COLORS.cyan }}>
          Controls
        </h3>
        <div style={{ fontSize: "16px", lineHeight: "1.8" }}>
          <p><strong>↑ / W:</strong> Accelerate</p>
          <p><strong>↓ / S:</strong> Brake</p>
          <p><strong>← / A:</strong> Steer Left</p>
          <p><strong>→ / D:</strong> Steer Right</p>
          <p><strong>P:</strong> Pause</p>
        </div>
      </div>
      
      {highScore > 0 && (
        <div
          style={{
            fontSize: "24px",
            marginBottom: "20px",
            color: DREAM_NEXUS_COLORS.cyan,
          }}
        >
          High Score: {highScore}m
        </div>
      )}
      
      <button
        onClick={handleStart}
        style={{
          fontSize: "28px",
          padding: "15px 60px",
          backgroundColor: DREAM_NEXUS_COLORS.cyan,
          color: DREAM_NEXUS_COLORS.navy,
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: "bold",
          fontFamily: "monospace",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        START (Press Enter)
      </button>
      
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          fontSize: "14px",
          color: DREAM_NEXUS_COLORS.warm,
        }}
      >
        Sponsored by Dream Nexus
      </div>
    </div>
  );
}
