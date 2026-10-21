import { useState } from "react";
import { Lock, Play, Star } from "lucide-react";
import { REGIONS, COLOMBIA_OUTLINE, project, MAP_ASPECT } from "@/lib/game/regions";
import { CHAPTERS, type Chapter } from "@/lib/game/story";
import { useProfile } from "@/lib/stores/useProfile";
import { MenuShell, Card } from "./MenuShell";
import { BigButton, UI } from "../gameUi";

export function chapterUnlocked(story: Record<string, number>, ch: Chapter) {
  if (ch.num === 1) return true;
  const prev = CHAPTERS.find((c) => c.num === ch.num - 1);
  return !!prev && (story[prev.id] ?? 0) > 0;
}

function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[0, 1, 2].map((i) => (
        <Star key={i} size={size} color={UI.gold} fill={i < n ? UI.gold : "transparent"} strokeWidth={2.5} />
      ))}
    </span>
  );
}

/**
 * Map of Colombia: shows every region (visited ones light up) and the
 * Story Mode route. mode="story" puts the chapters first.
 */
export function ColombiaMap({ mode, onClose, onPlayChapter }: { mode: "story" | "atlas"; onClose: () => void; onPlayChapter: (id: string) => void }) {
  const regions = useProfile((s) => s.progress.regions);
  const story = useProfile((s) => s.story);
  const firstOpen = CHAPTERS.find((c) => chapterUnlocked(story, c) && !(story[c.id] > 0)) ?? CHAPTERS[0];
  const [sel, setSel] = useState<{ kind: "chapter"; id: string } | { kind: "region"; biome: string }>(
    mode === "story" ? { kind: "chapter", id: firstOpen.id } : { kind: "region", biome: regions[regions.length - 1] ?? "coffee_hills" },
  );
  const W = 340;
  const H = W * MAP_ASPECT;
  const outline = COLOMBIA_OUTLINE.map(([lo, la]) => project(lo, la, W).join(",")).join(" ");
  const route = CHAPTERS.map((c) => project(c.map.lon, c.map.lat, W).join(",")).join(" ");
  const totalStars = CHAPTERS.reduce((n, c) => n + (story[c.id] ?? 0), 0);

  const selChapter = sel.kind === "chapter" ? CHAPTERS.find((c) => c.id === sel.id)! : null;
  const selRegion = sel.kind === "region" ? REGIONS.find((r) => r.biome === sel.biome)! : selChapter ? REGIONS.find((r) => r.biome === selChapter.biome) : null;

  return (
    <MenuShell title={mode === "story" ? "📖 La Ruta de Pixel" : "🗺️ Map of Colombia"} onClose={onClose} wide>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", justifyContent: "center" }}>
        {/* the map */}
        <div style={{ flex: "0 1 380px", maxWidth: "100%" }}>
          <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4f9a3c" />
                <stop offset="1" stopColor="#2f7a36" />
              </linearGradient>
            </defs>
            <text x={20} y={30} fill="#5fd8ff" opacity={0.5} fontSize={14} fontWeight={800}>
              Mar Caribe
            </text>
            <text x={10} y={H * 0.45} fill="#5fd8ff" opacity={0.5} fontSize={14} fontWeight={800} transform={`rotate(-70 10 ${H * 0.45})`}>
              Océano Pacífico
            </text>
            <polygon points={outline} fill="url(#land)" stroke="#FDC6B5" strokeWidth={3} strokeLinejoin="round" />
            {/* tricolor ribbon */}
            <g transform={`translate(${W - 90}, ${H - 50})`}>
              <rect width={60} height={18} fill="#FCD116" rx={3} />
              <rect y={18} width={60} height={9} fill="#003893" />
              <rect y={27} width={60} height={9} fill="#CE1126" rx={3} />
            </g>
            <polyline points={route} fill="none" stroke="#ffd23f" strokeWidth={3} strokeDasharray="6 6" opacity={0.85} />
            {/* Tocancipá race track */}
            {(() => {
              const [x, y] = project(-73.9, 4.96, W); // Tocancipá
              return (
                <g transform={`translate(${x},${y})`}>
                  <text fontSize={16} textAnchor="middle" dy={6}>
                    🏁
                  </text>
                </g>
              );
            })()}
            {/* regions */}
            {REGIONS.map((r) => {
              const [x, y] = project(r.lon, r.lat, W);
              const seen = regions.includes(r.biome);
              const isSel = selRegion?.biome === r.biome && sel.kind === "region";
              const dx = r.biome === "comuna_13" ? -16 : r.biome === "pueblo" ? 16 : 0;
              return (
                <g
                  key={r.biome}
                  transform={`translate(${x + dx},${y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSel({ kind: "region", biome: r.biome })}
                >
                  <circle r={isSel ? 18 : 15} fill={seen ? "#0E1B24" : "#2a2f36"} stroke={isSel ? "#ffd23f" : seen ? "#5fd8ff" : "#666"} strokeWidth={3} />
                  <text fontSize={16} textAnchor="middle" dy={6} style={{ filter: seen ? "none" : "grayscale(1)", opacity: seen ? 1 : 0.5 }}>
                    {seen ? r.emoji : "?"}
                  </text>
                </g>
              );
            })}
            {/* chapter numbers */}
            {CHAPTERS.map((c) => {
              const [x, y] = project(c.map.lon, c.map.lat, W);
              const open = chapterUnlocked(story, c);
              const dx = c.biome === "comuna_13" ? -16 : c.biome === "pueblo" ? 16 : 0;
              const isSel = sel.kind === "chapter" && sel.id === c.id;
              return (
                <g key={c.id} transform={`translate(${x + dx + 13},${y - 13})`} style={{ cursor: "pointer" }} onClick={() => setSel({ kind: "chapter", id: c.id })}>
                  <circle r={isSel ? 11 : 9} fill={story[c.id] ? "#ffd23f" : open ? "#24A0CE" : "#555"} stroke="#0E1B24" strokeWidth={2} />
                  <text fontSize={11} fontWeight={900} textAnchor="middle" dy={4} fill="#0E1B24">
                    {c.num}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ textAlign: "center", fontWeight: 800, opacity: 0.85 }}>
            {regions.length}/{REGIONS.length} regions visited · ⭐ {totalStars}/{CHAPTERS.length * 3}
          </div>
        </div>

        {/* details + chapter list */}
        <div style={{ flex: "1 1 320px", display: "grid", gap: 10, minWidth: 0 }}>
          {selChapter && (
            <Card active>
              <div style={{ fontSize: 13, fontWeight: 800, color: UI.warm }}>CHAPTER {selChapter.num} · {selChapter.region}</div>
              <div style={{ fontFamily: UI.display, fontSize: 22 }}>{selChapter.title}</div>
              <div style={{ margin: "6px 0", fontWeight: 800 }}>🎯 {selChapter.goal.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 14 }}>
                <Stars n={story[selChapter.id] ?? 0} /> <span>Reward: 🍯 {selChapter.reward}</span>
              </div>
              <div style={{ marginTop: 10 }}>
                {chapterUnlocked(story, selChapter) ? (
                  <BigButton onClick={() => onPlayChapter(selChapter.id)} color={UI.gold} style={{ width: "100%" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Play size={24} fill="currentColor" /> {story[selChapter.id] ? "PLAY AGAIN" : "PLAY CHAPTER"}
                    </span>
                  </BigButton>
                ) : (
                  <div style={{ fontWeight: 800, color: UI.warm, display: "flex", gap: 6, alignItems: "center" }}>
                    <Lock size={18} /> Finish chapter {selChapter.num - 1} first
                  </div>
                )}
              </div>
            </Card>
          )}
          {selRegion && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 36 }}>{regions.includes(selRegion.biome) ? selRegion.emoji : "❓"}</div>
                <div>
                  <div style={{ fontFamily: UI.display, fontSize: 19 }}>{selRegion.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.8 }}>{selRegion.place}</div>
                </div>
              </div>
              <p style={{ margin: "8px 0 0", fontWeight: 700, lineHeight: 1.4 }}>
                {regions.includes(selRegion.biome) ? selRegion.fact : "Not visited yet — drive further in the Endless Rally (or play the story) to discover it."}
              </p>
            </Card>
          )}
          {mode === "story" && (
            <div style={{ display: "grid", gap: 6 }}>
              {CHAPTERS.map((c) => {
                const open = chapterUnlocked(story, c);
                return (
                  <Card key={c.id} locked={!open} active={sel.kind === "chapter" && sel.id === c.id} onClick={() => setSel({ kind: "chapter", id: c.id })} style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: UI.display, fontSize: 18, width: 24, color: open ? UI.cyanBright : "#777" }}>{c.num}</span>
                      <span style={{ flex: 1, fontWeight: 900 }}>{c.title}</span>
                      {open ? <Stars n={story[c.id] ?? 0} size={14} /> : <Lock size={16} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MenuShell>
  );
}
