import { circuitById } from "./circuits";

/**
 * Grand Prix: a cup is a series of circuits raced back to back. Points per
 * race like Mario Kart 64 (9 / 6 / 3 / 1 for the top four); most points at
 * the end wins the cup. Three engine classes: 50cc (easy, slow), 100cc,
 * 150cc (full speed, sharper rivals).
 */
export type EngineClass = 50 | 100 | 150;
export const CLASSES: EngineClass[] = [50, 100, 150];
export const CLASS_INFO: Record<EngineClass, { speed: number; rivals: number; label: string; blurb: string }> = {
  50: { speed: 0.8, rivals: 0.9, label: "50cc", blurb: "Calm: slower karts, rivals take it easy" },
  100: { speed: 0.9, rivals: 0.97, label: "100cc", blurb: "Normal: a proper race" },
  150: { speed: 1.0, rivals: 1.04, label: "150cc", blurb: "Flat out: full speed, rivals go for it" },
};

export interface Cup {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  circuits: string[];
}

export const CUPS: Cup[] = [
  { id: "andina", name: "Copa Andina", emoji: "⛰️", blurb: "The mountains: Tocancipá, Guatapé and the Nexus night race.", circuits: ["tocancipa", "guatape", "nexus"] },
  { id: "tropical", name: "Copa Tropical", emoji: "🌴", blurb: "Heat and salsa: Cali, the Tatacoa desert and Cartagena.", circuits: ["cali", "tatacoa", "cartagena"] },
  { id: "nexus", name: "Copa Dream Nexus", emoji: "💎", blurb: "The championship: all six circuits back to back.", circuits: ["tocancipa", "guatape", "cali", "tatacoa", "cartagena", "nexus"] },
];
export const cupById = (id: string) => CUPS.find((c) => c.id === id) ?? CUPS[0];

export const POINTS = [9, 6, 3, 1]; // Mario Kart 64 style

export interface CupRacer {
  id: string; // "me" or the rival id
  name: string;
  driver: string;
  points: number;
  lastPos: number;
}

export interface CupState {
  cupId: string;
  cc: EngineClass;
  round: number; // 0-based index of the race being played
  table: CupRacer[];
  finished: boolean;
}

export let cup: CupState | null = null;

export function startCup(cupId: string, cc: EngineClass, me: { name: string; driver: string }, rivals: { id: string; name: string; driver: string }[]) {
  cup = {
    cupId,
    cc,
    round: 0,
    table: [{ id: "me", name: me.name, driver: me.driver, points: 0, lastPos: 0 }, ...rivals.map((r) => ({ id: r.id, name: r.name, driver: r.driver, points: 0, lastPos: 0 }))],
    finished: false,
  };
  return cup;
}

export function clearCup() {
  cup = null;
}

/** Circuit for the round being played (null when the cup is over). */
export function cupCircuit(c: CupState) {
  const def = cupById(c.cupId);
  const id = def.circuits[c.round];
  return id ? circuitById(id) : null;
}

/** Add this race's points; `order` is the finishing order of racer ids. */
export function recordCupRace(c: CupState, order: string[]) {
  order.forEach((id, i) => {
    const row = c.table.find((r) => r.id === id);
    if (!row) return;
    row.points += POINTS[i] ?? 0;
    row.lastPos = i + 1;
  });
  c.table.sort((a, b) => b.points - a.points || a.lastPos - b.lastPos);
  c.finished = c.round >= cupById(c.cupId).circuits.length - 1;
}

export function cupPlayerRank(c: CupState) {
  return c.table.findIndex((r) => r.id === "me") + 1;
}

export type Trophy = "gold" | "silver" | "bronze";
export function trophyFor(rank: number): Trophy | null {
  return rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null;
}
export const TROPHY_EMOJI: Record<Trophy, string> = { gold: "🏆", silver: "🥈", bronze: "🥉" };
