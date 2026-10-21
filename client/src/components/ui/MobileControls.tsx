import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Zap, ChevronsDown } from "lucide-react";
import { input, isTouchDevice } from "@/lib/input";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { UI } from "./gameUi";

type Key = "touchLeft" | "touchRight" | "touchBrake" | "touchNitro";

/** Big thumb buttons. Pointer events so several fingers work at once. */
function TouchButton({
  k,
  size,
  children,
  color = "rgba(36, 160, 206, 0.45)",
  border = UI.cyanBright,
  label,
  glow = false,
}: {
  k: Key;
  size: number;
  children: ReactNode;
  color?: string;
  border?: string;
  label: string;
  glow?: boolean;
}) {
  const [down, setDown] = useState(false);
  const set = (v: boolean) => {
    input[k] = v;
    if (v && k === "touchNitro") input.nitroQueued = true;
    setDown(v);
  };
  useEffect(() => () => {
    input[k] = false;
  }, [k]);

  return (
    <div
      role="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        audioManager.unlock();
        set(true);
        if (navigator.vibrate) navigator.vibrate(8);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: down ? border : color,
        border: `4px solid ${border}`,
        color: down ? UI.navy : UI.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "auto",
        transform: down ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.06s, background 0.06s",
        boxShadow: glow ? "0 0 30px rgba(255,159,67,0.9)" : "0 6px 16px rgba(0,0,0,0.35)",
        animation: glow ? "dnrGlow 0.8s ease-in-out infinite" : "none",
      }}
    >
      {children}
    </div>
  );
}

export function MobileControls() {
  const nitro = useRally((s) => s.hud.nitro);
  const nitroActive = useRally((s) => s.hud.nitroActive);
  const [show, setShow] = useState(isTouchDevice());

  useEffect(() => {
    // show touch controls as soon as someone touches the screen
    const onTouch = () => setShow(true);
    window.addEventListener("touchstart", onTouch, { once: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  // iOS ignores CSS alone for long presses; cancel the native gesture here
  useEffect(() => {
    const stop = (e: TouchEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest("[data-touch-controls]")) e.preventDefault();
    };
    document.addEventListener("touchstart", stop, { passive: false });
    document.addEventListener("touchmove", stop, { passive: false });
    return () => {
      document.removeEventListener("touchstart", stop);
      document.removeEventListener("touchmove", stop);
    };
  }, []);

  if (!show) return null;
  const ready = nitro >= 1 && !nitroActive;
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const big = Math.max(84, Math.min(116, vmin * 0.24));

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: big * 2.4,
        zIndex: 200,
        pointerEvents: "none",
      }}
      data-touch-controls
    >
      {/* steering: left thumb */}
      <div
        style={{
          position: "absolute",
          left: "max(14px, env(safe-area-inset-left))",
          bottom: "max(18px, env(safe-area-inset-bottom))",
          display: "flex",
          gap: 14,
        }}
      >
        <TouchButton k="touchLeft" size={big} label="Steer left">
          <ChevronLeft size={big * 0.6} strokeWidth={3.5} />
        </TouchButton>
        <TouchButton k="touchRight" size={big} label="Steer right">
          <ChevronRight size={big * 0.6} strokeWidth={3.5} />
        </TouchButton>
      </div>

      {/* right thumb: nitro + brake */}
      <div
        style={{
          position: "absolute",
          right: "max(14px, env(safe-area-inset-right))",
          bottom: "max(18px, env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <TouchButton k="touchBrake" size={big * 0.72} label="Brake" color="rgba(14,27,36,0.6)" border="rgba(255,255,255,0.7)">
          <ChevronsDown size={big * 0.4} strokeWidth={3} />
        </TouchButton>
        <div style={{ position: "relative" }}>
          <TouchButton
            k="touchNitro"
            size={big}
            label="Nitro"
            color={ready ? "rgba(255,159,67,0.75)" : "rgba(14,27,36,0.6)"}
            border={ready ? UI.orange : "rgba(255,255,255,0.45)"}
            glow={ready}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Zap size={big * 0.36} strokeWidth={3} fill="currentColor" />
              <span style={{ fontFamily: UI.display, fontSize: big * 0.15 }}>NITRO</span>
            </div>
          </TouchButton>
          {/* charge ring */}
          <svg
            width={big + 16}
            height={big + 16}
            style={{ position: "absolute", left: -8, top: -8, pointerEvents: "none", transform: "rotate(-90deg)" }}
          >
            <circle
              cx={(big + 16) / 2}
              cy={(big + 16) / 2}
              r={big / 2 + 5}
              fill="none"
              stroke={UI.gold}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * (big + 10) * (nitroActive ? 1 : nitro)} 9999`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
