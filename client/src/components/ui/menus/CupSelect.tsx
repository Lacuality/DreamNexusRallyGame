import { useState } from "react";
import { Play } from "lucide-react";
import { CUPS, CLASSES, CLASS_INFO, TROPHY_EMOJI, type EngineClass } from "@/lib/game/cup";
import { circuitById } from "@/lib/game/circuits";
import { useProfile } from "@/lib/stores/useProfile";
import { MenuShell, Card } from "./MenuShell";
import { CircuitThumb } from "./CircuitSelect";
import { BigButton, UI } from "../gameUi";

/** Grand Prix: pick a cup and an engine class. */
export function CupSelect({ onClose, onStart }: { onClose: () => void; onStart: (cupId: string, cc: EngineClass) => void }) {
  const trophies = useProfile((s) => s.trophies);
  const [cc, setCc] = useState<EngineClass>(100);
  return (
    <MenuShell title="🏆 Grand Prix" onClose={onClose}>
      <p style={{ fontWeight: 800, marginTop: 0, opacity: 0.85 }}>
        A cup is a series of races against 7 rivals with items on. Points per race: 9 · 6 · 3 · 1. Most points at the end takes the trophy.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
        {CLASSES.map((c) => (
          <Card key={c} active={cc === c} onClick={() => setCc(c)} style={{ padding: 10, textAlign: "center" }}>
            <div style={{ fontFamily: UI.display, fontSize: 20 }}>{CLASS_INFO[c].label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{CLASS_INFO[c].blurb}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {CUPS.map((cup) => {
          const t = trophies[`${cup.id}:${cc}`];
          return (
            <Card key={cup.id}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 44, lineHeight: 1 }}>{t ? TROPHY_EMOJI[t] : cup.emoji}</div>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ fontFamily: UI.display, fontSize: 19 }}>
                    {cup.name} {t && <span style={{ fontSize: 13, color: UI.gold }}>· {t.toUpperCase()} {cc}cc</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, margin: "4px 0" }}>{cup.blurb}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {cup.circuits.map((id) => (
                      <div key={id} title={circuitById(id).name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 800, opacity: 0.9 }}>
                        <CircuitThumb c={circuitById(id)} size={44} />
                        <span style={{ maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{circuitById(id).name.split(" ").slice(-1)[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <BigButton onClick={() => onStart(cup.id, cc)} color={UI.gold} style={{ flex: "0 0 auto" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Play size={22} fill="currentColor" /> START
                  </span>
                </BigButton>
              </div>
            </Card>
          );
        })}
      </div>
    </MenuShell>
  );
}
