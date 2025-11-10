import { ReactNode, CSSProperties } from "react";

interface HolographicPanelProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function HolographicPanel({ children, style, className }: HolographicPanelProps) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(14, 27, 36, 0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(36, 160, 206, 0.3)",
        borderRadius: "16px",
        padding: "clamp(16px, 2.5vw, 28px)",
        boxShadow: 
          "0 8px 32px rgba(0, 0, 0, 0.4), " +
          "inset 0 1px 0 rgba(255, 255, 255, 0.1), " +
          "0 0 20px rgba(36, 160, 206, 0.15)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "200%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(36, 160, 206, 0.1), transparent)",
          animation: "hologramScan 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
