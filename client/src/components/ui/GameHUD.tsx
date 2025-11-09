import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";

export function GameHUD() {
  const { distance, speed, highScore, collectiblesCount, currentScore, pause } = useRally();
  
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        fontFamily: "monospace",
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          backgroundColor: "rgba(14, 27, 36, 0.8)",
          padding: "15px 20px",
          borderRadius: "10px",
          color: DREAM_NEXUS_COLORS.white,
          fontSize: "18px",
          border: `2px solid ${DREAM_NEXUS_COLORS.cyan}`,
        }}
      >
        <div style={{ marginBottom: "8px", color: DREAM_NEXUS_COLORS.cyan }}>
          <strong>Distance:</strong> {Math.floor(distance)}m
        </div>
        <div style={{ marginBottom: "8px", color: DREAM_NEXUS_COLORS.warm }}>
          <strong>Speed:</strong> {Math.floor(speed)} km/h
        </div>
        <div style={{ marginBottom: "8px", color: DREAM_NEXUS_COLORS.warm }}>
          <strong>Arequipe Jars:</strong> {collectiblesCount}
        </div>
        <div style={{ marginBottom: "8px", color: DREAM_NEXUS_COLORS.cyan }}>
          <strong>Score:</strong> {currentScore}
        </div>
        <div style={{ color: DREAM_NEXUS_COLORS.white }}>
          <strong>High Score:</strong> {highScore}
        </div>
      </div>
      
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={pause}
          style={{
            backgroundColor: DREAM_NEXUS_COLORS.cyan,
            color: DREAM_NEXUS_COLORS.navy,
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          Pause (P)
        </button>
      </div>
      
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "rgba(14, 27, 36, 0.8)",
          padding: "10px 15px",
          borderRadius: "8px",
        }}
      >
        <img
          src="/pixel-bunny.png"
          alt="Pixel"
          style={{ width: "40px", height: "40px", objectFit: "contain" }}
        />
        <img
          src="/dream-nexus-logo.png"
          alt="Dream Nexus"
          style={{ width: "120px", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
