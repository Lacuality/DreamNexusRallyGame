import { create } from "zustand";

export type WeatherMode = "sunny" | "overcast";

interface SettingsState {
  weather: WeatherMode;
  showPhotoMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  
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
