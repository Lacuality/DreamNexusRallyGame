import { DREAM_NEXUS_COLORS } from "@/lib/constants";

interface FullscreenButtonProps {
  isFullscreen: boolean;
  onClick: () => void;
  isSupported: boolean;
}

export function FullscreenButton({ isFullscreen, onClick, isSupported }: FullscreenButtonProps) {
  if (!isSupported) return null;

  return (
    <button
      onClick={onClick}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        width: "48px",
        height: "48px",
        background: "rgba(14, 27, 36, 0.7)",
        backdropFilter: "blur(10px)",
        border: `2px solid ${DREAM_NEXUS_COLORS.cyan}`,
        borderRadius: "12px",
        color: DREAM_NEXUS_COLORS.cyan,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        boxShadow: "0 0 15px rgba(36, 160, 206, 0.3)",
        transition: "all 0.3s ease",
        zIndex: 20,
        pointerEvents: "auto",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(36, 160, 206, 0.2)";
        e.currentTarget.style.borderColor = "#5dd6ff";
        e.currentTarget.style.boxShadow = "0 0 25px rgba(36, 160, 206, 0.6)";
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(14, 27, 36, 0.7)";
        e.currentTarget.style.borderColor = DREAM_NEXUS_COLORS.cyan;
        e.currentTarget.style.boxShadow = "0 0 15px rgba(36, 160, 206, 0.3)";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isFullscreen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      )}
    </button>
  );
}
