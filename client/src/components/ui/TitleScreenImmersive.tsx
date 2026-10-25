import { asset } from "@/lib/env";
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Trophy, Maximize, Minimize, X, Medal, Car, Map as MapIcon, Pencil, Play } from "lucide-react";
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
import { CupSelect } from "./menus/CupSelect";
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

type Screen = "home" | "garage" | "map" | "story" | "circuits" | "gp" | "timetrial" | "online" | "achievements" | "leaderboard";

/** Phone in landscape (short) or portrait (narrow)? Updates on rotate/resize. */
function useViewport() {
  const read = () => ({ narrow: window.innerWidth < 760, short: window.innerHeight < 520 });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return v;
}

function press(fn: () => void) {
  audioManager.unlock();
  audioManager.playClick();
  fn();
}

/** The main button: jump straight into the endless rally. */
function PlayCard({ short, wide, best, onClick }: { short: boolean; wide: boolean; best: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="dnr-press dnr-in dnr-play"
      onClick={() => press(onClick)}
      style={{
        gridColumn: wide ? "1 / -1" : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: short ? 8 : 14,
        padding: short ? "8px 8px" : "14px 18px",
        minHeight: short ? 58 : wide ? 84 : 112,
        borderRadius: 20,
        border: "3px solid #fff3b0",
        background: "linear-gradient(135deg, #ffd23f 0%, #ff9f43 100%)",
        color: UI.navy,
        cursor: "pointer",
        fontFamily: UI.display,
        boxShadow: "0 7px 0 #b8641c, 0 12px 30px rgba(255,159,67,0.45)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: short ? 36 : 54,
          height: short ? 36 : 54,
          borderRadius: "50%",
          background: UI.navy,
          color: UI.gold,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Play size={short ? 22 : 30} fill="currentColor" />
      </span>
      <span style={{ textAlign: "left", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: short ? 19 : 28, lineHeight: 1 }}>GRAND PRIX</span>
        <span style={{ display: short ? "none" : "block", fontFamily: UI.body, fontWeight: 900, fontSize: short ? 12 : 14 }}>
          Cups · 8 karts · items{best > 0 ? ` · 🏆 ${best}` : " · Enter ↵"}
        </span>
      </span>
    </button>
  );
}

function ModeCard({ i, layout, emoji, title, text, extra, onClick, color }: { i: number; layout: "tile" | "row" | "full"; emoji: string; title: string; text: string; extra?: string; onClick: () => void; color: string }) {
  const short = layout === "tile";
  const row = layout === "row";
  return (
    <button
      type="button"
      className="dnr-press dnr-in dnr-lift"
      onClick={() => press(onClick)}
      style={{
        ...panelStyle,
        padding: short ? "6px 4px" : row ? "8px 10px" : "10px 12px",
        cursor: "pointer",
        color: UI.white,
        fontFamily: UI.body,
        borderColor: color,
        borderWidth: 3,
        display: "flex",
        flexDirection: row ? "row" : "column",
        justifyContent: "center",
        gap: row ? 10 : short ? 2 : 4,
        alignItems: row ? "center" : short ? "center" : "flex-start",
        textAlign: short ? "center" : "left",
        minWidth: 0,
        boxShadow: `0 6px 0 rgba(0,0,0,0.35), 0 0 22px ${color}44`,
        animationDelay: `${0.08 + i * 0.07}s`,
      }}
    >
      <span className="dnr-bob" style={{ fontSize: short ? 24 : 32, lineHeight: 1, animationDelay: `${i * 0.4}s` }}>{emoji}</span>
      <span style={{ minWidth: 0, maxWidth: "100%" }}>
        <span style={{ display: "block", fontFamily: UI.display, fontSize: short ? 12 : 16, lineHeight: 1.1, color }}>{title}</span>
        {layout === "full" && <span style={{ display: "block", fontSize: 13, fontWeight: 700, lineHeight: 1.2, opacity: 0.9 }}>{text}</span>}
        {extra && !short && <span style={{ display: "block", fontSize: 12, fontWeight: 900, color: UI.gold, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{extra}</span>}
      </span>
    </button>
  );
}

function PillButton({ children, onClick, color = UI.cyanBright, short }: { children: React.ReactNode; onClick: () => void; color?: string; short: boolean }) {
  return (
    <button
      type="button"
      className="dnr-press"
      onClick={() => press(onClick)}
      style={{
        ...panelStyle,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: short ? "0 14px" : "0 18px",
        minHeight: short ? 40 : 48,
        color: UI.white,
        cursor: "pointer",
        fontFamily: UI.display,
        fontSize: short ? 14 : 16,
        borderColor: color,
        borderRadius: 999,
      }}
    >
      {children}
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
  const [editingName, setEditingName] = useState(false);
  const { narrow, short } = useViewport();
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
  const startCup = useRally((s) => s.startCup);
  const trophies = useProfile((s) => s.trophies);
  const trophyCount = Object.keys(trophies).length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && screen === "home" && !dialog && !editingName) open("gp");
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

      {/* profile chip (top-left): your driver + name, tap to rename */}
      <button
        type="button"
        className="dnr-press dnr-in"
        onClick={() => setEditingName(true)}
        style={{
          ...panelStyle,
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top))",
          left: 12,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: short ? "4px 12px 4px 6px" : "6px 14px 6px 8px",
          color: UI.white,
          cursor: "pointer",
          maxWidth: "min(46vw, 320px)",
          animationDelay: "0.05s",
        }}
        aria-label="Change your racer name"
      >
        <span style={{ fontSize: short ? 26 : 34, lineHeight: 1, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 4 }}>{driverById(driver).emoji}</span>
        <span style={{ minWidth: 0, textAlign: "left" }}>
          <span style={{ display: "block", fontFamily: UI.display, fontSize: short ? 14 : 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {playerName || "Tu nombre"} <Pencil size={13} style={{ display: "inline", verticalAlign: "-1px", opacity: 0.7 }} />
          </span>
          <span style={{ display: "block", fontWeight: 900, fontSize: 13, color: UI.gold }}>🍯 {wallet.toLocaleString()}</span>
        </span>
      </button>

      {/* title */}
      <div
        className="dnr-title"
        style={{
          position: "absolute",
          top: short ? "max(8px, env(safe-area-inset-top))" : narrow ? "calc(max(12px, env(safe-area-inset-top)) + 64px)" : "max(14px, env(safe-area-inset-top))",
          left: 0,
          right: 0,
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 10,
          padding: "0 12px",
        }}
      >
        {!short && (
          <img
            src={asset("/dream-nexus-logo.png")}
            alt="Dream Nexus"
            style={{
              width: narrow ? "clamp(100px, 30vw, 150px)" : "clamp(130px, 12vw, 190px)",
              height: "auto",
              display: "block",
              margin: "0 auto",
              filter: "drop-shadow(0 0 10px rgba(255,255,255,0.9))",
              animation: "dnrFloat 3s ease-in-out infinite",
            }}
          />
        )}
        <h1
          style={{
            fontFamily: UI.display,
            fontSize: short ? "clamp(22px, 5vw, 34px)" : narrow ? "clamp(30px, 10vw, 44px)" : "clamp(34px, 5vw, 64px)",
            lineHeight: 1,
            margin: "2px 0",
            color: UI.white,
            textShadow: "0 5px 0 #24A0CE, 0 10px 24px rgba(0,0,0,0.5)",
          }}
        >
          DREAM NEXUS{narrow ? <br /> : " "}
          <span className="dnr-shine" style={{ color: UI.gold, textShadow: "0 5px 0 #c8772e, 0 10px 24px rgba(0,0,0,0.5)" }}>
            RALLY
          </span>
        </h1>
        {!short && (
          <p style={{ margin: 0, fontWeight: 800, fontSize: "clamp(14px, 1.8vw, 19px)", color: UI.warm, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
            ¡Rally por toda Colombia con Pixel y sus amigos!
          </p>
        )}
      </div>

      {/* bottom: big PLAY, the other modes, then garage / map */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "max(10px, env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          width: narrow ? "min(560px, calc(100% - 20px))" : "min(1040px, calc(100% - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: short ? 6 : 10,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: short ? "1.4fr repeat(5, minmax(0, 1fr))" : narrow ? "1fr 1fr" : "1.6fr repeat(5, 1fr)",
            gap: short ? 6 : 8,
          }}
        >
          <PlayCard short={short} wide={narrow && !short} best={trophyCount} onClick={() => open("gp")} />
          <ModeCard i={1} layout={short ? "tile" : narrow ? "row" : "full"} emoji="🏎️" title="CARRERA" text="One race, 7 rivals, items on" extra="Pick circuit & class" onClick={() => open("circuits")} color={UI.cyanBright} />
          <ModeCard i={2} layout={short ? "tile" : narrow ? "row" : "full"} emoji="⏱️" title="CRONO" text="Time trial: you vs the clock" extra="Best times" onClick={() => open("timetrial")} color={UI.orange} />
          <ModeCard i={3} layout={short ? "tile" : narrow ? "row" : "full"} emoji="👥" title="AMIGOS" text="Race friends online" extra="Room code" onClick={() => open("online")} color="#ff4f9a" />
          <ModeCard i={4} layout={short ? "tile" : narrow ? "row" : "full"} emoji="🏁" title="RALLY INFINITO" text="Arcade run across Colombia" extra={highScore > 0 ? `Best ${highScore.toLocaleString()}` : "Tombos, huecos, fotomultas"} onClick={startEndless} color={UI.gold} />
          <ModeCard i={5} layout={short ? "tile" : narrow ? "row" : "full"} emoji="📖" title="HISTORIA" text={`${CHAPTERS.length} chapters across Colombia`} extra={`${chaptersDone}/${CHAPTERS.length} · ⭐ ${starCount}`} onClick={() => open("story")} color="#7bd389" />
        </div>

        <div className="dnr-in" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", animationDelay: "0.45s" }}>
          <PillButton onClick={() => open("garage")} color={UI.gold} short={short}>
            <Car size={20} /> GARAGE
          </PillButton>
          <PillButton onClick={() => open("map")} short={short}>
            <MapIcon size={20} /> MAPA
          </PillButton>
          {!touch && !short && (
            <span style={{ alignSelf: "center", fontWeight: 800, fontSize: 13, opacity: 0.85, textShadow: "0 1px 4px #000", marginLeft: 8 }}>
              ⌨️ ← → steer · ↑ faster · ↓ brake · ↓+← → drift · SPACE nitro · E item · B look back · by{" "}
              <a href="https://dreamnexus.digital" target="_blank" rel="noreferrer" style={{ color: UI.cyanBright }}>
                dreamnexus.digital
              </a>
            </span>
          )}
        </div>
      </div>

      {editingName && (
        <Modal onClose={() => { saveName(); setEditingName(false); }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
              setEditingName(false);
            }}
            style={{ ...panelStyle, padding: 18, display: "flex", flexDirection: "column", gap: 12, color: UI.white }}
          >
            <div style={{ fontFamily: UI.display, fontSize: 22, color: UI.cyanBright }}>¿Cómo te llamas?</div>
            <div style={{ fontWeight: 700, opacity: 0.85 }}>Your name shows on the leaderboard and to friends online.</div>
            <input
              id="player-name-input"
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your racer name"
              maxLength={20}
              aria-label="Your racer name"
              autoComplete="off"
              style={{
                minHeight: 56,
                fontFamily: UI.body,
                fontWeight: 800,
                fontSize: 22,
                padding: "0 14px",
                background: "rgba(255,255,255,0.1)",
                border: `3px solid ${UI.cyanBright}`,
                borderRadius: 14,
                color: UI.white,
                outline: "none",
                textAlign: "center",
              }}
            />
            <BigButton onClick={() => { saveName(); setEditingName(false); }} color={UI.gold}>
              ¡LISTO!
            </BigButton>
          </form>
        </Modal>
      )}

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
      {screen === "gp" && (
        <CupSelect
          onClose={() => setScreen("home")}
          onStart={(cupId, cc) => {
            saveName();
            audioManager.unlock();
            startCup(cupId, cc);
          }}
        />
      )}
      {screen === "circuits" && (
        <CircuitSelect
          classes
          onClose={() => setScreen("home")}
          onRace={(id, cc) => {
            audioManager.unlock();
            const c = circuitById(id);
            start({ mode: "circuit", circuitId: c.id, laps: c.laps, cc });
          }}
        />
      )}
      {screen === "timetrial" && (
        <CircuitSelect
          title="⏱️ Contrarreloj"
          timeTrial
          onClose={() => setScreen("home")}
          onRace={(id) => {
            audioManager.unlock();
            const c = circuitById(id);
            start({ mode: "timetrial", circuitId: c.id, laps: c.laps });
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
