import { create } from "zustand";

interface MobileControlsState {
  left: boolean;
  right: boolean;
  forward: boolean;
  back: boolean;
  
  setLeft: (pressed: boolean) => void;
  setRight: (pressed: boolean) => void;
  setForward: (pressed: boolean) => void;
  setBack: (pressed: boolean) => void;
}

export const useMobileControls = create<MobileControlsState>((set) => ({
  left: false,
  right: false,
  forward: false,
  back: false,
  
  setLeft: (pressed) => set({ left: pressed }),
  setRight: (pressed) => set({ right: pressed }),
  setForward: (pressed) => set({ forward: pressed }),
  setBack: (pressed) => set({ back: pressed }),
}));
