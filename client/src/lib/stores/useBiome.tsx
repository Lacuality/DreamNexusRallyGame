import { create } from "zustand";
import { biomeAt, type BiomeType } from "@/lib/track";

export type { BiomeType };

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = parseInt(color1.replace("#", ""), 16);
  const c2 = parseInt(color2.replace("#", ""), 16);
  const r = Math.round(((c1 >> 16) & 255) + ((((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t));
  const g = Math.round(((c1 >> 8) & 255) + ((((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t));
  const b = Math.round((c1 & 255) + (((c2 & 255) - (c1 & 255)) * t));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface BiomeConfig {
  name: string;
  subtitle: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  terrainColor: string;
  shoulderColor: string;
  mountainColor: string;
}

export const BIOME_CONFIGS: Record<BiomeType, BiomeConfig> = {
  coffee_hills: {
    name: "Coffee Hills",
    subtitle: "Eje Cafetero",
    skyTop: "#3d9be0",
    skyHorizon: "#bfe6f5",
    fogColor: "#bfe6f5",
    fogNear: 60,
    fogFar: 230,
    sunIntensity: 1.6,
    sunColor: "#fff3d6",
    ambientIntensity: 0.55,
    terrainColor: "#4f9a3c",
    shoulderColor: "#9b7a4a",
    mountainColor: "#3f7f5a",
  },
  andes_highland: {
    name: "Andes Highland",
    subtitle: "Páramo de los Frailejones",
    skyTop: "#5a7fb8",
    skyHorizon: "#d8e2ee",
    fogColor: "#d8e2ee",
    fogNear: 45,
    fogFar: 190,
    sunIntensity: 1.3,
    sunColor: "#eef4ff",
    ambientIntensity: 0.6,
    terrainColor: "#7c8f55",
    shoulderColor: "#8a8274",
    mountainColor: "#6e7f96",
  },
  pueblo: {
    name: "Pueblo",
    subtitle: "Colorful mountain village",
    skyTop: "#f08a4b",
    skyHorizon: "#ffd9a8",
    fogColor: "#ffd9a8",
    fogNear: 55,
    fogFar: 220,
    sunIntensity: 1.5,
    sunColor: "#ffd2a0",
    ambientIntensity: 0.6,
    terrainColor: "#8a9a3c",
    shoulderColor: "#b0703f",
    mountainColor: "#9a6a5a",
  },
  ciudad_perdida: {
    name: "Ciudad Perdida",
    subtitle: "Teyuna · Sierra Nevada de Santa Marta",
    skyTop: "#6fa8a0",
    skyHorizon: "#cfe3d6",
    fogColor: "#c4dccd",
    fogNear: 30,
    fogFar: 150,
    sunIntensity: 1.15,
    sunColor: "#fff6dc",
    ambientIntensity: 0.7,
    terrainColor: "#2f7a36",
    shoulderColor: "#6b5a3e",
    mountainColor: "#2e6a45",
  },
  comuna_13: {
    name: "Comuna 13",
    subtitle: "Medellín de noche · graffiti & neon",
    skyTop: "#140a2e",
    skyHorizon: "#ff4f9a",
    fogColor: "#3b1c55",
    fogNear: 45,
    fogFar: 190,
    sunIntensity: 0.6,
    sunColor: "#ff9ad0",
    ambientIntensity: 0.5,
    terrainColor: "#3a2f52",
    shoulderColor: "#4a3d5e",
    mountainColor: "#2a1840",
  },
  tatacoa: {
    name: "Desierto de la Tatacoa",
    subtitle: "Huila · red canyons & starry skies",
    skyTop: "#2f6fd0",
    skyHorizon: "#f6d7a7",
    fogColor: "#f0cfa0",
    fogNear: 70,
    fogFar: 260,
    sunIntensity: 1.8,
    sunColor: "#fff0d0",
    ambientIntensity: 0.55,
    terrainColor: "#c8794a",
    shoulderColor: "#a85a35",
    mountainColor: "#9c4a2e",
  },
  cali: {
    name: "Cali",
    subtitle: "Valle del Cauca · capital mundial de la salsa",
    skyTop: "#4a5fc1",
    skyHorizon: "#ffb36b",
    fogColor: "#f4b27e",
    fogNear: 60,
    fogFar: 230,
    sunIntensity: 1.5,
    sunColor: "#ffd9a0",
    ambientIntensity: 0.6,
    terrainColor: "#5e9a3a",
    shoulderColor: "#8a6a3a",
    mountainColor: "#3d6a5a",
  },
  cartagena: {
    name: "Cartagena de Indias",
    subtitle: "Bolívar · walled city on the Caribbean",
    skyTop: "#1e90d6",
    skyHorizon: "#bfefff",
    fogColor: "#c6f0ff",
    fogNear: 70,
    fogFar: 250,
    sunIntensity: 1.7,
    sunColor: "#fff3d0",
    ambientIntensity: 0.6,
    terrainColor: "#d9c48a",
    shoulderColor: "#c9b48a",
    mountainColor: "#5a9a8a",
  },
};

interface BiomeState {
  currentBiome: BiomeType;
  previousBiome: BiomeType | null;
  transitionProgress: number;
  isTransitioning: boolean;

  updateDistance: (distance: number) => void;
  updateTransition: (delta: number) => void;
  reset: (start?: BiomeType) => void;
  getCurrentConfig: () => BiomeConfig;
  getPreviousConfig: () => BiomeConfig | null;
}

const TRANSITION_DURATION = 2.5; // seconds

export const useBiome = create<BiomeState>((set, get) => ({
  currentBiome: "coffee_hills",
  previousBiome: null,
  transitionProgress: 1.0,
  isTransitioning: false,

  updateDistance: (distance: number) => {
    const state = get();
    const newBiome = biomeAt(distance);
    if (newBiome !== state.currentBiome) {
      set({
        previousBiome: state.currentBiome,
        currentBiome: newBiome,
        transitionProgress: 0.0,
        isTransitioning: true,
      });
    }
  },

  updateTransition: (delta: number) => {
    const state = get();
    if (!state.isTransitioning) return;
    const p = Math.min(1.0, state.transitionProgress + delta / TRANSITION_DURATION);
    if (p >= 1.0) set({ transitionProgress: 1, isTransitioning: false, previousBiome: null });
    else set({ transitionProgress: p });
  },

  reset: (start: BiomeType = "coffee_hills") =>
    set({ currentBiome: start, previousBiome: null, transitionProgress: 1, isTransitioning: false }),

  getCurrentConfig: () => BIOME_CONFIGS[get().currentBiome],

  getPreviousConfig: () => {
    const prev = get().previousBiome;
    return prev ? BIOME_CONFIGS[prev] : null;
  },
}));

/** Blended config for the current moment of a biome transition. */
export function blendedBiome(): BiomeConfig {
  const s = useBiome.getState();
  const cur = BIOME_CONFIGS[s.currentBiome];
  const prev = s.previousBiome ? BIOME_CONFIGS[s.previousBiome] : null;
  if (!prev || !s.isTransitioning) return cur;
  const t = s.transitionProgress;
  return {
    ...cur,
    skyTop: lerpColor(prev.skyTop, cur.skyTop, t),
    skyHorizon: lerpColor(prev.skyHorizon, cur.skyHorizon, t),
    fogColor: lerpColor(prev.fogColor, cur.fogColor, t),
    fogNear: lerpNumber(prev.fogNear, cur.fogNear, t),
    fogFar: lerpNumber(prev.fogFar, cur.fogFar, t),
    sunIntensity: lerpNumber(prev.sunIntensity, cur.sunIntensity, t),
    sunColor: lerpColor(prev.sunColor, cur.sunColor, t),
    ambientIntensity: lerpNumber(prev.ambientIntensity, cur.ambientIntensity, t),
    terrainColor: lerpColor(prev.terrainColor, cur.terrainColor, t),
    shoulderColor: lerpColor(prev.shoulderColor, cur.shoulderColor, t),
    mountainColor: lerpColor(prev.mountainColor, cur.mountainColor, t),
  };
}
