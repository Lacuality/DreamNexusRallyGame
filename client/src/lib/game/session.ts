import { setTrack } from "../track";
import { loadout, type Loadout } from "./garage";
import { circuitById } from "./circuits";
import { chapterById } from "./story";
import { useProfile } from "../stores/useProfile";
import { CLASS_INFO, type EngineClass } from "./cup";

/** What kind of race is being played right now. */
export type Session =
  | { mode: "endless" }
  | { mode: "circuit"; circuitId: string; laps: number; cc?: EngineClass } // single VS race (items on)
  | { mode: "gp"; circuitId: string; laps: number; cc: EngineClass; cupId: string; round: number } // Grand Prix round
  | { mode: "timetrial"; circuitId: string; laps: number } // alone, no items
  | { mode: "battle"; circuitId: string; laps: number }
  | { mode: "story"; chapterId: string }
  | { mode: "online"; circuitId: string; laps: number; room: string; battle?: boolean };

export let session: Session = { mode: "endless" };
export let car: Loadout = loadout("rally7", "pixel");

/** Is this race on a closed circuit (with laps and other cars)? */
export function sessionCircuit(): { id: string; laps: number } | null {
  if (session.mode === "circuit" || session.mode === "battle" || session.mode === "online" || session.mode === "gp" || session.mode === "timetrial")
    return { id: session.circuitId, laps: session.laps };
  if (session.mode === "story") {
    const ch = chapterById(session.chapterId);
    if (ch.stage.kind === "circuit") return { id: ch.stage.circuitId, laps: ch.stage.laps };
  }
  return null;
}

/** Are items on in this race? (Every race has them, Mario Kart style — except time trials.) */
export function isBattle() {
  return session.mode === "battle" || session.mode === "circuit" || session.mode === "gp" || (session.mode === "online" && !!session.battle);
}

/** Engine class of this race (speed + rival skill scaling). */
export function engineClass(): EngineClass {
  if (session.mode === "gp") return session.cc;
  if (session.mode === "circuit") return session.cc ?? 150;
  return 150;
}
export function classSpeed() {
  return CLASS_INFO[engineClass()].speed;
}
export function classRivals() {
  return CLASS_INFO[engineClass()].rivals;
}

/** Is this a race against the AI grid? */
export function hasRivals() {
  return session.mode !== "timetrial" && sessionCircuit() !== null && session.mode !== "online";
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
