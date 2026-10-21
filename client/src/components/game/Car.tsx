import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildVehicle, type CarRig } from "@/lib/game/vehicles";
import { run } from "@/lib/game/run";
import { roadX, roadY, roadSlope, roadPitch } from "@/lib/track";
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
