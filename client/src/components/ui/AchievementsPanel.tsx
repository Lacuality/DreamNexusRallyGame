import { useEffect, useState } from "react";
import { Lock, Check } from "lucide-react";
import { useAchievements, type Achievement } from "@/lib/stores/useAchievements";
import { useRally } from "@/lib/stores/useRally";
import { isOnline } from "@/lib/db";
import { readBests } from "@/lib/env";
import { useProfile } from "@/lib/stores/useProfile";
import { UI, panelStyle } from "./gameUi";

const ONE_RUN = new Set(["distance", "collectibles", "distance_no_crash", "nitro_uses"]);

function progressOf(a: Achievement, stats: ReturnType<typeof useAchievements.getState>["playerStats"]) {
  const best = readBests();
  switch (a.requirement_type) {
    case "max_speed":
      return Math.max(stats?.max_speed ?? 0, best.maxSpeed);
    case "total_distance":
      return stats?.total_distance ?? 0;
    case "total_collectibles":
      return stats?.total_collectibles ?? 0;
    case "games_played":
      return stats?.total_games ?? 0;
    case "playtime":
      return stats?.playtime_seconds ?? 0;
    case "distance":
      return best.distance;
    case "collectibles":
      return best.jars;
    case "distance_no_crash":
      return best.cleanDistance;
    case "nitro_uses":
      return best.nitroUses;
    case "circuit_wins":
      return Object.values(useProfile.getState().circuitWins).reduce((a, b) => a + b, 0);
    case "regions":
      return useProfile.getState().progress.regions.length;
    default:
      return 0;
  }
}

/** Every achievement, unlocked or not, with progress. */
export function AchievementsPanel() {
  const playerName = useRally((s) => s.playerName);
  const achievements = useAchievements((s) => s.achievements);
  const unlocked = useAchievements((s) => s.unlockedAchievements);
  const stats = useAchievements((s) => s.playerStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const st = useAchievements.getState();
    Promise.all([st.loadAchievements(), playerName ? st.loadPlayerStats(playerName) : Promise.resolve()]).finally(() =>
      setLoading(false),
    );
  }, [playerName]);

  const count = achievements.filter((a) => unlocked.has(a.id)).length;
  const points = achievements.filter((a) => unlocked.has(a.id)).reduce((n, a) => n + (a.points || 0), 0);
  const sorted = [...achievements].sort((a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)));

  return (
    <div style={{ ...panelStyle, padding: "18px 16px", width: "100%", maxHeight: "78vh", overflowY: "auto", fontFamily: UI.body, color: UI.white }}>
      <h3 style={{ fontFamily: UI.display, color: UI.cyanBright, fontSize: 24, margin: "0 0 4px", textAlign: "center" }}>🏅 Achievements</h3>
      {!isOnline ? (
        <p style={{ textAlign: "center", fontWeight: 700, opacity: 0.8 }}>Achievements need the online database.</p>
      ) : !playerName ? (
        <p style={{ textAlign: "center", fontWeight: 700, opacity: 0.8 }}>Type your racer name on the start screen to track your achievements.</p>
      ) : (
        <p style={{ textAlign: "center", fontWeight: 800, color: UI.warm, margin: "0 0 12px" }}>
          {playerName}: {count} / {achievements.length} unlocked · {points} pts
        </p>
      )}
      {loading && <p style={{ textAlign: "center", opacity: 0.7 }}>Loading…</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map((a) => {
          const done = unlocked.has(a.id);
          const p = Math.min(1, progressOf(a, stats) / Math.max(1, a.requirement_value));
          return (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr auto",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 14,
                background: done ? "rgba(255,210,63,0.14)" : "rgba(255,255,255,0.05)",
                border: `2px solid ${done ? "rgba(255,210,63,0.6)" : "rgba(255,255,255,0.08)"}`,
                opacity: done ? 1 : 0.85,
              }}
            >
              <div style={{ fontSize: 30, textAlign: "center", filter: done ? "none" : "grayscale(1)" }}>{a.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, color: done ? UI.gold : UI.white }}>{a.name}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {a.description}
                  {ONE_RUN.has(a.requirement_type) && !/one run/i.test(a.description) ? " · one run" : ""}
                </div>
                {!done && playerName && (
                  <div style={{ height: 6, borderRadius: 4, background: "rgba(0,0,0,0.4)", marginTop: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(p * 100)}%`, height: "100%", background: "linear-gradient(90deg,#24A0CE,#5fd8ff)" }} />
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", fontWeight: 900, fontSize: 13, color: done ? UI.gold : "rgba(255,255,255,0.6)" }}>
                {done ? <Check size={22} strokeWidth={3} /> : <Lock size={20} />}
                <div>+{a.points}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
