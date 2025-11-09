import { useState } from "react";
import { GAME_CONFIG, DREAM_NEXUS_COLORS } from "@/lib/constants";

export function TuningPanel() {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          top: "100px",
          right: "20px",
          padding: "10px 15px",
          backgroundColor: "rgba(85, 85, 85, 0.8)",
          color: DREAM_NEXUS_COLORS.white,
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "14px",
          zIndex: 150,
        }}
      >
        🔧 Tuning
      </button>
    );
  }
  
  return (
    <div
      style={{
        position: "fixed",
        top: "100px",
        right: "20px",
        backgroundColor: "rgba(14, 27, 36, 0.95)",
        padding: "20px",
        borderRadius: "10px",
        border: `2px solid ${DREAM_NEXUS_COLORS.cyan}`,
        fontFamily: "monospace",
        fontSize: "14px",
        color: DREAM_NEXUS_COLORS.white,
        width: "300px",
        zIndex: 150,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        <h3 style={{ color: DREAM_NEXUS_COLORS.cyan, margin: 0 }}>Tuning Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            backgroundColor: "transparent",
            color: DREAM_NEXUS_COLORS.white,
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: DREAM_NEXUS_COLORS.warm }}>Lane Width</div>
        <div>{GAME_CONFIG.LANE_WIDTH}m (Fixed)</div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: DREAM_NEXUS_COLORS.warm }}>Max Speed</div>
        <div>{GAME_CONFIG.MAX_SPEED_KMH} km/h</div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: DREAM_NEXUS_COLORS.warm }}>Obstacle Base Density</div>
        <div>{(GAME_CONFIG.OBSTACLE_DENSITY_BASE * 100).toFixed(1)}%</div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: DREAM_NEXUS_COLORS.warm }}>Curve Frequency</div>
        <div>{(GAME_CONFIG.CURVE_FREQUENCY_BASE * 100).toFixed(1)}%</div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: DREAM_NEXUS_COLORS.warm }}>Difficulty Ramp Interval</div>
        <div>{GAME_CONFIG.DIFFICULTY_RAMP_INTERVAL / 1000}s</div>
      </div>
      
      <div style={{ fontSize: "12px", color: "#888", marginTop: "15px" }}>
        Note: These values are read-only. Modify GAME_CONFIG in constants.ts to change them.
      </div>
    </div>
  );
}
