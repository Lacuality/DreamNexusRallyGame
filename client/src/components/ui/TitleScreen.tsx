import { useEffect, useMemo } from "react";
import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { CarModelViewer } from "./CarModelViewer";

export function TitleScreen() {
  const { start, highScore, loadHighScore } = useRally();

  useEffect(() => {
    loadHighScore();
  }, [loadHighScore]);

  const handleStart = () => start();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleStart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Shared sizes with clamp so it fits 100% screens without overflow
  const sizes = useMemo(
    () => ({
      title: "clamp(28px, 6vw, 72px)",
      subtitle: "clamp(14px, 2.2vw, 20px)",
      blockPad: "clamp(14px, 2vw, 22px)",
      gap: "clamp(14px, 2.4vw, 28px)",
      logo: "min(34vh, 44vw)",       // never taller than ~1/3 of screen
      bunny: "clamp(56px, 10vw, 96px)",
      buttonFont: "clamp(16px, 2.4vw, 24px)",
      buttonPadY: "clamp(12px, 1.8vw, 18px)",
      buttonPadX: "clamp(28px, 6vw, 56px)",
      hudFont: "clamp(14px, 2vw, 20px)",
      maxWidth: "min(1100px, 92vw)",
    }),
    []
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          `radial-gradient(1200px 600px at 50% -5%, rgba(0, 180, 220, 0.14), transparent 60%),` +
          `radial-gradient(900px 400px at 50% 100%, rgba(255, 170, 120, 0.08), transparent 60%),` +
          DREAM_NEXUS_COLORS.navy,
        color: DREAM_NEXUS_COLORS.white,
        zIndex: 1000,
        // full viewport, safe areas, and graceful overflow if screen is tiny
        minHeight: "100dvh",
        padding:
          "max(env(safe-area-inset-top, 16px), 16px) max(env(safe-area-inset-right, 16px), 16px) max(env(safe-area-inset-bottom, 16px), 16px) max(env(safe-area-inset-left, 16px), 16px)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Inner scroll area only if really needed */}
      <div
        style={{
          width: sizes.maxWidth,
          maxHeight: "100%",
          display: "grid",
          gridTemplateRows: "auto auto auto auto 1fr auto",
          alignItems: "center",
          justifyItems: "center",
          gap: sizes.gap,
          overflow: "auto",
          paddingBottom: sizes.blockPad,
        }}
      >
        {/* Logo with glow */}
        <div style={{ position: "relative" }}>
          <img
            src="/dream-nexus-logo.png"
            alt="Dream Nexus"
            style={{
              width: sizes.logo,
              height: "auto",
              display: "block",
              filter: "drop-shadow(0 0 26px rgba(0, 200, 255, 0.25))",
              borderRadius: "12px",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "-18%",
              borderRadius: "24px",
              background:
                "radial-gradient(60% 60% at 50% 50%, rgba(0,170,210,0.15), transparent 70%)",
              pointerEvents: "none",
              animation: "logoPulse 4s ease-in-out infinite",
            }}
          />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "monospace",
            fontSize: sizes.title,
            letterSpacing: "0.04em",
            color: DREAM_NEXUS_COLORS.cyan,
            margin: 0,
            textAlign: "center",
          }}
        >
          Dream Nexus Rally
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: sizes.subtitle,
            color: DREAM_NEXUS_COLORS.warm,
            margin: 0,
            textAlign: "center",
            maxWidth: "70ch",
          }}
        >
          Help <strong>Pixel the Bunny</strong> race through Colombia!
        </p>

        {/* Car Model Viewer */}
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(6px)",
            padding: sizes.blockPad,
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: "0.6em",
              fontFamily: "monospace",
              color: DREAM_NEXUS_COLORS.cyan,
              fontSize: "clamp(16px, 2.2vw, 20px)",
              textAlign: "center",
            }}
          >
            Your Rally Car — Drag to Rotate
          </h3>
          <CarModelViewer width="100%" height="220px" />
        </div>

        {/* Bunny + Controls card */}
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: sizes.gap,
            alignItems: "center",
          }}
        >
          <img
            src="/pixel-bunny.png"
            alt="Pixel the Bunny"
            style={{
              width: sizes.bunny,
              height: sizes.bunny,
              objectFit: "contain",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.35))",
            }}
          />
          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(6px)",
              padding: sizes.blockPad,
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25) inset",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "0.6em",
                fontFamily: "monospace",
                color: DREAM_NEXUS_COLORS.cyan,
                fontSize: "clamp(18px, 2.4vw, 24px)",
              }}
            >
              Controls
            </h3>
            <div
              style={{
                display: "grid",
                gap: "8px",
                fontSize: "clamp(14px, 2vw, 18px)",
                lineHeight: 1.6,
              }}
            >
              <Row left="↑ / W" right="Accelerate" />
              <Row left="↓ / S" right="Brake" />
              <Row left="← / A" right="Steer Left" />
              <Row left="→ / D" right="Steer Right" />
              <Row left="P" right="Pause" />
            </div>
          </div>
        </div>

        {/* High score (optional) */}
        {highScore > 0 && (
          <div
            style={{
              fontSize: sizes.hudFont,
              color: DREAM_NEXUS_COLORS.cyan,
            }}
          >
            High Score: {highScore}m
          </div>
        )}

        {/* Start button */}
        <button
          onClick={handleStart}
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: sizes.buttonFont,
            padding: `${sizes.buttonPadY} ${sizes.buttonPadX}`,
            background:
              `linear-gradient(180deg, ${DREAM_NEXUS_COLORS.cyan}, #5dd6ff)`,
            color: DREAM_NEXUS_COLORS.navy,
            border: "0",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow:
              "0 10px 22px rgba(0,180,220,0.30), 0 1px 0 rgba(255,255,255,0.3) inset",
            transform: "translateZ(0)",
            transition: "transform .18s ease, box-shadow .18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 16px 28px rgba(0,180,220,0.35), 0 1px 0 rgba(255,255,255,0.35) inset";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 10px 22px rgba(0,180,220,0.30), 0 1px 0 rgba(255,255,255,0.3) inset";
          }}
        >
          START — Press Enter
        </button>

        {/* Footer */}
        <div
          style={{
            fontSize: "clamp(12px, 1.8vw, 14px)",
            color: DREAM_NEXUS_COLORS.warm,
            opacity: 0.9,
          }}
        >
          Sponsored by Dream Nexus
        </div>
      </div>

      {/* tiny CSS keyframes */}
      <style>{`
        @keyframes logoPulse {
          0%,100% { opacity: .55; transform: scale(1); }
          50% { opacity: .85; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(6ch, auto) 1fr",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <span style={{ color: "#fff" }}>
        <strong>{left}</strong>
      </span>
      <span style={{ color: "rgba(255,255,255,.9)" }}>{right}</span>
    </div>
  );
}
