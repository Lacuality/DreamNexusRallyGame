import { EffectComposer, Bloom, Vignette, HueSaturation, SMAA } from "@react-three/postprocessing";
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
      <Bloom mipmapBlur intensity={0.5} luminanceThreshold={1.02} luminanceSmoothing={0.2} radius={0.7} />
      <HueSaturation saturation={0.12} />
      <Vignette offset={0.32} darkness={0.34} />
      <SMAA />
    </EffectComposer>
  );
}
