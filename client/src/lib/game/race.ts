/**
 * Circuit race state: laps, lap times and the other cars (AI rivals or
 * friends online). The player's own car is `run` (see run.ts).
 */
export interface Racer {
  id: string;
  name: string;
  car: string;
  driver: string;
  paint: string;
  z: number; // total distance driven (all laps)
  lat: number;
  y: number;
  speed: number; // m/s
  skill: number;
  seed: number;
  finishedAt: number | null; // race time (s) when they crossed the line
  remote: boolean; // a friend online
  lastSeen: number; // for remote cars (ms timestamp)
  nitro: number; // seconds of boost left (AI)
}

export const race = {
  active: false,
  laps: 3,
  length: 1000,
  lap: 0, // laps completed by the player
  lapStart: 0,
  lapTimes: [] as number[],
  racers: [] as Racer[],
  finishedAt: null as number | null,
};

export function resetRace(laps: number, length: number) {
  race.active = true;
  race.laps = laps;
  race.length = length;
  race.lap = 0;
  race.lapStart = 0;
  race.lapTimes = [];
  race.racers = [];
  race.finishedAt = null;
}

export function endRaceState() {
  race.active = false;
  race.racers = [];
}

/** Player's current position (1 = leading). */
export function playerPosition(playerZ: number, playerFinishedAt: number | null) {
  let pos = 1;
  for (const r of race.racers) {
    if (r.finishedAt !== null) {
      if (playerFinishedAt === null || r.finishedAt < playerFinishedAt) pos++;
    } else if (playerFinishedAt === null && r.z > playerZ) pos++;
  }
  return pos;
}

export interface Standing {
  name: string;
  time: number | null; // finish time, null = did not finish
  isPlayer: boolean;
  driver: string;
}

/** Final order. Cars still racing get a projected time. */
export function standings(playerName: string, playerDriver: string, playerTime: number, now: number): Standing[] {
  const total = race.laps * race.length;
  const rows: (Standing & { sortKey: number })[] = [
    { name: playerName || "You", time: playerTime, isPlayer: true, driver: playerDriver, sortKey: playerTime },
  ];
  for (const r of race.racers) {
    if (r.finishedAt !== null) rows.push({ name: r.name, time: r.finishedAt, isPlayer: false, driver: r.driver, sortKey: r.finishedAt });
    else {
      const left = Math.max(0, total - r.z);
      const eta = now + left / Math.max(10, r.speed || 30);
      rows.push({ name: r.name, time: r.remote ? null : eta, isPlayer: false, driver: r.driver, sortKey: r.remote ? 1e9 - r.z : eta });
    }
  }
  return rows.sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey, ...s }) => s);
}

export function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(2)}`;
}

export function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
