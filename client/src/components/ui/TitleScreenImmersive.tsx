import { asset } from "@/lib/env";
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Trophy, Maximize, Minimize, X, Medal, Car, Map as MapIcon, Pencil, Play, Music } from "lucide-react";
import { AchievementsPanel } from "./AchievementsPanel";
import { useRally } from "@/lib/stores/useRally";
import { useProfile } from "@/lib/stores/useProfile";
import { TitleScene3D } from "./TitleScene3D";
import { Leaderboard } from "./Leaderboard";
import { audioManager } from "@/lib/audio";
import { isTouchDevice } from "@/lib/input";
import { BigButton, IconButton, UI, panelStyle, useAudioSettings, Tricolor, inkText } from "./gameUi";
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

type Screen = "credits" | "home" | "garage" | "map" | "story" | "circuits" | "gp" | "timetrial" | "online" | "achievements" | "leaderboard";

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

/** The main button: the Grand Prix. */
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
        minHeight: short ? 58 : wide ? 84 : 118,
        borderRadius: 22,
        border: `4px solid ${UI.ink}`,
        background: `repeating-linear-gradient(-55deg, rgba(255,255,255,0.16) 0 14px, rgba(255,255,255,0) 14px 28px), linear-gradient(180deg, #ffe45c 0%, ${UI.gold} 55%, #f5a400 100%)`,
        color: UI.ink,
        cursor: "pointer",
        fontFamily: UI.display,
        boxShadow: `0 7px 0 ${UI.ink}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: short ? 38 : 58,
          height: short ? 38 : 58,
          borderRadius: "50%",
          background: UI.flagRed,
          border: `3px solid ${UI.ink}`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 3px 0 ${UI.ink}`,
        }}
      >
        <Play size={short ? 20 : 30} fill="currentColor" />
      </span>
      <span style={{ textAlign: "left", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: short ? 19 : 30, lineHeight: 0.95 }}>GRAND PRIX</span>
        <span style={{ display: short ? "none" : "block", fontFamily: UI.body, fontWeight: 900, fontSize: 14, marginTop: 3 }}>
          3 copas · 8 karts · poderes{best > 0 ? ` · 🏆 ${best}` : ""}
        </span>
      </span>
    </button>
  );
}

/** A mode: a bright sticker, slightly crooked, that straightens and lifts when you point at it. */
function ModeCard({ i, layout, emoji, title, text, extra, onClick, color, dark = false }: { i: number; layout: "tile" | "row" | "full"; emoji: string; title: string; text: string; extra?: string; onClick: () => void; color: string; dark?: boolean }) {
  const short = layout === "tile";
  const row = layout === "row";
  const fg = dark ? UI.white : UI.ink;
  return (
    <button
      type="button"
      className="dnr-in dnr-card"
      onClick={() => press(onClick)}
      style={{
        padding: short ? "6px 4px" : row ? "8px 10px" : "10px 12px 12px",
        cursor: "pointer",
        color: fg,
        fontFamily: UI.body,
        background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%), ${color}`,
        border: `3px solid ${UI.ink}`,
        borderRadius: 20,
        display: "flex",
        flexDirection: row ? "row" : "column",
        justifyContent: "center",
        gap: row ? 10 : short ? 2 : 4,
        alignItems: row ? "center" : short ? "center" : "flex-start",
        textAlign: short ? "center" : "left",
        minWidth: 0,
        boxShadow: `0 6px 0 ${UI.ink}`,
        gridColumn: row && i === 5 ? "1 / -1" : undefined,
        transform: `rotate(${row ? 0 : [-1.4, 1.1, -0.8, 1.5, -1.1][(i - 1) % 5]}deg)`,
        animationDelay: `${0.08 + i * 0.07}s`,
      }}
    >
      <span
        className="dnr-bob"
        style={{ fontSize: short ? 24 : 34, lineHeight: 1, animationDelay: `${i * 0.4}s`, filter: "drop-shadow(0 3px 0 rgba(20,26,46,0.35))" }}
      >
        {emoji}
      </span>
      <span style={{ minWidth: 0, maxWidth: "100%" }}>
        <span style={{ display: "block", fontFamily: UI.display, fontSize: short ? 12 : 17, lineHeight: 1.05 }}>{title}</span>
        {layout === "full" && <span style={{ display: "block", fontSize: 13, fontWeight: 800, lineHeight: 1.2, opacity: 0.92 }}>{text}</span>}
        {extra && !short && (
          <span
            style={{
              display: "inline-block", fontSize: 11, fontWeight: 900, marginTop: 4, padding: "1px 8px", borderRadius: 999, maxWidth: "100%",
              background: UI.ink, color: UI.gold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "top",
            }}
          >
            {extra}
          </span>
        )}
      </span>
    </button>
  );
}

function PillButton({ children, onClick, color = UI.white, short }: { children: React.ReactNode; onClick: () => void; color?: string; short: boolean }) {
  return (
    <button
      type="button"
      className="dnr-press"
      onClick={() => press(onClick)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: short ? "0 14px" : "0 18px",
        minHeight: short ? 40 : 46,
        color: UI.ink,
        background: color,
        cursor: "pointer",
        fontFamily: UI.display,
        fontSize: short ? 13 : 15,
        border: `3px solid ${UI.ink}`,
        borderRadius: 999,
        boxShadow: `0 4px 0 ${UI.ink}`,
      }}
    >
      {children}
    </button>
  );
}

/** Who made the things you see and hear. */
function Credits() {
  const h: React.CSSProperties = { fontFamily: UI.display, fontSize: 15, color: UI.gold, margin: "12px 0 4px" };
  const a: React.CSSProperties = { color: UI.cyanBright, fontWeight: 800 };
  return (
    <div style={{ ...panelStyle, padding: 18, color: UI.white, maxHeight: "min(78vh, 620px)", overflowY: "auto", fontWeight: 700, fontSize: 14, lineHeight: 1.45 }}>
      <Tricolor height={8} radius={4} />
      <div style={{ fontFamily: UI.display, fontSize: 24, marginTop: 10 }}>CRÉDITOS</div>
      <div style={h}>EL JUEGO</div>
      <div>
        Dream Nexus Rally, hecho con cariño por{" "}
        <a href="https://dreamnexus.digital" target="_blank" rel="noreferrer" style={a}>
          dreamnexus.digital
        </a>
      </div>
      <div style={h}>MÚSICA</div>
      <div>
        Kevin MacLeod (
        <a href="https://incompetech.com" target="_blank" rel="noreferrer" style={a}>
          incompetech.com
        </a>
        ), licensed under{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" style={a}>
          Creative Commons: By Attribution 4.0
        </a>
        :
      </div>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
        <li>“Cumbia No Frills” (menú) · “Cumbia No Frills Faster” (Eje Cafetero, Cartagena)</li>
        <li>“No Frills Salsa” (Cali) · “Notanico Merengue” (Tatacoa, Ciudad Perdida)</li>
        <li>“Arroz Con Pollo” (los Andes) · “Peppy Pepe” (Guatapé) · “Latin Industries” (Comuna 13)</li>
      </ul>
      <div style={h}>EFECTOS DE SONIDO</div>
      <div>
        <a href="https://kenney.nl" target="_blank" rel="noreferrer" style={a}>
          Kenney
        </a>{" "}
        (CC0), con efectos sintetizados propios.
      </div>
      <div style={h}>MODELOS 3D</div>
      <div>
        <a href="https://kenney.nl" target="_blank" rel="noreferrer" style={a}>
          Kenney
        </a>{" "}
        y{" "}
        <a href="https://quaternius.com" target="_blank" rel="noreferrer" style={a}>
          Quaternius
        </a>{" "}
        (CC0). Pilotos, objetos y pistas: propios.
      </div>
      <div style={h}>TIPOGRAFÍAS</div>
      <div>Bungee y Nunito (SIL Open Font License).</div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(14,18,40,0.82)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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
    <div style={{ position: "fixed", inset: 0, background: "#2f8fee", color: UI.white, zIndex: 1000, overflow: "hidden", fontFamily: UI.body }}>
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
        <span style={{ fontSize: short ? 26 : 34, lineHeight: 1, background: UI.gold, border: `2px solid ${UI.ink}`, borderRadius: 12, padding: 4 }}>{driverById(driver).emoji}</span>
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
        <div style={{ display: "inline-block", transform: "rotate(-2.5deg)" }}>
          <div
            style={{
              display: "inline-block", fontFamily: UI.display, fontSize: short ? 12 : narrow ? 14 : "clamp(14px, 1.5vw, 20px)", letterSpacing: "0.22em",
              color: UI.ink, background: UI.white, border: `3px solid ${UI.ink}`, borderRadius: 999, padding: short ? "0 12px" : "2px 18px",
              boxShadow: `0 4px 0 ${UI.ink}`, position: "relative", zIndex: 1,
            }}
          >
            DREAM NEXUS
          </div>
          <h1
            className="dnr-shine"
            style={{
              fontFamily: UI.display,
              fontSize: short ? "clamp(34px, 9vw, 54px)" : narrow ? "clamp(58px, 19vw, 92px)" : "clamp(72px, 10vw, 132px)",
              lineHeight: 0.86,
              margin: short ? "-4px 0 0" : "-6px 0 0",
              color: UI.gold,
              WebkitTextStroke: `${short ? 2 : 3}px ${UI.ink}`,
              ...inkText(short ? 4 : 7),
            }}
          >
            RALLY
          </h1>
          <Tricolor height={short ? 6 : 10} radius={6} style={{ border: `3px solid ${UI.ink}`, boxSizing: "content-box", margin: short ? "2px 8px 0" : "6px 12px 0", boxShadow: `0 4px 0 ${UI.ink}` }} />
        </div>
        {!short && (
          <p style={{ margin: "14px 0 0", fontWeight: 900, fontSize: "clamp(14px, 1.8vw, 19px)", color: UI.white, ...inkText(2) }}>
            ¡A toda por Colombia con Pixel y sus amigos!
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
          <ModeCard i={1} layout={short ? "tile" : narrow ? "row" : "full"} emoji="🏎️" title="CARRERA" text="Una carrera, 7 rivales, con poderes" extra="Elige pista y cilindraje" onClick={() => open("circuits")} color={UI.cyanBright} />
          <ModeCard i={2} layout={short ? "tile" : narrow ? "row" : "full"} emoji="⏱️" title="CRONO" text="Contrarreloj: tú contra el reloj" extra="Mejores tiempos" onClick={() => open("timetrial")} color={UI.orange} />
          <ModeCard i={3} layout={short ? "tile" : narrow ? "row" : "full"} emoji="👥" title="AMIGOS" text="Corre con tus amigos en línea" extra="Código de sala" onClick={() => open("online")} color={UI.pink} />
          <ModeCard i={4} layout={short ? "tile" : narrow ? "row" : "full"} emoji="🚔" title="RALLY INFINITO" text="Arcade por toda Colombia" extra={highScore > 0 ? `Récord ${highScore.toLocaleString()}` : "Tombos, huecos, fotomultas"} onClick={startEndless} color={UI.green} />
          <ModeCard i={5} layout={short ? "tile" : narrow ? "row" : "full"} emoji="📖" title="HISTORIA" text={`${CHAPTERS.length} capítulos por Colombia`} extra={`${chaptersDone}/${CHAPTERS.length} · ⭐ ${starCount}`} onClick={() => open("story")} color={UI.blue} dark />
        </div>

        <div className="dnr-in" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", animationDelay: "0.45s" }}>
          <PillButton onClick={() => open("garage")} color={UI.gold} short={short}>
            <Car size={20} /> GARAJE
          </PillButton>
          <PillButton onClick={() => open("map")} short={short}>
            <MapIcon size={20} /> MAPA
          </PillButton>
          <PillButton onClick={() => open("credits")} short={short}>
            <Music size={18} /> CRÉDITOS
          </PillButton>
          {!touch && !short && (
            <span
              style={{
                alignSelf: "center", fontWeight: 800, fontSize: 12.5, marginLeft: 6, padding: "6px 14px", borderRadius: 999,
                background: "rgba(20,26,46,0.78)", border: "2px solid rgba(255,255,255,0.5)",
              }}
            >
              ⌨️ ← → girar · ↑ acelerar · ↓+giro derrape · ESPACIO nitro · E poder · B mirar atrás
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
      {screen === "credits" && (
        <Modal onClose={() => setScreen("home")}>
          <Credits />
        </Modal>
      )}
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
