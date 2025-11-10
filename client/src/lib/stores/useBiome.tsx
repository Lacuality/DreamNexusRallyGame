import { create } from "zustand";

export type BiomeType = "coffee_hills" | "andes_highland" | "pueblo";

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
  currentDistance: number;
  
  updateDistance: (distance: number) => void;
  getCurrentConfig: () => BiomeConfig;
}

const BIOME_SEQUENCE: BiomeType[] = ["coffee_hills", "andes_highland", "pueblo"];

export const useBiome = create<BiomeState>((set, get) => ({
  currentBiome: "coffee_hills",
  currentDistance: 0,
  
  updateDistance: (distance: number) => {
    const state = get();
    set({ currentDistance: distance });
    
    const currentConfig = BIOME_CONFIGS[state.currentBiome];
    const nextDistance = Math.floor(distance / currentConfig.transitionDistance);
    const biomeIndex = nextDistance % BIOME_SEQUENCE.length;
    const newBiome = BIOME_SEQUENCE[biomeIndex];
    
    if (newBiome !== state.currentBiome) {
      console.log(`Biome transition: ${state.currentBiome} → ${newBiome} at ${distance.toFixed(0)}m`);
      set({ currentBiome: newBiome });
    }
  },
  
  getCurrentConfig: () => {
    const state = get();
    return BIOME_CONFIGS[state.currentBiome];
  },
}));
