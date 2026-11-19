import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Volume2, VolumeX, Maximize, Minimize, Heart, Shield, Zap } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { TIPS } from "@/lib/game/taunts";
import { MAX_HEARTS, run } from "@/lib/game/run";
import { audioManager } from "@/lib/audio";
import { isTouchDevice } from "@/lib/input";
import { IconButton, UI, panelStyle, useAudioSettings, inkText } from "./gameUi";
import { formatTime, ordinal, race } from "@/lib/game/race";
import { getTrack, outlinePoint, lapLength, type CircuitShape } from "@/lib/track";
import { ITEMS } from "../game/Battle";

/** Small circuit map: a closed loop shaped by the circuit's curves, with every car on it. */
function MiniMap({ touch }: { touch: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const size = touch ? (window.innerWidth > window.innerHeight ? 76 : 92) : 130;
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
        ...(touch ? { top: "calc(max(12px, env(safe-area-inset-top)) + 72px)" } : { bottom: 22 }),
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

/** Ten little jars: how many you carry (each one makes you faster). */
function JarPips({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center", verticalAlign: "middle" }}>
      <span style={{ fontSize: size + 5, lineHeight: 1, marginRight: 3 }}>🍯</span>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          style={{
            width: size * 0.62, height: size, borderRadius: 4, boxSizing: "border-box", border: `2px solid ${UI.ink}`,
            background: i < n ? UI.gold : "rgba(255,255,255,0.22)", transform: i < n ? "none" : "scale(0.85)", transition: "all 0.15s",
          }}
        />
      ))}
    </span>
  );
}

// cheese blobs: [left %, top %, size vmin, height ratio, rotation]
const SPLATS = [[27, 32, 27, 0.8, -12], [68, 28, 24, 0.9, 18], [52, 60, 31, 0.7, 4], [15, 68, 17, 0.85, 30], [84, 66, 20, 0.8, -24], [44, 18, 14, 0.9, 40]];

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
  // item roulette: when you grab a box the slot spins through the items before landing
  const [spin, setSpin] = useState<string | null>(null);
  const prevItem = useRef<string | null>(null);
  useEffect(() => {
    if (hud.item && !prevItem.current) {
      const keys = Object.keys(ITEMS);
      let i = 0;
      const id = setInterval(() => setSpin(keys[i++ % keys.length]), 70);
      const stop = setTimeout(() => {
        clearInterval(id);
        setSpin(null);
      }, 900);
      prevItem.current = hud.item;
      return () => {
        clearInterval(id);
        clearTimeout(stop);
      };
    }
    prevItem.current = hud.item;
  }, [hud.item]);
  const washRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const splatRef = useRef<HTMLDivElement>(null);
  const rocketRef = useRef<HTMLDivElement>(null);

  // red hit flash + nitro tint driven straight from the live run state
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (flashRef.current) {
        flashRef.current.style.opacity = String(run.flash * 0.75);
      }
      if (camRef.current) camRef.current.style.opacity = String(Math.min(1, run.camFlash * 0.9));
      if (washRef.current) washRef.current.style.display = run.washing > 0 ? "block" : "none";
      if (darkRef.current) darkRef.current.style.opacity = String(Math.min(1, Math.max(0, run.blackout) * 2));
      if (splatRef.current) splatRef.current.style.opacity = String(Math.min(0.93, Math.max(0, run.splat) * 1.2));
      if (rocketRef.current) {
        rocketRef.current.style.display = run.incoming > 0 ? "flex" : "none";
        if (run.incoming > 0) {
          const fast = run.incoming > 0.7;
          rocketRef.current.style.opacity = Math.floor(performance.now() / (fast ? 90 : 220)) % 2 ? "1" : "0.55";
          rocketRef.current.style.transform = `translateX(-50%) scale(${1 + run.incoming * 0.25})`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const runId = useRally((st) => st.runId);
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], [runId]);
  const landscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;
  const racing = hud.laps > 0;
  // where the centre-top warnings sit on touch screens (below the position panel)
  const warnTop = landscape ? "calc(max(12px, env(safe-area-inset-top)) + 72px)" : "calc(max(12px, env(safe-area-inset-top)) + 142px)";
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
      {/* apagón: the lights go out, you only see a pool of light around your kart */}
      <div ref={darkRef} style={{ position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.25s", background: "radial-gradient(ellipse at 50% 62%, rgba(6,8,20,0) 12%, rgba(6,8,20,0.82) 34%, rgba(4,5,14,0.97) 70%)" }} />
      {/* arepazo: melted cheese on the windscreen */}
      <div ref={splatRef} style={{ position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.3s" }}>
        {SPLATS.map((sp, i) => (
          <div
            key={i}
            style={{
              position: "absolute", left: `${sp[0]}%`, top: `${sp[1]}%`, width: `${sp[2]}vmin`, height: `${sp[2] * sp[3]}vmin`,
              transform: `translate(-50%,-50%) rotate(${sp[4]}deg)`, borderRadius: "46% 54% 58% 42% / 52% 44% 56% 48%",
              background: "radial-gradient(circle at 38% 32%, #fff8cf 0%, #ffe27a 45%, #f2b84b 100%)",
              boxShadow: "inset -6px -8px 0 rgba(180,120,20,0.25), 0 4px 0 rgba(0,0,0,0.18)",
            }}
          />
        ))}
      </div>
      {/* a volador is chasing you */}
      <div
        ref={rocketRef}
        style={{
          position: "absolute", left: "50%", bottom: "30%", display: "none", alignItems: "center", gap: 8, padding: "8px 18px",
          borderRadius: 999, background: "#ff3b3b", border: "3px solid #fff", color: "#fff", fontFamily: "'Bungee', sans-serif",
          fontSize: 18, letterSpacing: 1, boxShadow: "0 0 24px rgba(255,60,60,0.8)", whiteSpace: "nowrap",
        }}
      >
        🚨 ¡VOLADOR! 🎆
      </div>
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

      {/* ---- top left: score (on phones a race shows the speed there instead) ---- */}
      <div
        style={{
          ...panelStyle,
          display: touch && racing ? "none" : undefined,
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top))",
          left: 12,
          padding: touch ? "8px 14px" : "10px 18px",
          minWidth: touch ? 130 : 180,
        }}
      >
        <div style={{ fontSize: touch ? 12 : 14, fontWeight: 800, color: UI.warm, letterSpacing: "0.12em" }}>{hud.laps > 0 ? "TARROS · +VELOCIDAD" : "PUNTOS"}</div>
        <div style={{ fontFamily: UI.display, fontSize: touch ? 28 : 40, lineHeight: 1.05, color: UI.gold, textShadow: "0 3px 0 rgba(0,0,0,0.4)" }}>
          {hud.laps > 0 ? <JarPips n={hud.coins} size={touch ? 14 : 18} /> : hud.score.toLocaleString()}
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
            <span style={{ fontWeight: 800, fontSize: touch ? 13 : 15, color: UI.warm }}>combo {hud.combo}</span>
          )}
        </div>
        {!touch && hud.mode === "endless" && (
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4, fontWeight: 700 }}>Récord {Math.max(highScore, hud.score).toLocaleString()}</div>
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
            position: "absolute",
            top: touch && !landscape ? "calc(max(12px, env(safe-area-inset-top)) + 72px)" : "max(12px, env(safe-area-inset-top))",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: touch ? 8 : 14,
            whiteSpace: "nowrap",
          }}
        >
          {/* your place: a big sticker that slams in every time it changes */}
          <div
            key={hud.position}
            style={{
              display: "flex", alignItems: "flex-start", gap: 1, padding: touch ? "0 10px 2px" : "0 14px 4px",
              background: hud.position === 1 ? UI.gold : hud.position <= 3 ? UI.white : "#c9d2ee",
              color: UI.ink, border: `${touch ? 3 : 4}px solid ${UI.ink}`, borderRadius: touch ? 14 : 18,
              boxShadow: `0 ${touch ? 4 : 6}px 0 ${UI.ink}`, fontFamily: UI.display, animation: "dnrSlam 0.4s cubic-bezier(.2,.9,.3,1.3) both",
            }}
          >
            <span style={{ fontSize: touch ? 34 : 56, lineHeight: 1 }}>{hud.position}</span>
            <span style={{ fontSize: touch ? 15 : 24, lineHeight: 1.2 }}>º</span>
            <span style={{ fontFamily: UI.body, fontWeight: 900, fontSize: touch ? 11 : 14, alignSelf: "flex-end", marginBottom: touch ? 4 : 8, marginLeft: 2, opacity: 0.7 }}>/{hud.racers}</span>
          </div>
          <div
            style={{
              ...panelStyle,
              borderRadius: 16,
              padding: touch ? "3px 12px" : "5px 16px",
              textAlign: "center",
              background: hud.lap >= hud.laps ? "linear-gradient(180deg, #ff5a66, #c81e36)" : panelStyle.background,
            }}
          >
            <div style={{ fontFamily: UI.display, fontSize: touch ? 15 : 20, lineHeight: 1.1, color: hud.lap >= hud.laps ? UI.white : UI.gold }}>
              {hud.lap >= hud.laps && hud.laps > 1 ? "¡ÚLTIMA VUELTA!" : `VUELTA ${hud.lap}/${hud.laps}`}
            </div>
            <div style={{ fontWeight: 900, fontSize: touch ? 13 : 16, fontVariantNumeric: "tabular-nums" }}>{formatTime(hud.lapTime)}</div>
            {hud.cupLabel && !touch && <div style={{ fontWeight: 900, fontSize: 10, color: UI.warm, letterSpacing: "0.08em" }}>{hud.cupLabel}</div>}
          </div>
        </div>
      )}
      {hud.laps > 0 && <MiniMap touch={touch} />}

      {/* ---- parked patrol ahead: the rule, right where you need it ---- */}
      {hud.copAhead >= 0 && hud.chaseGap < 0 && (
        <div
          style={{
            position: "absolute",
            top: touch ? warnTop : "calc(max(12px, env(safe-area-inset-top)) + 96px)",
            left: touch ? "calc(50% - 30px)" : "50%",
            transform: "translateX(-50%)",
            padding: touch ? "4px 12px" : "6px 16px",
            borderRadius: 14,
            background: "rgba(14,27,36,0.78)",
            border: `3px solid ${hud.nitroActive || hud.speed > 150 ? UI.red : "#1f8a3c"}`,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontFamily: UI.display, fontSize: touch ? 14 : 17, color: hud.nitroActive || hud.speed > 150 ? UI.red : "#7bd389" }}>
            👮 POLICÍA {Math.round(hud.copAhead / 10) * 10} m
          </div>
          <div style={{ fontWeight: 800, fontSize: touch ? 11 : 13 }}>{hud.nitroActive || hud.speed > 150 ? "¡BAJA LA VELOCIDAD! máx 150 · sin nitro" : "máx 150 km/h · sin nitro ✓"}</div>
        </div>
      )}

      {/* ---- police chase: how far you are from getting away ---- */}
      {hud.chaseGap >= 0 && (
        <div
          style={{
            position: "absolute",
            top: touch ? warnTop : "calc(max(12px, env(safe-area-inset-top)) + 96px)",
            left: touch ? "calc(50% - 30px)" : "50%",
            transform: "translateX(-50%)",
            width: "min(360px, 70vw)",
            padding: "6px 12px",
            borderRadius: 14,
            background: "rgba(14,27,36,0.78)",
            border: `3px solid ${UI.red}`,
            textAlign: "center",
            animation: "dnrPulse 0.7s ease-in-out infinite",
          }}
        >
          <div style={{ fontFamily: UI.display, fontSize: touch ? 14 : 17, color: UI.red }}>🚔 ¡TE PERSIGUEN! ALÉJATE {hud.chaseGoal} m</div>
          <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,0.15)", overflow: "hidden", marginTop: 4 }}>
            <div style={{ width: `${Math.max(0, Math.min(100, (hud.chaseGap / hud.chaseGoal) * 100))}%`, height: "100%", background: `linear-gradient(90deg, ${UI.red}, ${UI.gold})`, transition: "width 0.1s linear" }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 12, marginTop: 2 }}>{Math.max(0, Math.round(hud.chaseGap))} m — ¡nitro y acelera!</div>
        </div>
      )}

      {/* ---- rebufo (slipstream) charge ---- */}
      {racing && hud.draft > 0.08 && (
        <div style={{ position: "absolute", left: "50%", top: "62%", transform: "translateX(-50%)", width: "min(220px, 46vw)", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: UI.display, fontSize: touch ? 13 : 15, color: UI.cyanBright, textShadow: "0 2px 4px #000" }}>💨 REBUFO</div>
          <div style={{ height: 8, borderRadius: 5, background: "rgba(0,0,0,0.45)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.5)" }}>
            <div style={{ width: `${Math.round(hud.draft * 100)}%`, height: "100%", background: "linear-gradient(90deg,#5fd8ff,#ffffff)" }} />
          </div>
        </div>
      )}
      {/* ---- Panela Power / Chiva Express timer ---- */}
      {hud.powered > 0 && (
        <div style={{ position: "absolute", left: "50%", top: "24%", transform: "translateX(-50%)", fontFamily: UI.display, fontSize: touch ? 20 : 28, color: UI.gold, textShadow: "0 3px 0 rgba(0,0,0,0.5), 0 0 18px rgba(255,210,63,0.9)", animation: "dnrPulse 0.4s ease-in-out infinite", pointerEvents: "none", whiteSpace: "nowrap" }}>
          🌟 {hud.powered.toFixed(1)}s
        </div>
      )}

      {/* ---- next corner warning ---- */}
      {hud.laps > 0 && hud.corner !== 0 && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            top: touch ? warnTop : "calc(max(12px, env(safe-area-inset-top)) + 96px)",
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
      {hud.battle && !touch && (
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
              width: 84,
              height: 84,
              borderRadius: 22,
              position: "relative",
              background: hud.item || spin ? `repeating-linear-gradient(-55deg, rgba(255,255,255,0.25) 0 10px, rgba(255,255,255,0) 10px 20px), ${UI.gold}` : "rgba(26,33,68,0.85)",
              border: `4px solid ${hud.item || spin ? UI.ink : "rgba(255,255,255,0.6)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 46,
              transform: "rotate(-4deg)",
              animation: hud.item && !spin ? "dnrPulse 0.8s ease-in-out infinite" : "none",
              boxShadow: hud.item || spin ? `0 6px 0 ${UI.ink}, 0 0 26px rgba(252,209,22,0.8)` : "0 5px 0 rgba(10,12,30,0.5)",
            }}
          >
            <span key={spin ?? hud.item ?? "none"} style={{ animation: spin ? "dnrPop 0.07s linear" : hud.item ? "dnrPop 0.35s ease-out" : "none", filter: "drop-shadow(0 3px 0 rgba(20,26,46,0.35))" }}>
              {spin ? ITEMS[spin as keyof typeof ITEMS].emoji : hud.item ? ITEMS[hud.item as keyof typeof ITEMS].emoji : "❔"}
            </span>
            {!spin && hud.item && hud.itemCount > 1 && (
              <span style={{ position: "absolute", right: -12, bottom: -10, fontFamily: UI.display, fontSize: 17, color: UI.ink, background: UI.white, border: `3px solid ${UI.ink}`, borderRadius: 999, padding: "0 7px" }}>×{hud.itemCount}</span>
            )}
          </div>
          {!touch && (
            <div style={{ fontWeight: 900, ...inkText(1.5) }}>
              <div style={{ fontFamily: UI.display, fontSize: 17, color: hud.item ? UI.gold : UI.white }}>
                {spin ? "…" : hud.item ? ITEMS[hud.item as keyof typeof ITEMS].name.toUpperCase() : "PASA POR UNA CAJA ?"}
              </div>
              <div style={{ fontSize: 13 }}>
                {spin ? "" : hud.item ? (
                  <>
                    {ITEMS[hud.item as keyof typeof ITEMS].hint} ·{" "}
                    <span style={{ background: UI.white, color: UI.ink, borderRadius: 6, padding: "0 6px", textShadow: "none", border: `2px solid ${UI.ink}` }}>E</span>
                  </>
                ) : "para ganar un poder"}
              </div>
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
            ? racing
              ? { top: "max(12px, env(safe-area-inset-top))", left: 12, padding: "6px 12px" }
              : { top: "calc(max(12px, env(safe-area-inset-top)) + 70px)", right: 12, padding: "6px 12px" }
            : { bottom: 20, left: 20, padding: "10px 20px" }),
          textAlign: touch && !racing ? "right" : "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: touch && !racing ? "flex-end" : "flex-start" }}>
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
          {racing ? (touch ? <JarPips n={hud.coins} size={11} /> : "") : `${hud.distance.toLocaleString()} m`}
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
              color: nitroReady ? UI.gold : UI.white,
              ...inkText(1.5),
              animation: nitroReady ? "dnrPulse 0.7s ease-in-out infinite" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Zap size={22} strokeWidth={3} fill="currentColor" />
            {racing
              ? hud.nitroActive ? "¡TURBO!" : nitroReady ? "NITRO LISTO · ESPACIO" : "NITRO"
              : hud.nitroActive ? "¡TURBO! IRROMPIBLE · PUNTOS x2" : nitroReady ? "NITRO LISTO · ESPACIO" : "NITRO · JUNTA TARROS"}
          </div>
          <div
            style={{
              height: 24,
              borderRadius: 14,
              background: "rgba(20,26,46,0.75)",
              border: `4px solid ${UI.ink}`,
              outline: `2px solid ${nitroReady ? UI.gold : "rgba(255,255,255,0.75)"}`,
              boxShadow: `0 5px 0 rgba(10,12,30,0.55)`,
              overflow: "hidden",
              animation: nitroReady ? "dnrGlow 0.8s ease-in-out infinite" : "none",
            }}
          >
            <div
              style={{
                width: `${Math.round((hud.nitroActive ? 1 : hud.nitro) * 100)}%`,
                height: "100%",
                background: "repeating-linear-gradient(-55deg, rgba(255,255,255,0.3) 0 14px, rgba(255,255,255,0) 14px 28px), linear-gradient(90deg, #FCD116, #ff7a2a 70%, #ff3d5a)",
                backgroundSize: "56px 100%, 100% 100%",
                animation: nitroReady || hud.nitroActive ? "dnrStripes 0.5s linear infinite" : "none",
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
            ...inkText(2),
          }}
        >
          FUERA DE PISTA · PIERDES VELOCIDAD
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
            top: "42%",
            left: "50%",
            width: "clamp(140px, 26vw, 230px)",
            height: "clamp(140px, 26vw, 230px)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: UI.display,
            fontSize: "clamp(80px, 16vw, 140px)",
            color: countdown === 0 ? "#0E1B24" : UI.white,
            background: countdown === 3 ? "radial-gradient(circle, #ff5a5f, #a3161a)" : countdown === 0 ? "radial-gradient(circle, #7bd389, #1f8a3c)" : "radial-gradient(circle, #ffd23f, #c8772e)",
            border: "6px solid rgba(255,255,255,0.85)",
            boxShadow: `0 0 60px ${countdown === 3 ? "rgba(255,42,42,0.8)" : countdown === 0 ? "rgba(46,204,64,0.9)" : "rgba(255,176,0,0.8)"}, 0 10px 0 rgba(0,0,0,0.35)`,
            textShadow: "0 6px 0 rgba(0,0,0,0.35)",
            animation: "dnrCount 0.8s ease-out forwards",
          }}
        >
          {countdown === 0 ? "GO" : countdown}
        </div>
      )}
      {phase === "countdown" && racing && (
        <div style={{ position: "absolute", left: "50%", top: touch ? warnTop : "calc(max(12px, env(safe-area-inset-top)) + 96px)", transform: "translateX(-50%)", ...panelStyle, padding: "8px 16px", fontWeight: 800, fontSize: touch ? 13 : 16, textAlign: "center", maxWidth: "min(560px, 86vw)" }}>
          💡 {tip}
        </div>
      )}
    </div>
  );
}
