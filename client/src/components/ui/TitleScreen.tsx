import { useEffect, useMemo, useState } from "react";
import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { CarSelector } from "./CarSelector";
import { Leaderboard } from "./Leaderboard";

export function TitleScreen() {
  const {
    start,
    highScore,
    loadHighScore,
    playerName,
    setPlayerName,
    loadPlayerName,
    loadCareerProgress,
  } = useRally();
  const [nameInput, setNameInput] = useState("");
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    loadHighScore();
    loadPlayerName();
    loadCareerProgress();
  }, [loadHighScore, loadPlayerName, loadCareerProgress]);

  useEffect(() => {
    if (playerName) setNameInput(playerName);
  }, [playerName]);

  // keep body from scrolling behind the modal title screen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  // responsive breakpoint
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleStart = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setPlayerName(trimmed);
      start();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleStart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nameInput]);

  // sizes
  const s = useMemo(
    () => ({
      title: "clamp(28px, 6vw, 64px)",
      subtitle: "clamp(14px, 2.2vw, 20px)",
      pad: "clamp(14px, 2vw, 22px)",
      gap: "clamp(14px, 2.2vw, 22px)",
      logo: "min(28vh, 36vw)",
      bunny: "clamp(56px, 8vw, 84px)",
      buttonFont: "clamp(16px, 2.2vw, 22px)",
      buttonPadY: "clamp(12px, 1.8vw, 16px)",
      buttonPadX: "clamp(28px, 5vw, 52px)",
      hud: "clamp(14px, 2vw, 18px)",
      maxW: "min(1200px, 94vw)",
      carH: "clamp(180px, 24vh, 240px)",
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
        // single viewport surface
        height: "100dvh",
        display: "grid",
        placeItems: "center",
        padding:
          "max(env(safe-area-inset-top, 16px), 16px) max(env(safe-area-inset-right, 16px), 16px) max(env(safe-area-inset-bottom, 16px), 16px) max(env(safe-area-inset-left, 16px), 16px)",
      }}
    >
      {/* Layout container: desktop = 2 columns, mobile = 1 column; only this can scroll if needed */}
      <div
        style={{
          width: s.maxW,
          height: "100%",
          display: "grid",
          gap: s.gap,
          gridTemplateColumns: isDesktop ? "minmax(0,1fr) 360px" : "1fr",
          gridTemplateRows: isDesktop ? "1fr" : "auto",
          overflowY: "auto",
          overflowX: "hidden",
          // smooth scrolling if content exceeds on short screens
          scrollBehavior: "smooth",
        }}
      >
        {/* LEFT: Main content */}
        <div
          style={{
            display: "grid",
            alignContent: "start",
            gap: s.gap,
            // reserve space so CTA rarely goes below fold on desktop
            gridAutoRows: "min-content",
          }}
        >
          {/* Logo */}
          <div style={{ justifySelf: "center", position: "relative" }}>
            <img
              src="/dream-nexus-logo.png"
              alt="Dream Nexus"
              style={{
                width: s.logo,
                height: "auto",
                display: "block",
                filter: "drop-shadow(0 0 24px rgba(0, 200, 255, 0.22))",
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
                  "radial-gradient(60% 60% at 50% 50%, rgba(0,170,210,0.14), transparent 70%)",
                pointerEvents: "none",
                animation: "logoPulse 4s ease-in-out infinite",
              }}
            />
          </div>

          {/* Title + Tagline */}
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "monospace",
                fontSize: s.title,
                letterSpacing: "0.04em",
                color: DREAM_NEXUS_COLORS.cyan,
                margin: 0,
              }}
            >
              Dream Nexus Rally
            </h1>
            <p
              style={{
                fontSize: s.subtitle,
                color: DREAM_NEXUS_COLORS.warm,
                margin: "8px 0 0 0",
              }}
            >
              Help <strong>Pixel the Bunny</strong> race through Colombia!
            </p>
          </div>

          {/* Car Selector */}
          <div
            style={{
              justifySelf: "center",
              width: "min(500px, 100%)",
            }}
          >
            <CarSelector />
          </div>

          {/* Controls */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: s.gap,
              alignItems: "center",
              justifySelf: "center",
              width: "min(760px, 100%)",
            }}
          >
            <img
              src="/pixel-bunny.png"
              alt="Pixel the Bunny"
              style={{
                width: s.bunny,
                height: s.bunny,
                objectFit: "contain",
                filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.35))",
              }}
            />
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
                padding: s.pad,
                borderRadius: "14px",
                boxShadow: "inset 0 10px 30px rgba(0,0,0,0.15)",
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
                  gap: 8,
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

          {/* Name + Start */}
          <div
            style={{
              justifySelf: "center",
              width: "min(440px, 100%)",
              display: "grid",
              gap: 10,
            }}
          >
            <label
              style={{
                display: "block",
                fontFamily: "monospace",
                color: DREAM_NEXUS_COLORS.cyan,
                fontSize: "clamp(16px, 2.2vw, 20px)",
                textAlign: "center",
              }}
            >
              Enter Your Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Player Name"
              maxLength={20}
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: "clamp(16px, 2.2vw, 20px)",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.1)",
                border: `2px solid ${DREAM_NEXUS_COLORS.cyan}`,
                borderRadius: 8,
                color: DREAM_NEXUS_COLORS.white,
                textAlign: "center",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.borderColor = "#5dd6ff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = DREAM_NEXUS_COLORS.cyan;
              }}
            />

            {highScore > 0 && (
              <div
                style={{
                  fontSize: s.hud,
                  color: DREAM_NEXUS_COLORS.cyan,
                  textAlign: "center",
                }}
              >
                Your High Score: {highScore}m
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={!nameInput.trim()}
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: s.buttonFont,
                padding: `${s.buttonPadY} ${s.buttonPadX}`,
                background: nameInput.trim()
                  ? `linear-gradient(180deg, ${DREAM_NEXUS_COLORS.cyan}, #5dd6ff)`
                  : "rgba(150,150,150,0.5)",
                color: nameInput.trim()
                  ? DREAM_NEXUS_COLORS.navy
                  : "rgba(255,255,255,0.5)",
                border: "0",
                borderRadius: 12,
                cursor: nameInput.trim() ? "pointer" : "not-allowed",
                boxShadow: nameInput.trim()
                  ? "0 10px 22px rgba(0,180,220,0.30), 0 1px 0 rgba(255,255,255,0.3) inset"
                  : "none",
                transform: "translateZ(0)",
                transition: "transform .18s ease, box-shadow .18s ease",
                opacity: nameInput.trim() ? 1 : 0.6,
                justifySelf: "center",
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

            <div
              style={{
                textAlign: "center",
                fontSize: "clamp(12px, 1.8vw, 14px)",
                color: DREAM_NEXUS_COLORS.warm,
                opacity: 0.9,
              }}
            >
              Sponsored by Dream Nexus
            </div>
          </div>
        </div>

        {/* RIGHT: Leaderboard (sticky on desktop, flows below on mobile) */}
        <aside
          style={{
            display: "grid",
            alignContent: "start",
            gap: s.gap,
            ...(isDesktop
              ? {
                  position: "sticky" as const,
                  top: 0,
                  height: "fit-content",
                  maxHeight: "calc(100dvh - 2px)",
                  overflow: "auto",
                }
              : {}),
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(6px)",
              padding: s.pad,
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              width: isDesktop ? "100%" : "min(540px, 100%)",
              justifySelf: isDesktop ? "stretch" : "center",
            }}
          >
            <Leaderboard />
          </div>
        </aside>
      </div>

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
        gap: 12,
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
