import { create } from "zustand";

export type BiomeType = "coffee_hills" | "andes_highland" | "pueblo";

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = parseInt(color1.replace("#", ""), 16);
  const c2 = parseInt(color2.replace("#", ""), 16);
  
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface BiomeConfig {
  name: string;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  ambientIntensity: number;
  terrainColor: string;
  curveMultiplier: number;
  hillMultiplier: number;
  transitionDistance: number;
}

export const BIOME_CONFIGS: Record<BiomeType, BiomeConfig> = {
  coffee_hills: {
    name: "Coffee Hills",
    skyColor: "#0E1B24",
    fogColor: "#1a2f3a",
    fogNear: 60,
    fogFar: 160,
    sunIntensity: 1.3,
    ambientIntensity: 0.5,
    terrainColor: "#2a5a3a",
    curveMultiplier: 1.0,
    hillMultiplier: 1.0,
    transitionDistance: 500,
  },
  andes_highland: {
    name: "Andes Highland",
    skyColor: "#1a2633",
    fogColor: "#2a3644",
    fogNear: 40,
    fogFar: 120,
    sunIntensity: 1.0,
    ambientIntensity: 0.4,
    terrainColor: "#3a4a5a",
    curveMultiplier: 1.2,
    hillMultiplier: 1.4,
    transitionDistance: 500,
  },
  pueblo: {
    name: "Pueblo",
    skyColor: "#2a1a14",
    fogColor: "#3a2a24",
    fogNear: 50,
    fogFar: 140,
    sunIntensity: 1.4,
    ambientIntensity: 0.55,
    terrainColor: "#4a3a2a",
    curveMultiplier: 0.8,
    hillMultiplier: 0.7,
    transitionDistance: 400,
  },
};

interface BiomeState {
  currentBiome: BiomeType;
  previousBiome: BiomeType | null;
  currentDistance: number;
  transitionProgress: number;
  isTransitioning: boolean;
  
  updateDistance: (distance: number) => void;
  updateTransition: (delta: number) => void;
  getCurrentConfig: () => BiomeConfig;
  getPreviousConfig: () => BiomeConfig | null;
}

const BIOME_SEQUENCE: BiomeType[] = ["coffee_hills", "andes_highland", "pueblo"];
const TRANSITION_DURATION = 0.7; // seconds

export const useBiome = create<BiomeState>((set, get) => ({
  currentBiome: "coffee_hills",
  previousBiome: null,
  currentDistance: 0,
  transitionProgress: 1.0,
  isTransitioning: false,
  
  updateDistance: (distance: number) => {
    const state = get();
    set({ currentDistance: distance });
    
    const currentConfig = BIOME_CONFIGS[state.currentBiome];
    const nextDistance = Math.floor(distance / currentConfig.transitionDistance);
    const biomeIndex = nextDistance % BIOME_SEQUENCE.length;
    const newBiome = BIOME_SEQUENCE[biomeIndex];
    
    if (newBiome !== state.currentBiome) {
      console.log(`Biome transition: ${state.currentBiome} → ${newBiome} at ${distance.toFixed(0)}m`);
      set({ 
        previousBiome: state.currentBiome,
        currentBiome: newBiome,
        transitionProgress: 0.0,
        isTransitioning: true
      });
    }
  },
  
  updateTransition: (delta: number) => {
    const state = get();
    if (state.isTransitioning) {
      const newProgress = Math.min(1.0, state.transitionProgress + delta / TRANSITION_DURATION);
      set({ transitionProgress: newProgress });
      
      if (newProgress >= 1.0) {
        set({ isTransitioning: false, previousBiome: null });
      }
    }
  },
  
  getCurrentConfig: () => {
    const state = get();
    return BIOME_CONFIGS[state.currentBiome];
  },
  
  getPreviousConfig: () => {
    const state = get();
    return state.previousBiome ? BIOME_CONFIGS[state.previousBiome] : null;
  },
}));
