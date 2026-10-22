import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton, UI, panelStyle } from "../gameUi";
import { useProfile } from "@/lib/stores/useProfile";

/** Full-screen menu page with a title, the jar wallet and a close button. */
export function MenuShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const wallet = useProfile((s) => s.wallet);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: "rgba(14,27,36,0.9)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowY: "auto",
        padding: "max(12px, env(safe-area-inset-top)) 12px 24px",
        fontFamily: UI.body,
        color: UI.white,
      }}
    >
      <div style={{ width: wide ? "min(1100px, 100%)" : "min(760px, 100%)", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontFamily: UI.display, fontSize: "clamp(22px, 5vw, 40px)", margin: 0, flex: 1, minWidth: 0, color: UI.cyanBright }}>{title}</h2>
        <div style={{ ...panelStyle, padding: "6px 14px", fontFamily: UI.display, fontSize: 20, color: UI.gold }} title="Arequipe jars to spend">
          🍯 {wallet.toLocaleString()}
        </div>
        <IconButton label="Close" onClick={onClose} size={52}>
          <X size={28} strokeWidth={3} />
        </IconButton>
      </div>
      <div style={{ width: wide ? "min(1100px, 100%)" : "min(760px, 100%)", minWidth: 0, maxWidth: "100%", animation: "dnrFadeIn 0.25s ease-out" }}>{children}</div>
    </div>
  );
}

export function Card({ children, active, onClick, locked, style }: { children: ReactNode; active?: boolean; onClick?: () => void; locked?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={onClick ? "dnr-press" : undefined}
      style={{
        ...panelStyle,
        padding: 12,
        cursor: onClick ? "pointer" : "default",
        borderColor: active ? UI.gold : locked ? "rgba(255,255,255,0.12)" : "rgba(95,216,255,0.35)",
        background: active ? "rgba(255,210,63,0.14)" : locked ? "rgba(20,24,30,0.8)" : UI.panel,
        opacity: locked ? 0.75 : 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatBar({ label, value }: { label: string; value: number }) {
  // value around 0.8..1.3 -> 0..100%
  const pct = Math.max(8, Math.min(100, ((value - 0.75) / 0.6) * 100));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <div style={{ height: 7, borderRadius: 4, background: "rgba(0,0,0,0.45)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#24A0CE,#5fd8ff)" }} />
      </div>
    </div>
  );
}
