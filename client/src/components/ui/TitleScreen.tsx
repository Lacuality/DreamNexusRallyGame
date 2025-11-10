import { useRally } from "@/lib/stores/useRally";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { useEffect } from "react";

export function TitleScreen() {
  const { start, highScore, loadHighScore } = useRally();

  useEffect(() => {
    loadHighScore();
  }, [loadHighScore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  return (
    <>
      {/* Local styles so you don’t need a CSS file */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: .65; }
          50% { opacity: 1; }
        }
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .tnx-screen {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;            /* fits real viewport on mobile, too */
          display: grid;
          place-items: center;
          z-index: 1000;
          color: ${DREAM_NEXUS_COLORS.white};
          overflow: hidden;
          background: radial-gradient(60rem 60rem at 50% 0%,
                      rgba(36,160,206,.22), transparent 45%)
                      ,
                      linear-gradient(120deg,
                        #061922, #0a2530, #091e2b);
          background-size: 120% 120%;
          animation: bgShift 18s ease-in-out infinite;
        }
        .tnx-wrap {
          /* Responsive max width and safe paddings */
          width: min(1050px, 92vw);
          padding-inline: clamp(16px, 3vw, 32px);
          padding-block: clamp(18px, 3vh, 28px);
          display: grid;
          gap: clamp(18px, 3.6vh, 28px);
          justify-items: center;
        }
        .tnx-logoBox {
          position: relative;
          display: grid;
          place-items: center;
          width: min(560px, 72vw);
          aspect-ratio: 16 / 10;
          border-radius: 18px;
          background: #0f1820;
          box-shadow:
            0 0 0 1px rgba(36,160,206,.12) inset,
            0 8px 40px rgba(0,0,0,.55),
            0 0 120px rgba(36,160,206,.22);
          animation: pulse 5s ease-in-out infinite;
        }
        .tnx-logo {
          width: 78%;
          height: auto;
          filter: drop-shadow(0 4px 18px rgba(36,160,206,.25));
        }
        .tnx-title {
          margin: 0;
          text-align: center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-weight: 800;
          letter-spacing: .02em;
          line-height: 1.1;
          font-size: clamp(28px, 6.5vw, 72px);
          color: ${DREAM_NEXUS_COLORS.cyan};
          text-shadow:
            0 1px 0 #021018,
            0 8px 60px rgba(36,160,206,.32);
        }
        .tnx-sub {
          margin: 0;
          max-width: 58ch;
          text-align: center;
          font-size: clamp(14px, 2.4vw, 18px);
          color: ${DREAM_NEXUS_COLORS.warm};
        }
        .tnx-card {
          width: min(820px, 92vw);
          display: grid;
          grid-template-columns: auto 1fr;
          gap: clamp(16px, 3vw, 24px);
          align-items: center;
          padding: clamp(16px, 3vw, 22px);
          border-radius: 14px;
          background: rgba(255,255,255,.06);
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 40px rgba(0,0,0,.35);
        }
        .tnx-bunny {
          width: clamp(64px, 10vw, 92px);
          height: clamp(64px, 10vw, 92px);
          object-fit: contain;
          animation: float 4s ease-in-out infinite;
          filter: drop-shadow(0 6px 18px rgba(36,160,206,.35));
        }
        .tnx-controls {
          display: grid;
          gap: 8px;
          font-size: clamp(13px, 2.2vw, 16px);
          line-height: 1.7;
        }
        .tnx-high {
          font-size: clamp(16px, 3vw, 22px);
          color: ${DREAM_NEXUS_COLORS.cyan};
          text-shadow: 0 0 1px rgba(36,160,206,.45);
        }
        .tnx-cta {
          margin-top: clamp(4px, 1vh, 12px);
          font-size: clamp(18px, 4.6vw, 28px);
          padding: clamp(10px, 2vh, 16px) clamp(28px, 6vw, 56px);
          border: none;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          color: ${DREAM_NEXUS_COLORS.navy};
          background: linear-gradient(180deg,
            ${DREAM_NEXUS_COLORS.cyan}, #39b8e3);
          box-shadow:
            0 12px 30px rgba(36,160,206,.35),
            0 0 0 1px rgba(255,255,255,.06) inset;
          transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
        }
        .tnx-cta:hover { transform: translateY(-2px); filter: brightness(1.03); }
        .tnx-cta:active { transform: translateY(0); filter: brightness(.97); }
        .tnx-foot {
          position: absolute;
          bottom: clamp(10px, 2vh, 22px);
          font-size: clamp(12px, 2.2vw, 14px);
          color: ${DREAM_NEXUS_COLORS.warm};
          opacity: .9;
        }
        /* In case content ever grows taller than 100dvh (tiny phones) */
        .tnx-screen:has(.tnx-wrap[data-scroll="true"]) {
          overflow-y: auto;
        }
      `}</style>

      <div className="tnx-screen">
        <div className="tnx-wrap">
          <div className="tnx-logoBox" aria-hidden>
            <img src="/dream-nexus-logo.png" className="tnx-logo" alt="Dream Nexus" />
          </div>

          <h1 className="tnx-title">Dream Nexus Rally</h1>

          <p className="tnx-sub">
            Help <strong>Pixel the Bunny</strong> race through Colombia!
          </p>

          <div className="tnx-card">
            <img src="/pixel-bunny.png" className="tnx-bunny" alt="Pixel the Bunny" />
            <div className="tnx-controls">
              <div><strong>↑ / W</strong> — Accelerate</div>
              <div><strong>↓ / S</strong> — Brake</div>
              <div><strong>← / A</strong> — Steer Left</div>
              <div><strong>→ / D</strong> — Steer Right</div>
              <div><strong>P</strong> — Pause</div>
            </div>
          </div>

          {highScore > 0 && (
            <div className="tnx-high">High Score: {highScore}m</div>
          )}

          <button className="tnx-cta" onClick={start}>
            START — Press Enter
          </button>
        </div>

        <div className="tnx-foot">Sponsored by Dream Nexus</div>
      </div>
    </>
  );
}
