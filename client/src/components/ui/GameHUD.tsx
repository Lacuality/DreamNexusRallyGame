import { useEffect, useRef } from "react";
import { Pause, Volume2, VolumeX, Maximize, Minimize, Heart, Shield, Zap } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { MAX_HEARTS, run } from "@/lib/game/run";
import { audioManager } from "@/lib/audio";
import { isTouchDevice } from "@/lib/input";
import { IconButton, UI, panelStyle, useAudioSettings } from "./gameUi";

interface GameHUDProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function GameHUD({ isFullscreen = false, onToggleFullscreen }: GameHUDProps) {
  const hud = useRally((s) => s.hud);
  const phase = useRally((s) => s.phase);
  const countdown = useRally((s) => s.countdown);
  const popups = useRally((s) => s.popups);
  const banner = useRally((s) => s.banner);
  const highScore = useRally((s) => s.highScore);
  const pause = useRally((s) => s.pause);
  const audio = useAudioSettings();
  const touch = isTouchDevice();
  const flashRef = useRef<HTMLDivElement>(null);

  // red hit flash + nitro tint driven straight from the live run state
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (flashRef.current) {
        flashRef.current.style.opacity = String(run.flash * 0.75);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const iconSize = touch ? 30 : 28;
  const btn = touch ? 58 : 60;
  const nitroReady = hud.nitro >= 1 && !hud.nitroActive;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        fontFamily: UI.body,
        color: UI.white,
        zIndex: 100,
        userSelect: "none",
      }}
    >
      {/* hit flash */}
      <div
        ref={flashRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          background: "radial-gradient(ellipse at center, rgba(255,0,0,0) 40%, rgba(255,30,30,0.9) 100%)",
        }}
      />
      {hud.nitroActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(255,140,40,0.35) 100%)",
          }}
        />
      )}

      {/* ---- top left: score ---- */}
      <div
        style={{
          ...panelStyle,
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top))",
          left: 12,
          padding: touch ? "8px 14px" : "10px 18px",
          minWidth: touch ? 130 : 180,
        }}
      >
        <div style={{ fontSize: touch ? 12 : 14, fontWeight: 800, color: UI.warm, letterSpacing: "0.12em" }}>SCORE</div>
        <div style={{ fontFamily: UI.display, fontSize: touch ? 28 : 40, lineHeight: 1.05, color: UI.gold, textShadow: "0 3px 0 rgba(0,0,0,0.4)" }}>
          {hud.score.toLocaleString()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span
            style={{
              fontFamily: UI.display,
              fontSize: touch ? 16 : 20,
              padding: "1px 10px",
              borderRadius: 10,
              background: hud.multiplier > 1 ? UI.orange : "rgba(255,255,255,0.15)",
              color: hud.multiplier > 1 ? UI.navy : UI.white,
              animation: hud.multiplier > 1 ? "dnrPulse 0.6s ease-in-out infinite" : "none",
            }}
          >
            x{hud.multiplier}
          </span>
          {hud.combo > 0 && (
            <span style={{ fontWeight: 800, fontSize: touch ? 13 : 15, color: UI.warm }}>{hud.combo} combo</span>
          )}
        </div>
        {!touch && (
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4, fontWeight: 700 }}>Best {Math.max(highScore, hud.score).toLocaleString()}</div>
        )}
      </div>

      {/* ---- top centre: hearts + shield ---- */}
      <div
        style={{
          position: "absolute",
          top: "max(14px, env(safe-area-inset-top))",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: touch ? 4 : 8,
          alignItems: "center",
        }}
      >
        {Array.from({ length: MAX_HEARTS }).map((_, i) => (
          <Heart
            key={`${i}-${hud.hearts > i}`}
            size={touch ? 32 : 42}
            strokeWidth={2.5}
            color={hud.hearts > i ? "#ff3d6e" : "rgba(255,255,255,0.5)"}
            fill={hud.hearts > i ? "#ff3d6e" : "rgba(0,0,0,0.35)"}
            style={{ filter: "drop-shadow(0 3px 0 rgba(0,0,0,0.4))", animation: "dnrHeart 0.4s ease-out" }}
          />
        ))}
        {hud.shield && (
          <Shield
            size={touch ? 32 : 42}
            strokeWidth={2.5}
            color={UI.cyanBright}
            fill="rgba(95,216,255,0.35)"
            style={{ filter: "drop-shadow(0 0 8px #5fd8ff)", animation: "dnrPulse 1s ease-in-out infinite" }}
          />
        )}
      </div>

      {/* ---- top right: buttons ---- */}
      <div
        style={{
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top))",
          right: 12,
          display: "flex",
          gap: 10,
        }}
      >
        <IconButton label={audio.muted ? "Unmute" : "Mute"} onClick={() => audioManager.toggleMute()} size={btn} active={audio.muted}>
          {audio.muted ? <VolumeX size={iconSize} strokeWidth={2.5} /> : <Volume2 size={iconSize} strokeWidth={2.5} />}
        </IconButton>
        {onToggleFullscreen && !touch && (
          <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onToggleFullscreen} size={btn}>
            {isFullscreen ? <Minimize size={iconSize} strokeWidth={2.5} /> : <Maximize size={iconSize} strokeWidth={2.5} />}
          </IconButton>
        )}
        <IconButton label="Pause (P)" onClick={pause} size={btn}>
          <Pause size={iconSize} strokeWidth={3} fill="currentColor" />
        </IconButton>
      </div>

      {/* ---- speedometer + distance ---- */}
      <div
        style={{
          ...panelStyle,
          position: "absolute",
          ...(touch
            ? { top: "calc(max(12px, env(safe-area-inset-top)) + 70px)", right: 12, padding: "6px 12px" }
            : { bottom: 20, left: 20, padding: "10px 20px" }),
          textAlign: touch ? "right" : "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: touch ? "flex-end" : "flex-start" }}>
          <span
            style={{
              fontFamily: UI.display,
              fontSize: touch ? 26 : 46,
              lineHeight: 1,
              color: hud.nitroActive ? UI.orange : UI.white,
            }}
          >
            {hud.speed}
          </span>
          <span style={{ fontWeight: 800, fontSize: touch ? 12 : 16, color: UI.warm }}>km/h</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: touch ? 13 : 17, color: UI.cyanBright }}>{hud.distance.toLocaleString()} m</div>
      </div>

      {/* ---- nitro meter (desktop; touch has its own button) ---- */}
      {!touch && (
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(420px, 50vw)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: UI.display,
              fontSize: 18,
              marginBottom: 6,
              color: nitroReady ? UI.orange : "rgba(255,255,255,0.8)",
              textShadow: "0 2px 0 rgba(0,0,0,0.5)",
              animation: nitroReady ? "dnrPulse 0.7s ease-in-out infinite" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Zap size={22} strokeWidth={3} fill="currentColor" />
            {hud.nitroActive ? "BOOST! UNBREAKABLE · x2 POINTS" : nitroReady ? "NITRO READY — PRESS SPACE" : "NITRO — COLLECT JARS TO FILL"}
          </div>
          <div
            style={{
              height: 22,
              borderRadius: 12,
              background: "rgba(0,0,0,0.45)",
              border: `3px solid ${nitroReady ? UI.orange : "rgba(255,255,255,0.4)"}`,
              overflow: "hidden",
              animation: nitroReady ? "dnrGlow 0.8s ease-in-out infinite" : "none",
            }}
          >
            <div
              style={{
                width: `${Math.round((hud.nitroActive ? 1 : hud.nitro) * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ffd23f, #ff6a3a)",
                transition: "width 0.15s linear",
              }}
            />
          </div>
        </div>
      )}

      {hud.offroad && phase === "playing" && (
        <div
          style={{
            position: "absolute",
            top: "26%",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: UI.display,
            fontSize: touch ? 18 : 24,
            color: UI.warm,
            textShadow: "0 3px 0 rgba(0,0,0,0.5)",
            opacity: 0.9,
          }}
        >
          OFF ROAD — SLOWING DOWN
        </div>
      )}

      {/* ---- popups: kept out of the driving view ----
          small ones (+50, near miss) stack under the score panel,
          big ones (combo, nitro, power-ups) sit just below the hearts */}
      <div
        style={{
          position: "absolute",
          top: touch ? "calc(max(12px, env(safe-area-inset-top)) + 96px)" : 178,
          left: 14,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {popups
          .filter((p) => !p.big)
          .slice(-3)
          .map((p) => (
            <div
              key={p.id}
              style={{
                whiteSpace: "nowrap",
                fontFamily: UI.display,
                fontSize: touch ? 16 : 20,
                color: p.color,
                textShadow: "0 2px 0 rgba(0,0,0,0.6)",
                animation: "dnrPopupSide 0.9s ease-out forwards",
              }}
            >
              {p.text}
            </div>
          ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: touch ? "calc(max(12px, env(safe-area-inset-top)) + 140px)" : 66,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {popups
          .filter((p) => p.big)
          .slice(-2)
          .map((p) => (
            <div
              key={p.id}
              style={{
                whiteSpace: "nowrap",
                fontFamily: UI.display,
                fontSize: touch ? 20 : 28,
                color: p.color,
                textShadow: "0 3px 0 rgba(0,0,0,0.6)",
                animation: "dnrPopupTop 1s ease-out forwards",
              }}
            >
              {p.text}
            </div>
          ))}
      </div>

      {/* ---- biome banner ---- */}
      {banner && (
        <div
          key={banner.id}
          style={{
            position: "absolute",
            top: "16%",
            left: "50%",
            textAlign: "center",
            animation: "dnrBanner 2.6s ease-out forwards",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontSize: touch ? 13 : 16, fontWeight: 800, letterSpacing: "0.25em", color: UI.warm }}>NOW ENTERING</div>
          <div style={{ fontFamily: UI.display, fontSize: touch ? 32 : 52, color: UI.white, textShadow: "0 4px 0 rgba(0,0,0,0.45)" }}>
            {banner.title}
          </div>
          {banner.subtitle && <div style={{ fontWeight: 800, fontSize: touch ? 14 : 18, color: UI.cyanBright }}>{banner.subtitle}</div>}
        </div>
      )}

      {/* ---- countdown ---- */}
      {phase === "countdown" && (
        <div
          key={countdown}
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            fontFamily: UI.display,
            fontSize: "clamp(90px, 22vw, 180px)",
            color: countdown === 0 ? UI.gold : UI.white,
            textShadow: "0 8px 0 rgba(0,0,0,0.4), 0 0 40px rgba(36,160,206,0.8)",
            animation: "dnrCount 0.8s ease-out forwards",
          }}
        >
          {countdown === 0 ? "GO!" : countdown}
        </div>
      )}
    </div>
  );
}
