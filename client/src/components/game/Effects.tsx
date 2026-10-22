import { EffectComposer, Bloom, Vignette, ToneMapping, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useSettings } from "@/lib/stores/useSettings";

/**
 * "High graphics": soft glow on bright things (nitro flames, neon, power-up boxes,
 * the sun), a gentle vignette and anti-aliasing. Off on "low" for older phones.
 */
export function Effects() {
  const graphics = useSettings((s) => s.graphics);
  if (graphics !== "high") return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.92} luminanceSmoothing={0.2} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  );
}
