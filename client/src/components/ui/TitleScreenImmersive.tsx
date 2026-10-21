import { asset } from "@/lib/env";
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Trophy, Maximize, Minimize, X, Medal, Car, Map as MapIcon } from "lucide-react";
import { AchievementsPanel } from "./AchievementsPanel";
import { useRally } from "@/lib/stores/useRally";
import { useProfile } from "@/lib/stores/useProfile";
import { TitleScene3D } from "./TitleScene3D";
import { Leaderboard } from "./Leaderboard";
import { audioManager } from "@/lib/audio";
import { isTouchDevice } from "@/lib/input";
import { BigButton, IconButton, UI, panelStyle, useAudioSettings } from "./gameUi";
import { Garage } from "./menus/Garage";
import { ColombiaMap } from "./menus/ColombiaMap";
import { CircuitSelect } from "./menus/CircuitSelect";
import { OnlineLobby } from "./menus/OnlineLobby";
import { StoryDialog } from "./menus/StoryDialog";
import { CHAPTERS, chapterById } from "@/lib/game/story";
import { circuitById } from "@/lib/game/circuits";
import { driverById } from "@/lib/game/garage";

interface TitleScreenImmersiveProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isFullscreenSupported: boolean;
}

type Screen = "home" | "garage" | "map" | "story" | "circuits" | "online" | "achievements" | "leaderboard";

function ModeCard({ emoji, title, text, extra, onClick, color }: { emoji: string; title: string; text: string; extra?: string; onClick: () => void; color: string }) {
  const compact = isTouchDevice();
  return (
    <button
      type="button"
      className="dnr-press"
      onClick={() => {
        audioManager.unlock();
        audioManager.playClick();
        onClick();
      }}
      style={{
        ...panelStyle,
        textAlign: "left",
        padding: compact ? "10px 10px" : "12px 14px",
        cursor: "pointer",
        color: UI.white,
        fontFamily: UI.body,
        borderColor: color,
        borderWidth: 3,
        display: "flex",
        gap: 10,
        alignItems: "center",
        minWidth: 0,
        boxShadow: `0 6px 0 rgba(0,0,0,0.35), 0 0 22px ${color}55`,
      }}
    >
      <span style={{ fontSize: compact ? 30 : 38, lineHeight: 1 }}>{emoji}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: UI.display, fontSize: 17, color }}>{title}</span>
        {!compact && <span style={{ display: "block", fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{text}</span>}
        {extra && <span style={{ display: "block", fontSize: 12, fontWeight: 900, color: UI.gold, marginTop: 2 }}>{extra}</span>}
      </span>
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(14,27,36,0.8)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(520px, 100%)" }}>
        <IconButton label="Close" onClick={onClose} size={52} style={{ position: "absolute", top: -18, right: -10, zIndex: 2 }}>
          <X size={28} strokeWidth={3} />
        </IconButton>
        {children}
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
  const wallet = useProfile((s) => s.wallet);
  const story = useProfile((s) => s.story);
  const driver = useProfile((s) => s.driver);
  const [nameInput, setNameInput] = useState("");
  const [screen, setScreen] = useState<Screen>("home");
  const [dialog, setDialog] = useState<string | null>(null);
  const audio = useAudioSettings();
  const touch = isTouchDevice();

  useEffect(() => {
    loadHighScore();
    loadPlayerName();
    audioManager.setMusicTheme("default");
    audioManager.playBackgroundMusic();
  }, [loadHighScore, loadPlayerName]);

  useEffect(() => {
    if (playerName) setNameInput(playerName);
  }, [playerName]);

  const saveName = () => {
    const trimmed = nameInput.trim().slice(0, 20);
    if (trimmed && trimmed !== playerName) setPlayerName(trimmed);
  };
  const open = (s: Screen) => {
    saveName();
    setScreen(s);
  };

  const startEndless = () => {
    saveName();
    audioManager.unlock();
    start({ mode: "endless" });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && screen === "home" && !dialog) startEndless();
      if (e.key === "Escape" && screen !== "home") setScreen("home");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const starCount = CHAPTERS.reduce((n, c) => n + (story[c.id] ?? 0), 0);
  const chaptersDone = CHAPTERS.filter((c) => (story[c.id] ?? 0) > 0).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0E1B24", color: UI.white, zIndex: 1000, overflow: "hidden", fontFamily: UI.body }}>
      <TitleScene3D />

      {/* top bar */}
      <div style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: 12, display: "flex", gap: 8, zIndex: 20 }}>
        <IconButton label="Achievements" onClick={() => open("achievements")} size={touch ? 50 : 56}>
          <Medal size={28} strokeWidth={2.5} />
        </IconButton>
        <IconButton label="Leaderboard" onClick={() => open("leaderboard")} size={touch ? 50 : 56}>
          <Trophy size={28} strokeWidth={2.5} />
        </IconButton>
        <IconButton label={audio.muted ? "Unmute" : "Mute"} onClick={() => audioManager.toggleMute()} active={audio.muted} size={touch ? 50 : 56}>
          {audio.muted ? <VolumeX size={28} strokeWidth={2.5} /> : <Volume2 size={28} strokeWidth={2.5} />}
        </IconButton>
        {isFullscreenSupported && !touch && (
          <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize size={28} strokeWidth={2.5} /> : <Maximize size={28} strokeWidth={2.5} />}
          </IconButton>
        )}
      </div>

      {/* title */}
      <div style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", left: 0, right: 0, textAlign: "center", pointerEvents: "none", zIndex: 10, padding: touch ? "0 12px" : "0 80px" }}>
        <img
          src={asset("/dream-nexus-logo.png")}
          alt="Dream Nexus"
          style={{
            width: touch ? "clamp(110px, 34vw, 160px)" : "clamp(140px, 14vw, 210px)",
            height: "auto",
            display: "block",
            margin: touch ? "60px auto 0" : "0 auto",
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.9))",
            animation: "dnrFloat 3s ease-in-out infinite",
          }}
        />
        <h1 style={{ fontFamily: UI.display, fontSize: touch ? "clamp(28px, 9vw, 40px)" : "clamp(30px, 5vw, 60px)", lineHeight: 1, margin: "4px 0 2px", color: UI.white, textShadow: "0 5px 0 #24A0CE, 0 10px 24px rgba(0,0,0,0.5)" }}>
          DREAM NEXUS{touch ? <br /> : " "}
          <span style={{ color: UI.gold, textShadow: "0 5px 0 #c8772e, 0 10px 24px rgba(0,0,0,0.5)" }}>RALLY</span>
        </h1>
        <p style={{ margin: 0, fontWeight: 800, fontSize: "clamp(14px, 1.8vw, 19px)", color: UI.warm, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
          ¡Rally por toda Colombia con Pixel y sus amigos!
        </p>
      </div>

      {/* bottom: name, garage, modes */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "max(12px, env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          width: touch ? "min(560px, calc(100% - 20px))" : "min(980px, calc(100% - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 10,
        }}
      >
        <div style={{ ...panelStyle, padding: 10, display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
          <input
            id="player-name-input"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveName}
            placeholder="Your racer name"
            maxLength={20}
            aria-label="Your racer name"
            autoComplete="off"
            style={{
              flex: "1 1 160px",
              minHeight: 54,
              minWidth: 0,
              fontFamily: UI.body,
              fontWeight: 800,
              fontSize: 20,
              padding: "0 14px",
              background: "rgba(255,255,255,0.1)",
              border: `3px solid ${UI.cyanBright}`,
              borderRadius: 14,
              color: UI.white,
              outline: "none",
              textAlign: "center",
            }}
          />
          <button
            type="button"
            className="dnr-press"
            onClick={() => open("garage")}
            style={{ ...panelStyle, flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", minHeight: 54, color: UI.white, cursor: "pointer", fontFamily: UI.display, fontSize: 16, borderColor: UI.gold }}
          >
            <span style={{ fontSize: 26 }}>{driverById(driver).emoji}</span> <Car size={22} /> GARAGE
          </button>
          <button
            type="button"
            className="dnr-press"
            onClick={() => open("map")}
            style={{ ...panelStyle, flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", minHeight: 54, color: UI.white, cursor: "pointer", fontFamily: UI.display, fontSize: 16 }}
          >
            <MapIcon size={22} /> MAPA
          </button>
          <div style={{ ...panelStyle, flex: "0 0 auto", display: "flex", alignItems: "center", padding: "0 14px", minHeight: 54, fontFamily: UI.display, fontSize: 18, color: UI.gold }} title="Arequipe jars">
            🍯 {wallet.toLocaleString()}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: touch ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8 }}>
          <ModeCard emoji="🏁" title="RALLY INFINITO" text="Drive across all of Colombia. How far can you go?" extra={highScore > 0 ? `Best ${highScore.toLocaleString()}` : "Press Enter"} onClick={startEndless} color={UI.gold} />
          <ModeCard emoji="📖" title="MODO HISTORIA" text="La Ruta de Pixel: 7 chapters to Cartagena" extra={`${chaptersDone}/7 · ⭐ ${starCount}`} onClick={() => open("story")} color="#7bd389" />
          <ModeCard emoji="🏎️" title="CIRCUITO" text="3 laps vs 5 rivals on real circuits" extra="Win jars & best laps" onClick={() => open("circuits")} color={UI.cyanBright} />
          <ModeCard emoji="👥" title="CON AMIGOS" text="Race your friends live with a room code" extra="Online" onClick={() => open("online")} color="#ff4f9a" />
        </div>
        {!touch && (
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, opacity: 0.85, textShadow: "0 1px 4px #000" }}>
            ⌨️ ← → steer · ↑ faster · ↓ brake · SPACE nitro · P pause &nbsp;·&nbsp; made by{" "}
            <a href="https://dreamnexus.digital" target="_blank" rel="noreferrer" style={{ color: UI.cyanBright }}>
              dreamnexus.digital
            </a>
          </div>
        )}
      </div>

      {screen === "garage" && <Garage onClose={() => setScreen("home")} />}
      {(screen === "map" || screen === "story") && (
        <ColombiaMap
          mode={screen === "story" ? "story" : "atlas"}
          onClose={() => setScreen("home")}
          onPlayChapter={(id) => {
            setScreen("home");
            setDialog(id);
          }}
        />
      )}
      {screen === "circuits" && (
        <CircuitSelect
          onClose={() => setScreen("home")}
          onRace={(id) => {
            audioManager.unlock();
            const c = circuitById(id);
            start({ mode: "circuit", circuitId: c.id, laps: c.laps });
          }}
        />
      )}
      {screen === "online" && <OnlineLobby onClose={() => setScreen("home")} />}
      {screen === "achievements" && (
        <Modal onClose={() => setScreen("home")}>
          <AchievementsPanel />
        </Modal>
      )}
      {screen === "leaderboard" && (
        <Modal onClose={() => setScreen("home")}>
          <Leaderboard />
        </Modal>
      )}
      {dialog && (
        <StoryDialog
          title={chapterById(dialog).title}
          subtitle={`CHAPTER ${chapterById(dialog).num} · ${chapterById(dialog).region}`}
          lines={chapterById(dialog).intro}
          onDone={() => {
            const id = dialog;
            setDialog(null);
            audioManager.unlock();
            start({ mode: "story", chapterId: id });
          }}
        />
      )}
    </div>
  );
}
