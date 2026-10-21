import { useEffect, useState } from "react";
import { Volume2, VolumeX, Trophy, Maximize, Minimize, X, Flag } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { TitleScene3D } from "./TitleScene3D";
import { Leaderboard } from "./Leaderboard";
import { audioManager } from "@/lib/audio";
import { isTouchDevice } from "@/lib/input";
import { BigButton, IconButton, UI, panelStyle, useAudioSettings } from "./gameUi";

interface TitleScreenImmersiveProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isFullscreenSupported: boolean;
}

function HowTo({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>
        {emoji}
      </div>
      <div style={{ textAlign: "left", minWidth: 0 }}>
        <div style={{ fontFamily: UI.display, fontSize: 15, color: UI.gold }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, lineHeight: 1.25 }}>{text}</div>
      </div>
    </div>
  );
}

export function TitleScreenImmersive({ isFullscreen, onToggleFullscreen, isFullscreenSupported }: TitleScreenImmersiveProps) {
  const start = useRally((s) => s.start);
  const highScore = useRally((s) => s.highScore);
  const loadHighScore = useRally((s) => s.loadHighScore);
  const playerName = useRally((s) => s.playerName);
  const setPlayerName = useRally((s) => s.setPlayerName);
  const loadPlayerName = useRally((s) => s.loadPlayerName);
  const [nameInput, setNameInput] = useState("");
  const [showBoard, setShowBoard] = useState(false);
  const audio = useAudioSettings();
  const touch = isTouchDevice();

  useEffect(() => {
    loadHighScore();
    loadPlayerName();
    audioManager.playBackgroundMusic();
  }, [loadHighScore, loadPlayerName]);

  useEffect(() => {
    if (playerName) setNameInput(playerName);
  }, [playerName]);

  const handleStart = () => {
    const trimmed = nameInput.trim().slice(0, 20);
    if (trimmed) setPlayerName(trimmed);
    audioManager.unlock();
    start();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !showBoard) handleStart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const controls = touch
    ? [
        { emoji: "👆", title: "STEER", text: "Big ◀ ▶ buttons, bottom left" },
        { emoji: "⚡", title: "NITRO", text: "Fill the ring, tap NITRO to smash through!" },
      ]
    : [
        { emoji: "⌨️", title: "STEER", text: "← → / A D · ↑ faster · ↓ brake" },
        { emoji: "⚡", title: "NITRO", text: "SPACE when full — smash everything!" },
      ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0E1B24",
        color: UI.white,
        zIndex: 1000,
        overflow: "hidden",
        fontFamily: UI.body,
      }}
    >
      <TitleScene3D />

      {/* top bar */}
      <div style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: 12, display: "flex", gap: 10, zIndex: 20 }}>
        <IconButton label="Leaderboard" onClick={() => setShowBoard(true)}>
          <Trophy size={30} strokeWidth={2.5} />
        </IconButton>
        <IconButton label={audio.muted ? "Unmute" : "Mute"} onClick={() => audioManager.toggleMute()} active={audio.muted}>
          {audio.muted ? <VolumeX size={30} strokeWidth={2.5} /> : <Volume2 size={30} strokeWidth={2.5} />}
        </IconButton>
        {isFullscreenSupported && !touch && (
          <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize size={28} strokeWidth={2.5} /> : <Maximize size={28} strokeWidth={2.5} />}
          </IconButton>
        )}
      </div>

      {/* title */}
      <div
        style={{
          position: "absolute",
          top: "max(14px, env(safe-area-inset-top))",
          left: 0,
          right: 0,
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 10,
          padding: "0 80px",
        }}
      >
        <img
          src="/dream-nexus-logo.png"
          alt="Dream Nexus"
          style={{
            width: touch ? "clamp(120px, 40vw, 180px)" : "clamp(150px, 16vw, 230px)",
            height: "auto",
            display: "block",
            margin: "0 auto",
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.9))",
            animation: "dnrFloat 3s ease-in-out infinite",
          }}
        />
        <h1
          style={{
            fontFamily: UI.display,
            fontSize: touch ? "clamp(30px, 9vw, 44px)" : "clamp(30px, 5.2vw, 64px)",
            lineHeight: 1,
            margin: "6px 0 4px",
            color: UI.white,
            textShadow: "0 5px 0 #24A0CE, 0 10px 24px rgba(0,0,0,0.5)",
          }}
        >
          DREAM NEXUS{touch ? <br /> : " "}
          <span style={{ color: UI.gold, textShadow: "0 5px 0 #c8772e, 0 10px 24px rgba(0,0,0,0.5)" }}>RALLY</span>
        </h1>
        <p style={{ margin: 0, fontWeight: 800, fontSize: "clamp(15px, 2vw, 20px)", color: UI.warm, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
          Race Pixel the Bunny through the mountains of Colombia!
        </p>
      </div>

      {/* bottom: name + start + how-to */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "max(14px, env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          width: touch ? "min(520px, calc(100% - 24px))" : "min(980px, calc(100% - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 10,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: touch ? "1fr" : "repeat(4, 1fr)", gap: 8, order: 2 }}>
          {controls.map((c) => (
            <HowTo key={c.title} {...c} />
          ))}
          {!touch && (
            <>
              <HowTo emoji="🍯" title="COLLECT" text="Arequipe jars = points, nitro & combos" />
              <HowTo emoji="🦘" title="JUMP & DODGE" text="Yellow ramps fly · 3 hearts, dodge rocks!" />
            </>
          )}
        </div>

        <div style={{ ...panelStyle, padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch", order: 1, width: "min(620px, 100%)", alignSelf: "center", boxSizing: "border-box" }}>
          <input
            id="player-name-input"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your racer name"
            maxLength={20}
            aria-label="Your racer name"
            autoComplete="off"
            style={{
              flex: "1 1 200px",
              minHeight: 64,
              fontFamily: UI.body,
              fontWeight: 800,
              fontSize: 22,
              padding: "0 18px",
              background: "rgba(255,255,255,0.1)",
              border: `3px solid ${UI.cyanBright}`,
              borderRadius: 16,
              color: UI.white,
              outline: "none",
              textAlign: "center",
            }}
          />
          <BigButton onClick={handleStart} color={UI.gold} style={{ flex: "1 1 200px", animation: "dnrPulse 1.6s ease-in-out infinite" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Flag size={28} strokeWidth={3} /> START RACE
            </span>
          </BigButton>
          {highScore > 0 && (
            <div style={{ width: "100%", textAlign: "center", fontWeight: 800, color: UI.warm, fontSize: 17 }}>
              🏆 Your best: {highScore.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* leaderboard modal */}
      {showBoard && (
        <div
          onClick={() => setShowBoard(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(14,27,36,0.8)",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(480px, 100%)" }}>
            <IconButton label="Close" onClick={() => setShowBoard(false)} size={52} style={{ position: "absolute", top: -18, right: -10, zIndex: 2 }}>
              <X size={28} strokeWidth={3} />
            </IconButton>
            <Leaderboard />
          </div>
        </div>
      )}
    </div>
  );
}
