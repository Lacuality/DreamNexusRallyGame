import { asset } from "@/lib/env";
import { useEffect, useState } from "react";
import { RotateCcw, Home, Trophy } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { Leaderboard } from "./Leaderboard";
import { BigButton, UI, panelStyle } from "./gameUi";

function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function GameOverScreen() {
  const summary = useRally((s) => s.summary);
  const highScore = useRally((s) => s.highScore);
  const isNewBest = useRally((s) => s.isNewBest);
  const start = useRally((s) => s.start);
  const restart = useRally((s) => s.restart);
  const [showBoard, setShowBoard] = useState(false);
  const score = useCountUp(summary?.score ?? 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        start();
      }
      if (e.key === "Escape") restart();
    };
    // small delay so a held key from the crash doesn't instantly restart
    const t = setTimeout(() => window.addEventListener("keydown", onKey), 700);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [start, restart]);

  if (!summary) return null;

  const stats: [string, string | number][] = [
    ["Distance", `${summary.distance.toLocaleString()} m`],
    ["Arequipe jars", summary.jars],
    ["Near misses", summary.nearMisses],
    ["Best combo", summary.bestCombo],
    ["Jumps", summary.jumps],
    ["Top speed", `${summary.maxSpeed} km/h`],
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(14, 27, 36, 0.86)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 1000,
        fontFamily: UI.body,
        color: UI.white,
        overflowY: "auto",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "min(520px, 100%)", textAlign: "center", animation: "dnrFadeIn 0.35s ease-out", margin: "auto 0" }}>
        <img
          src={asset("/pixel-bunny.png")}
          alt="Pixel the Bunny"
          style={{ display: "block", margin: "0 auto", width: 92, height: 92, objectFit: "cover", objectPosition: "50% 20%", borderRadius: "50%", border: "4px solid #5fd8ff", boxShadow: "0 0 24px rgba(95,216,255,0.5)", animation: "dnrFloat 2s ease-in-out infinite" }}
        />
        <h1 style={{ fontFamily: UI.display, fontSize: "clamp(38px, 9vw, 64px)", color: UI.cyanBright, margin: "4px 0 6px", textShadow: "0 5px 0 rgba(0,0,0,0.4)" }}>
          {isNewBest ? "NEW RECORD!" : "RACE OVER"}
        </h1>

        <div style={{ ...panelStyle, padding: "18px 20px", marginTop: 10 }}>
          <div style={{ fontWeight: 800, letterSpacing: "0.15em", color: UI.warm }}>SCORE</div>
          <div style={{ fontFamily: UI.display, fontSize: "clamp(48px, 12vw, 80px)", color: UI.gold, lineHeight: 1.05, textShadow: "0 5px 0 rgba(0,0,0,0.35)" }}>
            {score.toLocaleString()}
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <Trophy size={20} color={UI.gold} /> Best: {highScore.toLocaleString()}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 8px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.75 }}>{k}</div>
                <div style={{ fontFamily: UI.display, fontSize: 22, color: UI.white }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <BigButton onClick={start} color={UI.gold} style={{ flex: "1 1 220px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <RotateCcw size={28} strokeWidth={3} /> RACE AGAIN
            </span>
          </BigButton>
          <BigButton onClick={restart} color={UI.warm} style={{ flex: "0 1 160px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Home size={26} strokeWidth={3} /> MENU
            </span>
          </BigButton>
        </div>
        <p style={{ opacity: 0.7, fontWeight: 700, marginTop: 10 }}>Press Enter to race again</p>

        <button
          type="button"
          onClick={() => setShowBoard((v) => !v)}
          style={{ marginTop: 6, background: "none", border: "none", color: UI.cyanBright, fontWeight: 800, fontSize: 18, cursor: "pointer", padding: 10 }}
        >
          {showBoard ? "Hide leaderboard ▲" : "Show leaderboard ▼"}
        </button>
        {showBoard && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <Leaderboard />
          </div>
        )}
      </div>
    </div>
  );
}
