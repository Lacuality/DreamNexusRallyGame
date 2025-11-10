import { useEffect, useState } from "react";
import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { TitleScene3D } from "./TitleScene3D";
import { HolographicPanel } from "./HolographicPanel";
import { Leaderboard } from "./Leaderboard";
import { FullscreenButton } from "./FullscreenButton";
import { useFullscreen } from "@/hooks/useFullscreen";

export function TitleScreenImmersive() {
  const { start, highScore, loadHighScore, playerName, setPlayerName, loadPlayerName } = useRally();
  const [nameInput, setNameInput] = useState("");
  const { elementRef, isFullscreen, toggle, isSupported } = useFullscreen();

  useEffect(() => {
    loadHighScore();
    loadPlayerName();
  }, [loadHighScore, loadPlayerName]);

  useEffect(() => {
    if (playerName) setNameInput(playerName);
  }, [playerName]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  const handleStart = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setPlayerName(trimmed);
      start();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleStart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nameInput]);

  return (
    <div
      ref={elementRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        color: DREAM_NEXUS_COLORS.white,
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <TitleScene3D />

      <FullscreenButton isFullscreen={isFullscreen} onClick={toggle} isSupported={isSupported} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Title - Top Center */}
        <div style={{ 
          position: "absolute", 
          top: "20px", 
          left: "50%", 
          transform: "translateX(-50%)", 
          textAlign: "center",
          pointerEvents: "none",
        }}>
          <img
            src="/dream-nexus-logo.png"
            alt="Dream Nexus"
            style={{
              width: "clamp(120px, 15vw, 180px)",
              height: "auto",
              display: "block",
              margin: "0 auto 8px",
              filter: "drop-shadow(0 0 20px rgba(36, 160, 206, 0.5))",
              animation: "logoFloat 3s ease-in-out infinite",
            }}
          />
          <h1
            style={{
              fontFamily: "monospace",
              fontSize: "clamp(24px, 3.5vw, 40px)",
              letterSpacing: "0.05em",
              color: DREAM_NEXUS_COLORS.cyan,
              margin: "0 0 6px",
              textShadow: "0 0 20px rgba(36, 160, 206, 0.6)",
              animation: "textGlow 2s ease-in-out infinite alternate",
            }}
          >
            DREAM NEXUS RALLY
          </h1>
          <p
            style={{
              fontSize: "clamp(12px, 1.5vw, 16px)",
              color: DREAM_NEXUS_COLORS.warm,
              margin: 0,
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            Race with <strong>Pixel the Bunny</strong> through Colombia!
          </p>
        </div>

        {/* Controls - Bottom Left */}
        <div style={{ 
          position: "absolute", 
          bottom: "20px", 
          left: "20px",
          maxWidth: "300px",
          pointerEvents: "auto",
        }}>
          <HolographicPanel>
            <h3
              style={{
                margin: 0,
                marginBottom: "0.8em",
                fontFamily: "monospace",
                color: DREAM_NEXUS_COLORS.cyan,
                fontSize: "clamp(14px, 1.8vw, 18px)",
              }}
              aria-label="Game Controls"
            >
              🎮 Controls
            </h3>
            <div 
              style={{ display: "grid", gap: "6px", fontSize: "clamp(12px, 1.5vw, 14px)" }}
              role="list"
              aria-label="Keyboard controls for the game"
            >
              <ControlRow left="↑ / W" right="Accelerate" />
              <ControlRow left="↓ / S" right="Brake" />
              <ControlRow left="← / A" right="Steer Left" />
              <ControlRow left="→ / D" right="Steer Right" />
              <ControlRow left="P" right="Pause" />
            </div>
          </HolographicPanel>
        </div>

        {/* Leaderboard - Top Right */}
        <div style={{ 
          position: "absolute", 
          top: "20px", 
          right: "20px",
          maxWidth: "320px",
          pointerEvents: "auto",
        }}>
          <HolographicPanel>
            <Leaderboard />
          </HolographicPanel>
        </div>

        {/* Name Input & Start Button - Bottom Center */}
        <div style={{ 
          position: "absolute", 
          bottom: "20px", 
          left: "50%", 
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          pointerEvents: "auto",
        }}>
          <HolographicPanel
            style={{
              maxWidth: "400px",
              width: "100%",
            }}
          >
            <label
              htmlFor="player-name-input"
              style={{
                display: "block",
                fontFamily: "monospace",
                color: DREAM_NEXUS_COLORS.cyan,
                fontSize: "clamp(14px, 1.8vw, 16px)",
                marginBottom: "10px",
                textAlign: "center",
                textShadow: "0 0 10px rgba(36, 160, 206, 0.5)",
              }}
            >
              🏁 Enter Your Name
            </label>
            <input
              id="player-name-input"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Racer Name"
              maxLength={20}
              aria-label="Enter your racer name"
              aria-required="true"
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: "clamp(14px, 1.8vw, 16px)",
                padding: "10px 14px",
                background: "rgba(36, 160, 206, 0.1)",
                border: `2px solid ${DREAM_NEXUS_COLORS.cyan}`,
                borderRadius: "10px",
                color: DREAM_NEXUS_COLORS.white,
                textAlign: "center",
                outline: "none",
                boxShadow: "inset 0 2px 10px rgba(0,0,0,0.3)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(36, 160, 206, 0.2)";
                e.currentTarget.style.borderColor = "#5dd6ff";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(36, 160, 206, 0.4), inset 0 2px 10px rgba(0,0,0,0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(36, 160, 206, 0.1)";
                e.currentTarget.style.borderColor = DREAM_NEXUS_COLORS.cyan;
                e.currentTarget.style.boxShadow = "inset 0 2px 10px rgba(0,0,0,0.3)";
              }}
            />
            
            {highScore > 0 && (
              <div
                style={{
                  fontSize: "clamp(12px, 1.5vw, 14px)",
                  color: DREAM_NEXUS_COLORS.warm,
                  marginTop: "10px",
                  textAlign: "center",
                }}
              >
                Your Best: {highScore}m
              </div>
            )}
          </HolographicPanel>

          <button
            onClick={handleStart}
            disabled={!nameInput.trim()}
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "clamp(16px, 2.2vw, 22px)",
              padding: "clamp(12px, 1.8vw, 16px) clamp(36px, 5vw, 56px)",
              background: nameInput.trim()
                ? `linear-gradient(135deg, ${DREAM_NEXUS_COLORS.cyan}, #5dd6ff)`
                : "rgba(100,100,100,0.4)",
              color: nameInput.trim() ? DREAM_NEXUS_COLORS.navy : "rgba(255,255,255,0.4)",
              border: nameInput.trim() ? `2px solid #5dd6ff` : "2px solid rgba(150,150,150,0.3)",
              borderRadius: "14px",
              cursor: nameInput.trim() ? "pointer" : "not-allowed",
              boxShadow: nameInput.trim()
                ? "0 0 30px rgba(36, 160, 206, 0.6), 0 10px 25px rgba(0,0,0,0.4)"
                : "none",
              transform: "translateZ(0)",
              transition: "all 0.3s ease",
              opacity: nameInput.trim() ? 1 : 0.5,
              textShadow: nameInput.trim() ? "0 2px 5px rgba(0,0,0,0.3)" : "none",
            }}
            onMouseEnter={(e) => {
              if (nameInput.trim()) {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.05)";
                e.currentTarget.style.boxShadow = "0 0 40px rgba(36, 160, 206, 0.8), 0 15px 30px rgba(0,0,0,0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (nameInput.trim()) {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(36, 160, 206, 0.6), 0 10px 25px rgba(0,0,0,0.4)";
              }
            }}
          >
            🚀 START RACE
          </button>

          <div
            style={{
              fontSize: "clamp(10px, 1.3vw, 12px)",
              color: DREAM_NEXUS_COLORS.warm,
              opacity: 0.8,
              textAlign: "center",
            }}
          >
            Press Enter to Start • Sponsored by Dream Nexus
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hologramScan {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes textGlow {
          from { text-shadow: 0 0 20px rgba(36, 160, 206, 0.6); }
          to { text-shadow: 0 0 30px rgba(36, 160, 206, 0.9), 0 0 40px rgba(36, 160, 206, 0.5); }
        }
      `}</style>
    </div>
  );
}

function ControlRow({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(6ch, auto) 1fr",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <span style={{ color: DREAM_NEXUS_COLORS.cyan, fontWeight: "bold" }}>{left}</span>
      <span style={{ color: "rgba(255,255,255,0.85)" }}>{right}</span>
    </div>
  );
}
