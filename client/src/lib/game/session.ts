import { setTrack } from "../track";
import { loadout, type Loadout } from "./garage";
import { circuitById } from "./circuits";
import { chapterById } from "./story";
import { useProfile } from "../stores/useProfile";

/** What kind of race is being played right now. */
export type Session =
  | { mode: "endless" }
  | { mode: "circuit"; circuitId: string; laps: number }
  | { mode: "battle"; circuitId: string; laps: number }
  | { mode: "story"; chapterId: string }
  | { mode: "online"; circuitId: string; laps: number; room: string; battle?: boolean };

export let session: Session = { mode: "endless" };
export let car: Loadout = loadout("rally7", "pixel");

/** Is this race on a closed circuit (with laps and other cars)? */
export function sessionCircuit(): { id: string; laps: number } | null {
  if (session.mode === "circuit" || session.mode === "battle" || session.mode === "online") return { id: session.circuitId, laps: session.laps };
  if (session.mode === "story") {
    const ch = chapterById(session.chapterId);
    if (ch.stage.kind === "circuit") return { id: ch.stage.circuitId, laps: ch.stage.laps };
  }
  return null;
}

/** Are power-ups (Rally Loco) on in this race? */
export function isBattle() {
  return session.mode === "battle" || (session.mode === "online" && !!session.battle);
}

export function applySession(s: Session) {
  session = s;
  const p = useProfile.getState();
  car = loadout(p.car, p.driver);
  const c = sessionCircuit();
  if (c) {
    const def = circuitById(c.id);
    setTrack({ kind: "circuit", biome: def.biome, shape: def.shape, laps: c.laps });
  } else if (s.mode === "story") {
    setTrack({ kind: "endless", lockedBiome: chapterById(s.chapterId).biome });
  } else {
    setTrack({ kind: "endless" });
  }
}
