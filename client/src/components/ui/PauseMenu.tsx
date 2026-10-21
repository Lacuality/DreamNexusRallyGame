import { Play, Home, RotateCcw, Music, Volume2 } from "lucide-react";
import { useRally } from "@/lib/stores/useRally";
import { useSettings } from "@/lib/stores/useSettings";
import { audioManager } from "@/lib/audio";
import { BigButton, UI, panelStyle, useAudioSettings } from "./gameUi";

function Slider({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 18 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, width: 120 }}>
        {icon}
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, height: 28, accentColor: UI.cyanBright }}
      />
    </label>
  );
}

export function PauseMenu() {
  const resume = useRally((s) => s.resume);
  const restart = useRally((s) => s.restart);
  const start = useRally((s) => s.start);
  const audio = useAudioSettings();
  const { reducedMotion, toggleReducedMotion } = useSettings();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(14, 27, 36, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: UI.body,
        color: UI.white,
        padding: 16,
      }}
    >
      <div style={{ ...panelStyle, padding: "28px 28px", width: "min(460px, 100%)", animation: "dnrFadeIn 0.25s ease-out" }}>
        <h1 style={{ fontFamily: UI.display, fontSize: "clamp(40px, 8vw, 60px)", color: UI.cyanBright, margin: "0 0 20px", textAlign: "center" }}>
          PAUSED
        </h1>

        <div style={{ display: "grid", gap: 14 }}>
          <BigButton onClick={resume} color={UI.cyanBright}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Play size={28} strokeWidth={3} fill="currentColor" /> RESUME
            </span>
          </BigButton>
          <BigButton onClick={start} color={UI.gold}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <RotateCcw size={26} strokeWidth={3} /> RESTART
            </span>
          </BigButton>
          <BigButton onClick={restart} color={UI.warm}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Home size={26} strokeWidth={3} /> MENU
            </span>
          </BigButton>
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
          <Slider label="Music" icon={<Music size={22} />} value={audio.music} onChange={(v) => audioManager.setMusicVolume(v)} />
          <Slider label="Effects" icon={<Volume2 size={22} />} value={audio.sfx} onChange={(v) => audioManager.setSfxVolume(v)} />
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 18, cursor: "pointer" }}>
            <input type="checkbox" checked={audio.muted} onChange={() => audioManager.toggleMute()} style={{ width: 26, height: 26, accentColor: UI.cyanBright }} />
            Mute all sound
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 18, cursor: "pointer" }}>
            <input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} style={{ width: 26, height: 26, accentColor: UI.cyanBright }} />
            Less camera shake
          </label>
        </div>

        <p style={{ textAlign: "center", opacity: 0.7, marginTop: 18, marginBottom: 0, fontWeight: 700 }}>Press P or Esc to resume</p>
      </div>
    </div>
  );
}
