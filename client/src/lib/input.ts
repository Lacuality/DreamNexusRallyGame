/**
 * Shared input state. Keyboard listeners live here; touch controls write
 * into the same object so the game loop reads one place.
 */
export const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  nitro: false,
  nitroQueued: false, // a tap that happened between frames still counts
  // touch
  touchLeft: false,
  touchRight: false,
  touchBrake: false,
  touchNitro: false,
};

const KEYMAP: Record<string, keyof typeof input> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "nitro",
  ShiftLeft: "nitro",
  ShiftRight: "nitro",
};

let installed = false;
export function installKeyboard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("keydown", (e) => {
    const k = KEYMAP[e.code];
    if (k) {
      (input as any)[k] = true;
      if (k === "nitro") input.nitroQueued = true;
      // stop arrows/space from scrolling or pressing focused buttons
      if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const k = KEYMAP[e.code];
    if (k) (input as any)[k] = false;
  });
  window.addEventListener("blur", () => {
    (Object.keys(input) as (keyof typeof input)[]).forEach((k) => (input[k] = false));
  });
}

export function steerInput() {
  return (input.left || input.touchLeft ? 1 : 0) - (input.right || input.touchRight ? 1 : 0);
}

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window;
}
