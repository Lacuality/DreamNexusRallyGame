import { useEffect, useMemo, useRef } from "react";
import { Pause, Volume2, VolumeX, Maximize, Minimize, Heart, Shield, Zap } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { MAX_HEARTS, run } from "@/lib/game/run";
import { audioManager } from "@/lib/audio";
import { isTouchDevice } from "@/lib/input";
import { IconButton, UI, panelStyle, useAudioSettings } from "./gameUi";
import { formatTime, ordinal, race } from "@/lib/game/race";
import { getTrack, outlinePoint, lapLength, type CircuitShape } from "@/lib/track";
import { ITEMS } from "../game/Battle";

/** Small circuit map: a closed loop shaped by the circuit's curves, with every car on it. */
function MiniMap({ touch }: { touch: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const size = touch ? 92 : 130;
  const path = useMemo(() => {
    const t = getTrack();
    if (t.kind !== "circuit") return "";
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const [x, y] = loopPoint(i / 120, t.shape);
      pts.push(`${x * size},${y * size}`);
    }
    return "M" + pts.join("L");
  }, [size]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const svg = ref.current;
      const t = getTrack();
      if (svg && t.kind === "circuit") {
        const dots = svg.querySelectorAll<SVGCircleElement>("circle[data-i]");
        const all = [{ z: run.z, me: true }, ...race.racers.map((r) => ({ z: r.z, me: false }))];
        dots.forEach((d, i) => {
          const r = all[i];
          if (!r) {
            d.setAttribute("r", "0");
            return;
          }
          const L = lapLength();
          const u = (((r.z % L) + L) % L) / L;
          const [x, y] = loopPoint(u, t.shape);
          d.setAttribute("cx", String(x * size));
          d.setAttribute("cy", String(y * size));
          d.setAttribute("r", r.me ? "6" : "4");
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      style={{
        position: "absolute",
        right: 14,
        ...(touch ? { top: "calc(max(12px, env(safe-area-inset-top)) + 140px)" } : { bottom: 22 }),
        background: "rgba(14,27,36,0.65)",
        borderRadius: 16,
        border: "2px solid rgba(95,216,255,0.35)",
      }}
    >
      <path d={path} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={touch ? 5 : 7} strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#3a3d42" strokeWidth={touch ? 3 : 4} strokeLinejoin="round" />
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} data-i={i} r={0} fill={i === 0 ? "#ffd23f" : "#ff5a5f"} stroke="#0E1B24" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

/** Point on the circuit loop, fitted into a 0..1 box (for minimaps). */
export function loopPoint(u: number, shape: CircuitShape): [number, number] {
  return outlinePoint(shape, u);
}

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
  const camRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);

  // red hit flash + nitro tint driven straight from the live run state
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (flashRef.current) {
        flashRef.current.style.opacity = String(run.flash * 0.75);
      }
      if (camRef.current) camRef.current.style.opacity = String(Math.min(1, run.camFlash * 0.9));
      if (washRef.current) washRef.current.style.display = run.washing > 0 ? "block" : "none";
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
      {/* speed camera flash */}
      <div ref={camRef} style={{ position: "absolute", inset: 0, opacity: 0, background: "rgba(255,255,255,0.95)" }} />
      {/* el mono que limpia los vidrios */}
      <div ref={washRef} style={{ position: "absolute", inset: 0, display: "none", overflow: "hidden" }}>
        <style>{`
          @keyframes dnrFoam { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0.15; } }
          @keyframes dnrSqueegee { 0% { left: -12%; } 100% { left: 100%; } }
          @keyframes dnrWasherBob { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-10px); } }
        `}</style>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(200,235,255,0.55), rgba(180,220,255,0.35))", animation: "dnrFoam 2.6s linear forwards", backdropFilter: "blur(2px)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, width: "12%", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 40%, rgba(20,20,20,0.9) 50%, rgba(255,255,255,0) 60%)", animation: "dnrSqueegee 0.9s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "22%", left: "50%", fontSize: "clamp(60px, 14vw, 120px)", animation: "dnrWasherBob 0.5s ease-in-out infinite", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>🧽🙋</div>
      </div>
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
        <div style={{ fontSize: touch ? 12 : 14, fontWeight: 800, color: UI.warm, letterSpacing: "0.12em" }}>{hud.laps > 0 ? "JARS" : "SCORE"}</div>
        <div style={{ fontFamily: UI.display, fontSize: touch ? 28 : 40, lineHeight: 1.05, color: UI.gold, textShadow: "0 3px 0 rgba(0,0,0,0.4)" }}>
          {hud.laps > 0 ? `🍯 ${hud.jars}` : hud.score.toLocaleString()}
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
        {!touch && hud.mode === "endless" && (
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
        {hud.laps === 0 && Array.from({ length: hud.maxHearts || MAX_HEARTS }).map((_, i) => (
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

      {/* ---- circuits: position, lap, time ---- */}
      {hud.laps > 0 && (
        <div
          style={{
            ...panelStyle,
            position: "absolute",
            top: touch ? "calc(max(12px, env(safe-area-inset-top)) + 66px)" : "max(12px, env(safe-area-inset-top))",
            left: touch ? "calc(50% - 30px)" : "50%",
            transform: "translateX(-50%)",
            padding: touch ? "4px 12px" : "6px 18px",
            display: "flex",
            alignItems: "center",
            gap: touch ? 10 : 18,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: UI.display, fontSize: touch ? 26 : 38, lineHeight: 1, color: hud.position === 1 ? UI.gold : UI.white }}>
              {ordinal(hud.position)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8 }}>of {hud.racers}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: UI.display, fontSize: touch ? 18 : 24, color: UI.cyanBright }}>
              LAP {hud.lap}/{hud.laps}
            </div>
            <div style={{ fontWeight: 800, fontSize: touch ? 13 : 15 }}>{formatTime(hud.lapTime)}</div>
          </div>
        </div>
      )}
      {hud.laps > 0 && <MiniMap touch={touch} />}

      {/* ---- next corner warning ---- */}
      {hud.laps > 0 && hud.corner !== 0 && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            top: touch ? "calc(max(12px, env(safe-area-inset-top)) + 128px)" : "calc(max(12px, env(safe-area-inset-top)) + 96px)",
            left: touch ? "calc(50% - 30px)" : "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: touch ? "3px 12px" : "5px 16px",
            borderRadius: 14,
            background: "rgba(14,27,36,0.72)",
            border: `3px solid ${[UI.gold, "#ff9f1c", UI.red][Math.abs(hud.corner) - 1]}`,
            color: [UI.gold, "#ff9f1c", UI.red][Math.abs(hud.corner) - 1],
            fontFamily: UI.display,
            fontSize: touch ? 18 : 24,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            animation: hud.cornerDist < 60 ? "dnrPulse 0.5s ease-in-out infinite" : "none",
          }}
        >
          {hud.corner > 0 && <span>{"◀".repeat(Math.abs(hud.corner))}</span>}
          <span style={{ color: UI.white, fontSize: touch ? 14 : 17 }}>
            {Math.abs(hud.corner) === 3 ? "¡FRENA!" : "CURVA"} {Math.round(hud.cornerDist / 10) * 10}m
          </span>
          {hud.corner < 0 && <span>{"▶".repeat(Math.abs(hud.corner))}</span>}
        </div>
      )}

      {/* ---- Rally Loco item slot ---- */}
      {hud.battle && (
        <div
          style={{
            position: "absolute",
            ...(touch ? { right: 14, bottom: "calc(max(18px, env(safe-area-inset-bottom)) + 230px)" } : { left: "50%", bottom: 90, transform: "translateX(-50%)" }),
            display: "flex",
            alignItems: "center",
            gap: 10,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: touch ? 64 : 78,
              height: touch ? 64 : 78,
              borderRadius: "50%",
              background: hud.item ? "rgba(255,210,63,0.25)" : "rgba(14,27,36,0.7)",
              border: `4px solid ${hud.item ? UI.gold : "rgba(255,255,255,0.35)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: touch ? 34 : 42,
              animation: hud.item ? "dnrPulse 0.8s ease-in-out infinite" : "none",
              boxShadow: hud.item ? "0 0 24px rgba(255,210,63,0.7)" : "none",
            }}
          >
            {hud.item ? ITEMS[hud.item as keyof typeof ITEMS].emoji : "❔"}
          </div>
          {!touch && (
            <div style={{ fontWeight: 900, textShadow: "0 2px 4px #000" }}>
              <div style={{ fontFamily: UI.display, color: hud.item ? UI.gold : "rgba(255,255,255,0.7)" }}>
                {hud.item ? ITEMS[hud.item as keyof typeof ITEMS].name : "Drive through a ? box"}
              </div>
              <div style={{ fontSize: 13 }}>{hud.item ? `${ITEMS[hud.item as keyof typeof ITEMS].hint} — press E` : "to get a power-up"}</div>
            </div>
          )}
        </div>
      )}

      {/* ---- story goal ---- */}
      {hud.mode === "story" && hud.goalValue > 0 && hud.laps === 0 && (
        <div
          style={{
            ...panelStyle,
            position: "absolute",
            top: touch ? "calc(max(12px, env(safe-area-inset-top)) + 44px)" : 66,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "4px 14px",
            textAlign: "center",
            whiteSpace: "nowrap",
            borderColor: hud.goalProgress >= hud.goalValue ? UI.gold : undefined,
          }}
        >
          <div style={{ fontSize: touch ? 12 : 14, fontWeight: 800, color: UI.warm }}>{hud.goalLabel}</div>
          <div style={{ fontFamily: UI.display, fontSize: touch ? 18 : 22 }}>
            {Math.min(hud.goalProgress, hud.goalValue)} / {hud.goalValue}
            {hud.limit > 0 && (
              <span style={{ fontFamily: UI.body, fontWeight: 800, fontSize: 13, opacity: 0.8 }}> · {Math.max(0, hud.limit - hud.distance)} m left</span>
            )}
          </div>
        </div>
      )}

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
        <div style={{ fontWeight: 800, fontSize: touch ? 13 : 17, color: UI.cyanBright }}>
          {hud.distance.toLocaleString()} m
          {hud.mode === "endless" && (
            <span key={hud.gear} style={{ marginLeft: 8, color: UI.orange, display: "inline-block", animation: "dnrPop 0.5s ease-out" }}>
              ⚡{hud.gear}
            </span>
          )}
        </div>
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
