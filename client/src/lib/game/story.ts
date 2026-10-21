import type { BiomeType } from "../track";

/**
 * Story Mode: "La Ruta de Pixel" — a road trip across Colombia.
 * Each chapter is one stage with a goal; finishing it unlocks the next.
 */

export type GoalType = "jars" | "distance" | "cleanDistance" | "smashes" | "jumps" | "nearMisses" | "position";

export interface Line {
  who: string; // name
  emoji: string;
  text: string;
}

export interface Chapter {
  id: string;
  num: number;
  title: string;
  region: string;
  biome: BiomeType;
  // endless stage (one region) or a circuit race
  stage: { kind: "endless"; limit: number } | { kind: "circuit"; circuitId: string; laps: number };
  goal: { type: GoalType; value: number; label: string };
  stars: [number, number]; // score (endless) needed for 2 and 3 stars
  reward: number; // arequipe jars
  intro: Line[];
  win: Line[];
  lose: Line[];
  map: { lon: number; lat: number };
}

const PIXEL = { who: "Pixel", emoji: "🐰" };
const ABUELA = { who: "Abuela Carmen", emoji: "👵" };
const OSO = { who: "Anteojos", emoji: "🐻" };
const TUKI = { who: "Tuki", emoji: "🦜" };
const YAGUAR = { who: "Yaguar", emoji: "🐆" };
const TITI = { who: "Titi", emoji: "🐒" };
const KUNTUR = { who: "Kuntur", emoji: "🦅" };
const NEXI = { who: "NEXI", emoji: "🤖" };

export const CHAPTERS: Chapter[] = [
  {
    id: "c1",
    num: 1,
    title: "El Arequipe de la Abuela",
    region: "Eje Cafetero · Salento",
    biome: "coffee_hills",
    stage: { kind: "endless", limit: 1400 },
    goal: { type: "jars", value: 25, label: "Collect 25 arequipe jars" },
    stars: [2500, 4000],
    reward: 150,
    map: { lon: -75.57, lat: 4.64 },
    intro: [
      { ...ABUELA, text: "¡Mijo! You're racing for Dream Nexus in the Gran Rally de Colombia — all the way to the final in Cartagena!" },
      { ...ABUELA, text: "But first, help your abuela: I dropped all my arequipe jars along the coffee road!" },
      { ...PIXEL, text: "¡Dale, Abuela! 25 jars before the end of the valley. Easy." },
    ],
    win: [{ ...ABUELA, text: "¡Qué berraquera! Here, take some jars for the trip. Now go, Cartagena is waiting!" }],
    lose: [{ ...ABUELA, text: "Ay, mijo, not enough jars... try again, slowly and with love." }],
  },
  {
    id: "c2",
    num: 2,
    title: "Frío en el Páramo",
    region: "Boyacá · Páramo",
    biome: "andes_highland",
    stage: { kind: "endless", limit: 1500 },
    goal: { type: "cleanDistance", value: 1200, label: "Drive 1200 m without crashing" },
    stars: [2500, 4200],
    reward: 200,
    map: { lon: -72.9, lat: 5.6 },
    intro: [
      { ...OSO, text: "Hey, little bunny. The páramo is fragile — the frailejones grow one centimetre a year." },
      { ...OSO, text: "Cross my mountains without hitting anything and I'll let you pass." },
    ],
    win: [{ ...OSO, text: "Respect. Not a scratch. You can count on me — I'm coming to Cartagena too!" }],
    lose: [{ ...OSO, text: "Too many bumps. Breathe the mountain air and try again." }],
  },
  {
    id: "c3",
    num: 3,
    title: "Fiesta en Guatapé",
    region: "Antioquia · Guatapé",
    biome: "pueblo",
    stage: { kind: "circuit", circuitId: "guatape", laps: 2 },
    goal: { type: "position", value: 3, label: "Finish on the podium (top 3)" },
    stars: [0, 0],
    reward: 250,
    map: { lon: -75.16, lat: 6.23 },
    intro: [
      { ...TUKI, text: "¡Bienvenido a Guatapé! Today is the town festival and there's a street race!" },
      { ...TUKI, text: "Beat the locals around the zócalos. Podium or nothing, parce!" },
    ],
    win: [{ ...TUKI, text: "¡Qué chimba! You raced like a local. I'll fly ahead and save you a spot on the coast." }],
    lose: [{ ...TUKI, text: "Ay no... the locals know every corner. Another round?" }],
  },
  {
    id: "c4",
    num: 4,
    title: "La Ciudad Perdida",
    region: "Sierra Nevada · Magdalena",
    biome: "ciudad_perdida",
    stage: { kind: "endless", limit: 1800 },
    goal: { type: "jumps", value: 4, label: "Jump 4 ramps through the jungle" },
    stars: [3000, 5000],
    reward: 300,
    map: { lon: -73.93, lat: 11.04 },
    intro: [
      { ...YAGUAR, text: "Psst. The road to Teyuna is closed by roots and rocks. Only the brave jump over them." },
      { ...YAGUAR, text: "Fly over 4 ramps and I'll show you the shortcut to the coast." },
    ],
    win: [{ ...YAGUAR, text: "Ha! You move like a jaguar. The Lost City says hi." }],
    lose: [{ ...YAGUAR, text: "The jungle wins this time. Look for the yellow ramps!" }],
  },
  {
    id: "c5",
    num: 5,
    title: "Noche en la Comuna",
    region: "Medellín · Comuna 13",
    biome: "comuna_13",
    stage: { kind: "endless", limit: 1600 },
    goal: { type: "smashes", value: 8, label: "Smash 8 obstacles with nitro" },
    stars: [3500, 6000],
    reward: 350,
    map: { lon: -75.62, lat: 6.25 },
    intro: [
      { ...TITI, text: "Wepa! Welcome to Comuna 13 — graffiti, music and the best views of Medellín." },
      { ...TITI, text: "Tonight we party: fill your nitro and smash 8 obstacles. ¡Que suene!" },
    ],
    win: [{ ...TITI, text: "¡Eso! The whole barrio was cheering. See you in Cartagena!" }],
    lose: [{ ...TITI, text: "More nitro, more party! Collect jars to fill it up." }],
  },
  {
    id: "c6",
    num: 6,
    title: "Estrellas de la Tatacoa",
    region: "Huila · Desierto de la Tatacoa",
    biome: "tatacoa",
    stage: { kind: "endless", limit: 1600 },
    goal: { type: "nearMisses", value: 10, label: "Get 10 near misses" },
    stars: [3500, 6000],
    reward: 400,
    map: { lon: -75.17, lat: 3.23 },
    intro: [
      { ...KUNTUR, text: "From up here I see everything. The Tatacoa isn't really a desert — it's a dry forest." },
      { ...KUNTUR, text: "Show me courage: pass 10 obstacles as close as you dare." },
    ],
    win: [{ ...KUNTUR, text: "Valiente. I'll guide you to Cartagena from the sky." }],
    lose: [{ ...KUNTUR, text: "Closer, little one. Brush past them!" }],
  },
  {
    id: "c7",
    num: 7,
    title: "Gran Premio de Cartagena",
    region: "Bolívar · Cartagena de Indias",
    biome: "cartagena",
    stage: { kind: "circuit", circuitId: "cartagena", laps: 3 },
    goal: { type: "position", value: 1, label: "Win the Gran Premio!" },
    stars: [0, 0],
    reward: 1000,
    map: { lon: -75.51, lat: 10.39 },
    intro: [
      { ...NEXI, text: "Beep! Dream Nexus HQ online. Pixel, this is the final: the Gran Premio de Cartagena." },
      { ...PIXEL, text: "All my friends are here. Abuela's arequipe in the back. Let's do this!" },
      { ...NEXI, text: "Only first place wins the trophy. Good luck. Beep." },
    ],
    win: [
      { ...NEXI, text: "VICTORY DETECTED. Pixel is champion of Colombia! I'm joining your team as a driver." },
      { ...ABUELA, text: "¡Ese es mi conejo! Now come home, the arequipe is getting cold." },
    ],
    lose: [{ ...NEXI, text: "So close. Recalculating... try again, champion." }],
  },
];

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
