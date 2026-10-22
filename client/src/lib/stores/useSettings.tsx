import { create } from "zustand";

export type WeatherMode = "sunny" | "overcast";
export type Graphics = "high" | "low";

function initialGraphics(): Graphics {
  try {
    const saved = localStorage.getItem("dnr-graphics");
    if (saved === "high" || saved === "low") return saved;
  } catch {}
  // phones start on "low" (no glow effects) so the game stays smooth
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  return coarse ? "low" : "high";
}

interface SettingsState {
  weather: WeatherMode;
  showPhotoMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  graphics: Graphics;
  toggleGraphics: () => void;
  
  toggleWeather: () => void;
  togglePhotoMode: () => void;
  toggleReducedMotion: () => void;
  toggleHighContrast: () => void;
}

export const useSettings = create<SettingsState>((set) => ({
  weather: "sunny",
  showPhotoMode: false,
  reducedMotion: false,
  highContrast: false,
  graphics: initialGraphics(),
  toggleGraphics: () =>
    set((state) => {
      const graphics: Graphics = state.graphics === "high" ? "low" : "high";
      try {
        localStorage.setItem("dnr-graphics", graphics);
      } catch {}
      return { graphics };
    }),
  
  toggleWeather: () => {
    set((state) => ({
      weather: state.weather === "sunny" ? "overcast" : "sunny"
    }));
  },
  
  togglePhotoMode: () => {
    set((state) => ({ showPhotoMode: !state.showPhotoMode }));
  },
  
  toggleReducedMotion: () => {
    set((state) => ({ reducedMotion: !state.reducedMotion }));
  },
  
  toggleHighContrast: () => {
    set((state) => ({ highContrast: !state.highContrast }));
  },
}));
