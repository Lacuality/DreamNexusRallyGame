import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMobileControls } from "@/lib/stores/useMobileControls";

export function MobileControls() {
  const isMobile = useIsMobile();
  const { setLeft, setRight, setForward, setBack } = useMobileControls();
  
  if (!isMobile) return null;
  
  const buttonStyle = {
    width: "80px",
    height: "80px",
    backgroundColor: "rgba(36, 160, 206, 0.7)",
    border: `3px solid ${DREAM_NEXUS_COLORS.cyan}`,
    borderRadius: "50%",
    color: DREAM_NEXUS_COLORS.white,
    fontSize: "24px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none" as const,
    touchAction: "none" as const,
  };
  
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100vw",
        height: "200px",
        zIndex: 200,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: "30px",
          display: "flex",
          gap: "20px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={buttonStyle}
          onTouchStart={() => setLeft(true)}
          onTouchEnd={() => setLeft(false)}
        >
          ←
        </div>
        <div
          style={buttonStyle}
          onTouchStart={() => setRight(true)}
          onTouchEnd={() => setRight(false)}
        >
          →
        </div>
      </div>
      
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          right: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={buttonStyle}
          onTouchStart={() => setForward(true)}
          onTouchEnd={() => setForward(false)}
        >
          ↑
        </div>
        <div
          style={buttonStyle}
          onTouchStart={() => setBack(true)}
          onTouchEnd={() => setBack(false)}
        >
          ↓
        </div>
      </div>
    </div>
  );
}
