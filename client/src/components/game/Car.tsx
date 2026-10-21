import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildCar } from "@/lib/game/models";
import { run } from "@/lib/game/run";
import { roadX, roadY, roadSlope, roadPitch } from "@/lib/track";

/** The player's car. Purely visual: it reads the live `run` state. */
export function Car() {
  const rig = useMemo(() => buildCar(), []);
  const blob = useMemo(() => rig.root.getObjectByName("blob") as THREE.Mesh, [rig]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const z = run.z;
    const x = roadX(z) + run.lat;
    const y = roadY(z);
    rig.root.position.set(x, y + run.y, z);

    // face along the road, plus a bit of steering yaw
    const heading = Math.atan(roadSlope(z));
    rig.root.rotation.set(0, heading + run.latVel * 0.025, 0);
    rig.body.rotation.x = -roadPitch(z) + (run.airborne ? -run.vy * 0.025 : 0);
    rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, run.steer * 0.06, Math.min(1, delta * 8));

    // suspension bounce (more off-road)
    const bounce = run.airborne ? 0 : Math.sin(t * 22) * (run.offroad ? 0.06 : 0.012) * Math.min(1, run.speed / 20);
    rig.body.position.y = bounce;

    // wheels
    const spin = run.speed * delta / 0.42;
    rig.wheels.forEach((w) => (w.rotation.x += spin));
    rig.frontWheels.forEach((w) => (w.rotation.y = run.steer * 0.35));

    // Pixel's ears stream back with speed and flop on bumps
    const sp = Math.min(1, run.speed / 55);
    const flop = Math.sin(t * 9) * 0.08 * (run.offroad ? 2.5 : 1);
    rig.earL.rotation.x = -0.25 - sp * 0.9 + flop;
    rig.earR.rotation.x = -0.25 - sp * 0.9 - flop;

    // blink while invulnerable after a hit
    rig.body.visible = run.invulnerable > 0 ? Math.floor(t * 14) % 2 === 0 : true;

    // nitro flames flicker
    rig.flames.visible = run.nitroTime > 0;
    if (rig.flames.visible) rig.flames.scale.set(1, 1, 0.8 + Math.random() * 0.6);

    // shield bubble pulse
    rig.shield.visible = run.shield;
    if (run.shield) {
      const p = 1 + Math.sin(t * 5) * 0.04;
      rig.shield.scale.set(0.85 * p, 0.62 * p, 1.05 * p);
    }

    // shadow blob stays on the road during jumps
    if (blob) {
      blob.position.y = -run.y + 0.04;
      const s = Math.max(0.4, 1 - run.y * 0.15);
      blob.scale.set(s, s, 1);
    }
  });

  return <primitive object={rig.root} />;
}

/** Static showcase car for the title screen. */
export function ShowcaseCar(props: JSX.IntrinsicElements["group"]) {
  const rig = useMemo(() => buildCar(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    rig.earL.rotation.x = -0.3 + Math.sin(t * 2) * 0.12;
    rig.earR.rotation.x = -0.3 + Math.sin(t * 2 + 1) * 0.12;
    rig.wheels.forEach((w) => (w.rotation.x = t * 3));
  });
  return (
    <group {...props}>
      <primitive object={rig.root} />
    </group>
  );
}
