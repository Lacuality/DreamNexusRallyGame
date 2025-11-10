import { useEffect, useState } from "react";
import { DREAM_NEXUS_COLORS } from "@/lib/constants";
import { useRally } from "@/lib/stores/useRally";

interface LeaderboardEntry {
  id: number;
  playerName: string;
  score: number;
  distance: number;
  createdAt: string;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scoreSubmitted = useRally((state) => state.scoreSubmitted);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/leaderboard");
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      const data = await response.json();
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Could not load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [scoreSubmitted]);

  if (loading) {
    return (
      <div
        style={{
          color: DREAM_NEXUS_COLORS.cyan,
          textAlign: "center",
          padding: "20px",
          fontFamily: "monospace",
        }}
      >
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          color: DREAM_NEXUS_COLORS.warm,
          textAlign: "center",
          padding: "20px",
          fontFamily: "monospace",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "500px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(6px)",
        padding: "clamp(14px, 2vw, 22px)",
        borderRadius: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: "1em",
          fontFamily: "monospace",
          color: DREAM_NEXUS_COLORS.cyan,
          fontSize: "clamp(18px, 2.4vw, 24px)",
          textAlign: "center",
        }}
      >
        🏆 Top 10 Leaderboard
      </h3>

      {leaderboard.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "monospace",
            fontSize: "clamp(14px, 2vw, 16px)",
          }}
        >
          No scores yet. Be the first!
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "8px",
          }}
        >
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "12px",
                alignItems: "center",
                padding: "10px 12px",
                background:
                  index === 0
                    ? "rgba(255, 215, 0, 0.15)"
                    : index === 1
                    ? "rgba(192, 192, 192, 0.12)"
                    : index === 2
                    ? "rgba(205, 127, 50, 0.12)"
                    : "rgba(255,255,255,0.05)",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "clamp(14px, 2vw, 16px)",
              }}
            >
              <span
                style={{
                  color:
                    index === 0
                      ? "#FFD700"
                      : index === 1
                      ? "#C0C0C0"
                      : index === 2
                      ? "#CD7F32"
                      : DREAM_NEXUS_COLORS.cyan,
                  fontWeight: "bold",
                  minWidth: "30px",
                }}
              >
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
              </span>
              <span
                style={{
                  color: DREAM_NEXUS_COLORS.white,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.playerName}
              </span>
              <span
                style={{
                  color: DREAM_NEXUS_COLORS.cyan,
                  fontWeight: "bold",
                  textAlign: "right",
                }}
              >
                {entry.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
