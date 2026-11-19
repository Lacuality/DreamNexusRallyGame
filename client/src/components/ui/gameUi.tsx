import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { audioManager } from "@/lib/audio";

/**
 * Shared look for the game's UI: "sticker" style to match the cartoon world.
 * Thick ink outlines, hard drop shadows, flat bright colours, the Colombian tricolour.
 */
export const UI = {
  ink: "#141a2e",
  navy: "#141a2e",
  cyan: "#24A0CE",
  cyanBright: "#5fd8ff",
  warm: "#ffe9c9",
  gold: "#FCD116",
  red: "#ff4d5a",
  orange: "#ff9f43",
  green: "#52d681",
  pink: "#ff5fa8",
  blue: "#2456d6",
  white: "#ffffff",
  cream: "#fff7e3",
  // the flag
  flagYellow: "#FCD116",
  flagBlue: "#003893",
  flagRed: "#CE1126",
  display: "'Bungee', 'Arial Black', system-ui, sans-serif",
  body: "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  panel: "rgba(22, 28, 58, 0.92)",
  /** Hard "sticker" shadow under anything raised. */
  drop: "0 5px 0 rgba(10, 12, 30, 0.55)",
};

export const panelStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(34, 42, 84, 0.94) 0%, rgba(20, 26, 52, 0.94) 100%)",
  border: "3px solid #ffffff",
  borderRadius: 20,
  boxShadow: "0 6px 0 rgba(10, 12, 30, 0.55), 0 12px 28px rgba(0,0,0,0.3)",
};

/** Text with a thick ink outline, like a comic title. */
export const inkText = (size = 3, color = "#141a2e"): CSSProperties => ({
  textShadow: `${size}px ${size}px 0 ${color}, -${size / 2}px -${size / 2}px 0 ${color}, ${size / 2}px -${size / 2}px 0 ${color}, -${size / 2}px ${size / 2}px 0 ${color}, 0 ${size + 2}px 0 ${color}`,
});

/** The flag as a stripe: yellow is twice as tall as blue and red, like the real one. */
export function Tricolor({ height = 8, radius = 0, style }: { height?: number; radius?: number; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${UI.flagYellow} 0 50%, ${UI.flagBlue} 50% 75%, ${UI.flagRed} 75% 100%)`,
        ...style,
      }}
    />
  );
}

export function IconButton({
  onClick,
  label,
  children,
  size = 60,
  active = false,
  style,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  size?: number;
  active?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        audioManager.unlock();
        audioManager.playClick();
        onClick();
        (e.currentTarget as HTMLButtonElement).blur();
      }}
      className="dnr-press"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        border: "3px solid #ffffff",
        background: active ? UI.gold : "rgba(26, 33, 68, 0.95)",
        color: active ? UI.ink : UI.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: UI.drop,
        pointerEvents: "auto",
        padding: 0,
        touchAction: "manipulation",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function BigButton({
  onClick,
  children,
  color = UI.cyan,
  textColor = UI.navy,
  disabled = false,
  style,
}: {
  onClick: () => void;
  children: ReactNode;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        audioManager.unlock();
        audioManager.playClick();
        onClick();
      }}
      className="dnr-press"
      style={{
        fontFamily: UI.display,
        fontSize: "clamp(20px, 3.2vw, 28px)",
        letterSpacing: "0.04em",
        padding: "16px 34px",
        minHeight: 64,
        borderRadius: 20,
        border: `3px solid ${disabled ? "rgba(255,255,255,0.3)" : UI.ink}`,
        background: disabled ? "rgba(120,120,140,0.5)" : `linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 46%), ${color}`,
        color: disabled ? "rgba(255,255,255,0.6)" : textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 0 #141a2e, 0 12px 26px rgba(0,0,0,0.3)",
        touchAction: "manipulation",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Re-render when sound settings change. */
export function useAudioSettings() {
  const [, setTick] = useState(0);
  useEffect(() => audioManager.subscribe(() => setTick((t) => t + 1)), []);
  return audioManager.settings;
}

/** Global CSS used by the game UI (animations + fonts). */
export function GameStyles() {
  return (
    <style>{`
      .dnr-press { transition: transform 0.08s ease, filter 0.15s ease; }
      .dnr-press:hover:not(:disabled) { filter: brightness(1.12); }
      .dnr-press:active:not(:disabled) { transform: translateY(4px) scale(0.97); }
      .dnr-card { transition: transform 0.16s cubic-bezier(.2,.9,.3,1.4), filter 0.15s ease; }
      .dnr-card:hover { transform: translateY(-6px) rotate(0deg) scale(1.03) !important; filter: brightness(1.06); z-index: 2; }
      .dnr-card:active { transform: translateY(3px) scale(0.97) !important; }
      @keyframes dnrWiggle { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
      @keyframes dnrStripes { from { background-position: 0 0; } to { background-position: 56px 0; } }
      @keyframes dnrSlam { 0% { transform: scale(2.4) rotate(-14deg); opacity: 0; } 55% { transform: scale(0.9) rotate(-4deg); opacity: 1; } 100% { transform: scale(1) rotate(-4deg); } }
      @keyframes dnrPopup {
        0% { transform: translate(-50%, 10px) scale(0.6); opacity: 0; }
        15% { transform: translate(-50%, 0) scale(1.15); opacity: 1; }
        30% { transform: translate(-50%, 0) scale(1); }
        100% { transform: translate(-50%, -70px) scale(1); opacity: 0; }
      }
      @keyframes dnrPopupSide {
        0% { transform: translateX(-12px); opacity: 0; }
        15% { transform: none; opacity: 1; }
        70% { opacity: 0.9; }
        100% { transform: translateY(-10px); opacity: 0; }
      }
      @keyframes dnrPopupTop {
        0% { transform: scale(0.6); opacity: 0; }
        15% { transform: scale(1.08); opacity: 1; }
        30% { transform: scale(1); }
        75% { opacity: 0.85; }
        100% { transform: translateY(-12px); opacity: 0; }
      }
      @keyframes dnrCount {
        0% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.9; }
      }
      @keyframes dnrBanner {
        0% { transform: translate(-50%, -30px); opacity: 0; }
        12% { transform: translate(-50%, 0); opacity: 1; }
        85% { transform: translate(-50%, 0); opacity: 1; }
        100% { transform: translate(-50%, -20px); opacity: 0; }
      }
      @keyframes dnrPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      @keyframes dnrGlow { 0%,100% { box-shadow: 0 0 12px rgba(255,159,67,0.6); } 50% { box-shadow: 0 0 34px rgba(255,159,67,1); } }
      @keyframes dnrHeart { 0% { transform: scale(1); } 30% { transform: scale(1.35); } 100% { transform: scale(1); } }
      @keyframes dnrFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes dnrPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); } }
      @keyframes dnrRise { from { opacity: 0; transform: translateY(26px) scale(0.96); } to { opacity: 1; transform: none; } }
      @keyframes dnrDrop { 0% { opacity: 0; transform: translateY(-30px) scale(0.9); } 70% { opacity: 1; transform: translateY(4px) scale(1.02); } 100% { transform: none; } }
      @keyframes dnrBob { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-4px) rotate(-6deg); } }
      @keyframes dnrSweep { 0% { transform: translateX(-120%) skewX(-20deg); } 60%,100% { transform: translateX(260%) skewX(-20deg); } }
      @keyframes dnrPlayGlow { 0%,100% { box-shadow: 0 7px 0 #141a2e, 0 10px 26px rgba(252,209,22,0.35); } 50% { box-shadow: 0 7px 0 #141a2e, 0 12px 46px rgba(252,209,22,0.9); } }
      @keyframes dnrShine { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
      .dnr-in { animation: dnrRise 0.5s cubic-bezier(.2,.9,.3,1.2) both; }
      .dnr-title { animation: dnrDrop 0.7s cubic-bezier(.2,.9,.3,1.2) both; }
      .dnr-play { animation: dnrRise 0.5s cubic-bezier(.2,.9,.3,1.2) both, dnrPlayGlow 2.2s ease-in-out 0.6s infinite; }
      .dnr-play::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: dnrSweep 3s ease-in-out 1s infinite; pointer-events: none; }
      .dnr-lift { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
      .dnr-lift:hover { transform: translateY(-4px); }
      .dnr-bob { display: inline-block; animation: dnrBob 2.4s ease-in-out infinite; }
      .dnr-shine { animation: dnrShine 2.5s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .dnr-in, .dnr-title, .dnr-play, .dnr-bob, .dnr-shine, .dnr-play::after { animation: none !important; }
      }
      @keyframes dnrFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    `}</style>
  );
}
