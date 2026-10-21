import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { audioManager } from "@/lib/audio";

/** Shared look for the game's UI: chunky, readable, touch-friendly. */
export const UI = {
  navy: "#0E1B24",
  cyan: "#24A0CE",
  cyanBright: "#5fd8ff",
  warm: "#FDC6B5",
  gold: "#ffd23f",
  red: "#ff5a5f",
  orange: "#ff9f43",
  white: "#ffffff",
  display: "'Bungee', 'Arial Black', system-ui, sans-serif",
  body: "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  panel: "rgba(14, 27, 36, 0.78)",
};

export const panelStyle: CSSProperties = {
  background: UI.panel,
  border: "2px solid rgba(95, 216, 255, 0.35)",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

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
        borderRadius: size * 0.32,
        border: `3px solid ${active ? UI.gold : UI.cyanBright}`,
        background: active ? "rgba(255, 210, 63, 0.25)" : "rgba(14, 27, 36, 0.8)",
        color: active ? UI.gold : UI.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 0 rgba(0,0,0,0.35), 0 0 18px rgba(36,160,206,0.35)",
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
        borderRadius: 18,
        border: "none",
        background: disabled ? "rgba(120,120,120,0.5)" : color,
        color: disabled ? "rgba(255,255,255,0.6)" : textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 0 rgba(0,0,0,0.3), 0 10px 30px rgba(0,0,0,0.35)",
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
      .dnr-press:active:not(:disabled) { transform: translateY(3px) scale(0.97); }
      @keyframes dnrPopup {
        0% { transform: translate(-50%, 10px) scale(0.6); opacity: 0; }
        15% { transform: translate(-50%, 0) scale(1.15); opacity: 1; }
        30% { transform: translate(-50%, 0) scale(1); }
        100% { transform: translate(-50%, -70px) scale(1); opacity: 0; }
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
      @keyframes dnrFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    `}</style>
  );
}
