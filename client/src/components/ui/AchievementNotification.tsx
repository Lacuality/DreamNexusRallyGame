import { useEffect, useState } from "react";
import { useAchievements, type Achievement } from "@/lib/stores/useAchievements";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";

export function AchievementNotification() {
  const recentUnlock = useAchievements((state) => state.recentUnlock);
  const clearRecentUnlock = useAchievements((state) => state.clearRecentUnlock);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recentUnlock) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(clearRecentUnlock, 300);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [recentUnlock, clearRecentUnlock]);

  if (!recentUnlock || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "rgba(14, 27, 36, 0.95)",
        padding: "30px 40px",
        borderRadius: "15px",
        border: `3px solid ${DREAM_NEXUS_COLORS.cyan}`,
        color: DREAM_NEXUS_COLORS.white,
        fontFamily: "monospace",
        zIndex: 10000,
        minWidth: "350px",
        textAlign: "center",
        boxShadow: `0 0 30px ${DREAM_NEXUS_COLORS.cyan}`,
        animation: "achievementPop 0.3s ease-out",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "15px" }}>
        {recentUnlock.icon}
      </div>
      <div style={{ fontSize: "14px", color: DREAM_NEXUS_COLORS.cyan, marginBottom: "8px", fontWeight: "bold" }}>
        ACHIEVEMENT UNLOCKED!
      </div>
      <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px", color: DREAM_NEXUS_COLORS.warm }}>
        {recentUnlock.name}
      </div>
      <div style={{ fontSize: "14px", color: "#aaa" }}>
        {recentUnlock.description}
      </div>
      <div style={{ fontSize: "16px", color: DREAM_NEXUS_COLORS.cyan, marginTop: "15px", fontWeight: "bold" }}>
        +{recentUnlock.points} points
      </div>

      <style>{`
        @keyframes achievementPop {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
