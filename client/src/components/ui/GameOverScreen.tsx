import { asset } from "@/lib/env";
import { useEffect, useState } from "react";
import { RotateCcw, Home, Trophy, Star, Play, Timer } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { Leaderboard } from "./Leaderboard";
import { useAchievements } from "@/lib/stores/useAchievements";
import { useProfile } from "@/lib/stores/useProfile";
import { AchievementsPanel } from "./AchievementsPanel";
import { BigButton, UI, panelStyle } from "./gameUi";
import { StoryDialog } from "./menus/StoryDialog";
import { CHAPTERS, chapterById } from "@/lib/game/story";
import { driverById } from "@/lib/game/garage";
import { formatTime, ordinal } from "@/lib/game/race";
import { room } from "@/lib/game/net";
import { session } from "@/lib/game/session";
import { circuitById } from "@/lib/game/circuits";

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
  const wallet = useProfile((s) => s.wallet);
  const driver = useProfile((s) => s.driver);
  const [showBoard, setShowBoard] = useState(false);
  const [showAch, setShowAch] = useState(false);
  const [nextDialog, setNextDialog] = useState<string | null>(null);
  const score = useCountUp(summary?.score ?? 0);
  const unlocks = useAchievements((s) => s.lastRunUnlocks);

  const mode = summary?.mode ?? "endless";
  const online = mode === "online";
  const isHost = online && room.isHost();
  const chapter = summary?.chapterId ? chapterById(summary.chapterId) : null;
  const nextChapter = chapter && summary?.success ? CHAPTERS.find((c) => c.num === chapter.num + 1) : undefined;

  const again = () => {
    if (online) {
      if (!isHost || session.mode !== "online") return;
      const c = circuitById(session.circuitId);
      room.send({ t: "start", circuitId: c.id, laps: c.laps, at: Date.now(), battle: !!session.battle });
    }
    start();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (nextDialog) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (nextChapter) setNextDialog(nextChapter.id);
        else again();
      }
      if (e.key === "Escape") restart();
    };
    // small delay so a held key from the crash doesn't instantly restart
    const t = setTimeout(() => window.addEventListener("keydown", onKey), 700);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  });

  if (!summary) return null;

  const circuit = summary.position !== undefined;
  const d = driverById(driver);

  let headline = isNewBest ? "NEW RECORD!" : "RACE OVER";
  if (circuit) headline = summary.position === 1 ? "1ST PLACE! 🏆" : `${ordinal(summary.position!).toUpperCase()} PLACE`;
  if (chapter) headline = summary.success ? "CHAPTER COMPLETE!" : "SO CLOSE!";

  const stats: [string, string | number][] = circuit
    ? [
        ["Race time", formatTime(summary.raceTime ?? 0)],
        ["Best lap", summary.bestLap ? formatTime(summary.bestLap) + (summary.newBestLap ? " ★" : "") : "—"],
        mode === "battle" || (online && session.mode === "online" && session.battle) ? ["Hits landed 🥑", summary.hits] : ["Jars", summary.jars],
        ["Top speed", `${summary.maxSpeed} km/h`],
      ]
    : [
        ["Distance", `${summary.distance.toLocaleString()} m`],
        ["Arequipe jars", summary.jars],
        ["Near misses", summary.nearMisses],
        ["Best combo", summary.bestCombo],
        ["Jumps", summary.jumps],
        ["Top speed", `${summary.maxSpeed} km/h`],
      ];

  if (nextDialog) {
    const ch = chapterById(nextDialog);
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
        <StoryDialog
          title={ch.title}
          subtitle={`CHAPTER ${ch.num} · ${ch.region}`}
          lines={ch.intro}
          onDone={() => {
            setNextDialog(null);
            start({ mode: "story", chapterId: ch.id });
          }}
        />
      </div>
    );
  }

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
      {(isNewBest || summary.position === 1 || (chapter && summary.success)) && <ConfettiRain />}
      <div style={{ width: "min(540px, 100%)", textAlign: "center", animation: "dnrFadeIn 0.35s ease-out", margin: "auto 0", position: "relative" }}>
        {d.id === "pixel" ? (
          <img
            src={asset("/pixel-bunny.png")}
            alt="Pixel the Bunny"
            style={{ display: "block", margin: "0 auto", width: 88, height: 88, objectFit: "cover", objectPosition: "50% 20%", borderRadius: "50%", border: "4px solid #5fd8ff", boxShadow: "0 0 24px rgba(95,216,255,0.5)", animation: "dnrFloat 2s ease-in-out infinite" }}
          />
        ) : (
          <div style={{ fontSize: 72, lineHeight: 1, animation: "dnrFloat 2s ease-in-out infinite" }}>{d.emoji}</div>
        )}
        {chapter && <div style={{ fontWeight: 800, color: UI.warm, marginTop: 6 }}>CHAPTER {chapter.num} · {chapter.title}</div>}
        <h1 style={{ fontFamily: UI.display, fontSize: "clamp(34px, 8vw, 60px)", color: summary.success === false ? UI.warm : UI.cyanBright, margin: "4px 0 6px", textShadow: "0 5px 0 rgba(0,0,0,0.4)" }}>
          {headline}
        </h1>

        {chapter && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
              {[0, 1, 2].map((i) => (
                <Star key={i} size={40} color={UI.gold} fill={i < (summary.stars ?? 0) ? UI.gold : "transparent"} strokeWidth={2.5} style={{ animation: i < (summary.stars ?? 0) ? `dnrHeart 0.5s ease-out ${i * 0.2}s both` : undefined }} />
              ))}
            </div>
            {(() => {
              const line = (summary.success ? chapter.win : chapter.lose)[0];
              return (
                <div style={{ ...panelStyle, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", textAlign: "left", marginBottom: 10 }}>
                  <span style={{ fontSize: 38 }}>{line.emoji}</span>
                  <span>
                    <span style={{ display: "block", fontFamily: UI.display, color: UI.gold, fontSize: 15 }}>{line.who}</span>
                    <span style={{ fontWeight: 800 }}>{line.text}</span>
                  </span>
                </div>
              );
            })()}
            {!summary.success && <div style={{ fontWeight: 800, marginBottom: 8 }}>🎯 {chapter.goal.label}</div>}
          </>
        )}

        <div style={{ ...panelStyle, padding: "16px 18px", marginTop: 6 }}>
          {!circuit && (
            <>
              <div style={{ fontWeight: 800, letterSpacing: "0.15em", color: UI.warm }}>SCORE</div>
              <div style={{ fontFamily: UI.display, fontSize: "clamp(44px, 11vw, 74px)", color: UI.gold, lineHeight: 1.05, textShadow: "0 5px 0 rgba(0,0,0,0.35)" }}>
                {score.toLocaleString()}
              </div>
              {mode === "endless" && (
                <div style={{ fontWeight: 800, fontSize: 18, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                  <Trophy size={20} color={UI.gold} /> Best: {highScore.toLocaleString()}
                </div>
              )}
            </>
          )}

          {circuit && summary.standings && (
            <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
              {summary.standings.map((s, i) => (
                <div
                  key={s.name + i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 32px 1fr auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: s.isPlayer ? "rgba(255,210,63,0.2)" : "rgba(255,255,255,0.06)",
                    border: s.isPlayer ? "2px solid rgba(255,210,63,0.7)" : "2px solid transparent",
                    fontWeight: 900,
                  }}
                >
                  <span style={{ fontFamily: UI.display, color: i === 0 ? UI.gold : UI.white }}>{i + 1}</span>
                  <span style={{ fontSize: 22 }}>{driverById(s.driver).emoji}</span>
                  <span style={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                  <span style={{ opacity: 0.85 }}>{s.time !== null ? formatTime(s.time) : "racing…"}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "8px 6px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.75 }}>{k}</div>
                <div style={{ fontFamily: UI.display, fontSize: 20, color: UI.white }}>{v}</div>
              </div>
            ))}
          </div>
          {circuit && summary.lapTimes && summary.lapTimes.length > 0 && (
            <div style={{ marginTop: 8, fontWeight: 800, fontSize: 13, opacity: 0.85, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Timer size={15} /> {summary.lapTimes.map((t, i) => `L${i + 1} ${formatTime(t)}`).join(" · ")}
            </div>
          )}
          <div style={{ marginTop: 12, fontFamily: UI.display, fontSize: 18, color: UI.gold }}>
            +{summary.reward} 🍯 jars <span style={{ fontFamily: UI.body, fontWeight: 800, fontSize: 14, color: UI.white, opacity: 0.8 }}>(you have {wallet.toLocaleString()} — spend them in the Garage)</span>
          </div>
        </div>

        {(summary.newUnlocks.length > 0 || unlocks.length > 0) && (
          <div style={{ ...panelStyle, padding: "12px 14px", marginTop: 12, animation: "dnrFadeIn 0.4s ease-out", borderColor: UI.gold }}>
            <div style={{ fontFamily: UI.display, fontSize: 16, color: UI.cyanBright, marginBottom: 8 }}>🎉 NEW UNLOCKS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {summary.newUnlocks.map((u) => (
                <div key={u} style={{ background: "rgba(95,216,255,0.15)", border: "2px solid rgba(95,216,255,0.6)", borderRadius: 14, padding: "6px 12px", fontWeight: 900 }}>
                  {u} <span style={{ fontSize: 12, opacity: 0.8 }}>· in the Garage</span>
                </div>
              ))}
              {unlocks.map((a) => (
                <div key={a.id} title={a.description} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,210,63,0.15)", border: "2px solid rgba(255,210,63,0.6)", borderRadius: 14, padding: "6px 12px" }}>
                  <span style={{ fontSize: 24 }}>{a.icon}</span>
                  <span style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontWeight: 900, color: UI.gold }}>{a.name}</span>
                    <span style={{ display: "block", fontSize: 13, opacity: 0.85 }}>{a.description}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
          {nextChapter ? (
            <BigButton onClick={() => setNextDialog(nextChapter.id)} color={UI.gold} style={{ flex: "1 1 220px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Play size={26} fill="currentColor" /> NEXT CHAPTER
              </span>
            </BigButton>
          ) : online && !isHost ? (
            <div style={{ ...panelStyle, padding: "14px 18px", fontWeight: 800, flex: "1 1 220px" }}>Waiting for the host to start the next race…</div>
          ) : (
            <BigButton onClick={again} color={UI.gold} style={{ flex: "1 1 220px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <RotateCcw size={28} strokeWidth={3} /> {online ? "NEXT RACE" : chapter && !summary.success ? "TRY AGAIN" : "RACE AGAIN"}
              </span>
            </BigButton>
          )}
          {nextChapter && (
            <BigButton onClick={() => start()} color={UI.cyanBright} style={{ flex: "0 1 140px" }}>
              <RotateCcw size={26} strokeWidth={3} />
            </BigButton>
          )}
          <BigButton
            onClick={() => {
              if (online) room.leave();
              restart();
            }}
            color={UI.warm}
            style={{ flex: "0 1 160px" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Home size={26} strokeWidth={3} /> MENU
            </span>
          </BigButton>
        </div>
        <p style={{ opacity: 0.7, fontWeight: 700, marginTop: 10 }}>Press Enter to continue</p>

        {mode === "endless" && (
          <button type="button" onClick={() => setShowBoard((v) => !v)} style={{ marginTop: 6, background: "none", border: "none", color: UI.cyanBright, fontWeight: 800, fontSize: 18, cursor: "pointer", padding: 10 }}>
            {showBoard ? "Hide leaderboard ▲" : "Show leaderboard ▼"}
          </button>
        )}
        <button type="button" onClick={() => setShowAch((v) => !v)} style={{ marginTop: 0, background: "none", border: "none", color: UI.gold, fontWeight: 800, fontSize: 18, cursor: "pointer", padding: 10 }}>
          {showAch ? "Hide achievements ▲" : "🏅 All achievements ▼"}
        </button>
        {showAch && (
          <div style={{ marginTop: 8, textAlign: "left" }}>
            <AchievementsPanel />
          </div>
        )}
        {showBoard && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <Leaderboard />
          </div>
        )}
      </div>
    </div>
  );
}

/** Celebration: Colombian-flag confetti falling over the results. */
function ConfettiRain() {
  const pieces = Array.from({ length: 70 }, (_, i) => i);
  const colors = ["#FCD116", "#003893", "#CE1126", "#ffffff", "#5fd8ff", "#ff9f43"];
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      <style>{`
        @keyframes dnrConfetti {
          0% { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--dx), 110vh, 0) rotate(var(--rot)); opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) { .dnr-confetti { display: none; } }
      `}</style>
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 14) * 0.18;
        const dur = 2.6 + ((i * 13) % 10) / 6;
        const w = 6 + (i % 3) * 3;
        return (
          <span
            key={i}
            className="dnr-confetti"
            style={{
              position: "absolute",
              top: 0,
              left: `${left}%`,
              width: w,
              height: w * 1.6,
              background: colors[i % colors.length],
              borderRadius: 2,
              animation: `dnrConfetti ${dur}s linear ${delay}s ${i < 40 ? "infinite" : "1"} both`,
              ["--dx" as any]: `${((i * 53) % 120) - 60}px`,
              ["--rot" as any]: `${360 + ((i * 97) % 720)}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
