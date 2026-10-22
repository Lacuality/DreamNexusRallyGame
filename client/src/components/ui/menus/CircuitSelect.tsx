import { Play, Trophy, Timer } from "lucide-react";
import { CIRCUITS, type Circuit } from "@/lib/game/circuits";
import { useProfile } from "@/lib/stores/useProfile";
import { formatTime } from "@/lib/game/race";
import { loopPoint } from "../GameHUD";
import { MenuShell, Card } from "./MenuShell";
import { BigButton, UI } from "../gameUi";

export function CircuitThumb({ c, size = 90 }: { c: Circuit; size?: number }) {
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const [x, y] = loopPoint(i / 100, c.shape);
    pts.push(`${x * size},${y * size}`);
  }
  const d = "M" + pts.join("L");
  const [sx, sy] = loopPoint(0, c.shape);
  return (
    <svg width={size} height={size} style={{ flex: "none", background: c.night ? "#1a0b2e" : "rgba(0,0,0,0.3)", borderRadius: 14 }}>
      <path d={d} fill="none" stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c.night ? "#ff4f9a" : "#3a3d42"} strokeWidth={3} strokeLinejoin="round" />
      <rect x={sx * size - 5} y={sy * size - 2} width={10} height={4} fill="#ffd23f" />
    </svg>
  );
}

/** Pick a circuit to race against 5 AI rivals. */
export function CircuitSelect({ onClose, onRace, title = "🏎️ Circuit Race", intro }: { onClose: () => void; onRace: (id: string) => void; title?: string; intro?: string }) {
  const bestLaps = useProfile((s) => s.bestLaps);
  const wins = useProfile((s) => s.circuitWins);
  return (
    <MenuShell title={title} onClose={onClose}>
      <p style={{ fontWeight: 800, marginTop: 0, opacity: 0.85 }}>
        {intro ?? "3 laps against 5 rivals. Hit the blue boost pads, grab jars for nitro, and bump your way to the podium. 🏆 1st = 150 jars."}
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {CIRCUITS.map((c) => (
          <Card key={c.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <CircuitThumb c={c} />
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ fontFamily: UI.display, fontSize: 19 }}>{c.name}</div>
                <div style={{ fontWeight: 800, fontSize: 13, color: UI.warm }}>{c.place}</div>
                <div style={{ fontWeight: 700, fontSize: 13, margin: "4px 0" }}>{c.blurb}</div>
                <div style={{ display: "flex", gap: 14, fontWeight: 800, fontSize: 13, opacity: 0.9 }}>
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <Timer size={15} /> Best lap {bestLaps[c.id] ? formatTime(bestLaps[c.id]) : "—"}
                  </span>
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <Trophy size={15} color={UI.gold} /> {wins[c.id] ?? 0} wins
                  </span>
                </div>
              </div>
              <BigButton onClick={() => onRace(c.id)} color={UI.gold} style={{ flex: "0 0 auto" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Play size={22} fill="currentColor" /> RACE
                </span>
              </BigButton>
            </div>
          </Card>
        ))}
      </div>
    </MenuShell>
  );
}
