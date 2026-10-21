import { useEffect, useState } from "react";
import type { Line } from "@/lib/game/story";
import { audioManager } from "@/lib/audio";
import { BigButton, UI, panelStyle } from "../gameUi";

/** Comic-style conversation shown before (and after) a story chapter. */
export function StoryDialog({ title, subtitle, lines, onDone, doneLabel = "LET'S GO!" }: { title?: string; subtitle?: string; lines: Line[]; onDone: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState("");
  const line = lines[i];

  // typewriter effect
  useEffect(() => {
    setShown("");
    let n = 0;
    const id = setInterval(() => {
      n += 2;
      setShown(line.text.slice(0, n));
      if (n >= line.text.length) clearInterval(id);
    }, 18);
    audioManager.playClick();
    return () => clearInterval(id);
  }, [line]);

  const next = () => {
    if (shown.length < line.text.length) return setShown(line.text);
    if (i < lines.length - 1) setI(i + 1);
    else onDone();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      onClick={next}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "linear-gradient(180deg, rgba(14,27,36,0.92), rgba(14,27,36,0.75) 45%, rgba(14,27,36,0.96))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "16px 16px max(24px, env(safe-area-inset-bottom))",
        fontFamily: UI.body,
        color: UI.white,
        cursor: "pointer",
      }}
    >
      {title && (
        <div style={{ position: "absolute", top: "max(24px, env(safe-area-inset-top))", left: 0, right: 0, textAlign: "center", padding: "0 16px" }}>
          {subtitle && <div style={{ fontWeight: 800, letterSpacing: "0.2em", color: UI.warm }}>{subtitle}</div>}
          <div style={{ fontFamily: UI.display, fontSize: "clamp(28px, 7vw, 54px)", textShadow: "0 5px 0 rgba(0,0,0,0.4)" }}>{title}</div>
        </div>
      )}
      <div style={{ width: "min(720px, 100%)", display: "flex", gap: 14, alignItems: "flex-end" }}>
        <div key={i} style={{ fontSize: "clamp(64px, 14vw, 110px)", lineHeight: 1, animation: "dnrFloat 2s ease-in-out infinite", filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.5))" }}>
          {line.emoji}
        </div>
        <div style={{ ...panelStyle, flex: 1, padding: "14px 18px", borderColor: UI.gold, minHeight: 110 }}>
          <div style={{ fontFamily: UI.display, color: UI.gold, fontSize: 18, marginBottom: 4 }}>{line.who}</div>
          <div style={{ fontWeight: 800, fontSize: "clamp(16px, 2.4vw, 20px)", lineHeight: 1.35 }}>{shown}</div>
        </div>
      </div>
      <div style={{ width: "min(720px, 100%)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontWeight: 800, opacity: 0.7 }}>
          {i + 1}/{lines.length} · tap to continue
        </span>
        {i === lines.length - 1 && shown.length >= line.text.length && (
          <BigButton onClick={onDone} color={UI.gold}>
            {doneLabel}
          </BigButton>
        )}
      </div>
    </div>
  );
}
