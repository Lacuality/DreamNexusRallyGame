import { useMemo, useRef } from "react";
import { burst } from "@/lib/game/fx";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildVehicle, type CarRig } from "@/lib/game/vehicles";
import { run } from "@/lib/game/run";
import { roadPitch } from "@/lib/track";
import { groundHeight } from "@/lib/game/physics";
import { useProfile } from "@/lib/stores/useProfile";
import type { CarId, DriverId, PaintId } from "@/lib/game/garage";

/** Flap ears / crests: they stream back with speed and bounce on bumps. */
export function animateWobble(rig: CarRig, t: number, speed: number, rough: boolean) {
  const sp = Math.min(1, speed / 55);
  rig.wobble.forEach((w, i) => {
    const flop = Math.sin(t * 9 + i * 1.7) * 0.08 * (rough ? 2.5 : 1);
    w.rotation.x = (w.userData.baseX ?? 0) - 0.25 - sp * 0.9 + flop;
  });
}

/** The player's car. Purely visual: it reads the live `run` state. */
export function Car() {
  const { car, paint, driver } = useProfile.getState();
  const rig = useMemo(() => buildVehicle(car, paint, driver), [car, paint, driver]);
  const blob = useMemo(() => rig.root.getObjectByName("blob") as THREE.Mesh, [rig]);
  const anim = useRef({ prevSpeed: 0, pitch: 0, wasAir: false, squash: 0 });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const z = run.z;
    const y = groundHeight();
    rig.root.position.set(run.wx, y + run.y, run.wz);
    const x = run.wx;

    // the car faces where it's going, plus the drift slide angle
    const slide = run.driftDir * 0.55 * Math.min(1, run.drift * 4);
    rig.root.rotation.set(0, run.heading + run.rel + slide + (run.spin > 0 ? (1 - run.spin) * Math.PI * 4 : 0), 0);
    // weight transfer: nose lifts when you accelerate / use nitro, dips when you brake or crash
    const a = anim.current;
    const accel = (run.speed - a.prevSpeed) / Math.max(delta, 1e-3);
    a.prevSpeed = run.speed;
    const want = THREE.MathUtils.clamp(-accel * 0.006, -0.09, 0.07) - (run.nitroTime > 0 ? 0.05 : 0);
    a.pitch += (want - a.pitch) * Math.min(1, delta * 6);
    // landing: squash and a puff of dust
    if (a.wasAir && !run.airborne) {
      a.squash = 1;
      burst(x, y + 0.2, rig.root.position.z, ["#c9a46a", "#e6d2a8", "#8b6b3e"], 14, 5, 2.5, 0.22);
    }
    a.wasAir = run.airborne;
    a.squash = Math.max(0, a.squash - delta * 4);
    const sq = Math.sin(a.squash * Math.PI) * 0.16;
    rig.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.3);
    rig.body.rotation.x = -roadPitch(z) + (run.airborne ? -run.vy * 0.025 : a.pitch);
    rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, run.steer * 0.06, Math.min(1, delta * 8));

    // suspension bounce (more off-road)
    const bounce = run.airborne ? 0 : Math.sin(t * 22) * (run.offroad ? 0.06 : 0.012) * Math.min(1, run.speed / 20);
    rig.body.position.y = bounce;

    const spin = (run.speed * delta) / 0.42;
    rig.wheels.forEach((w) => (w.rotation.x += spin));
    rig.frontWheels.forEach((w) => (w.rotation.y = run.steer * 0.35));

    animateWobble(rig, t, run.speed, run.offroad);

    // blink while invulnerable after a hit
    rig.body.visible = run.invulnerable > 0 && run.invulnerable < 50 ? Math.floor(t * 14) % 2 === 0 : true;

    rig.flames.visible = run.nitroTime > 0;
    if (rig.flames.visible) rig.flames.scale.set(1, 1, 0.8 + Math.random() * 0.6);

    rig.shield.visible = run.shield;
    if (run.shield) {
      const p = 1 + Math.sin(t * 5) * 0.04;
      rig.shield.scale.set(0.85 * p, 0.62 * p, (rig.length / 3.9) * 1.05 * p);
    }

    if (blob) {
      blob.position.y = -run.y + 0.04;
      const s = Math.max(0.4, 1 - run.y * 0.15);
      blob.scale.set(s, s, 1);
    }
  });

  return <primitive object={rig.root} />;
}

/** Showcase car for the title screen and garage. */
export function ShowcaseCar({
  car,
  paint,
  driver,
  ...props
}: JSX.IntrinsicElements["group"] & { car?: CarId; paint?: PaintId; driver?: DriverId }) {
  const sel = useProfile();
  const c = car ?? sel.car;
  const p = paint ?? sel.paint;
  const d = driver ?? sel.driver;
  const rig = useMemo(() => buildVehicle(c, p, d), [c, p, d]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    rig.wobble.forEach((w, i) => (w.rotation.x = (w.userData.baseX ?? 0) - 0.3 + Math.sin(t * 2 + i) * 0.12));
    rig.wheels.forEach((w) => (w.rotation.x = t * 3));
  });
  return (
    <group {...props}>
      <primitive object={rig.root} />
    </group>
  );
}
