import { useMemo, useRef } from "react";
import { burst } from "@/lib/game/fx";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildVehicle, type CarRig } from "@/lib/game/vehicles";
import { run } from "@/lib/game/run";
import { race } from "@/lib/game/race";
import { animateRig, type RigPose } from "@/lib/game/rigAnim";
import { roadPitch } from "@/lib/track";
import { groundHeight } from "@/lib/game/physics";
import { useProfile } from "@/lib/stores/useProfile";
import type { CarId, DriverId, PaintId } from "@/lib/game/garage";

/** The player's car. Purely visual: it reads the live `run` state. */
export function Car() {
  const { car, paint, driver } = useProfile.getState();
  const rig = useMemo(() => buildVehicle(car, paint, driver), [car, paint, driver]);
  const blob = useMemo(() => rig.root.getObjectByName("blob") as THREE.Mesh, [rig]);
  // Chiva Express: for a few seconds you ARE a chiva
  const chiva = useMemo(() => (car === "chiva" ? null : buildVehicle("chiva", paint, driver)), [car, paint, driver]);
  const wasChiva = useRef(false);
  const tmpCol = useMemo(() => new THREE.Color(), []);
  const anim = useRef<RigPose>({ speed: 0, steer: 0, pitch: 0, air: false, vy: 0, hopY: 0, offroad: false, nitro: false, drift: 0, dizzy: false, star: false, cheer: 0, throwing: 0 });
  const smoke = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const z = run.z;
    const y = groundHeight();
    rig.root.position.set(run.wx, y + run.y, run.wz);
    const x = run.wx;

    // the car faces where it's going, plus the drift slide angle
    const slide = run.driftDir * 0.55 * Math.min(1, run.drift * 4);
    const trickSpin = run.trick > 0 ? (1 - run.trick / 0.55) * Math.PI * 2 : 0; // a full 360 in the air
    rig.root.rotation.set(0, run.heading + run.rel + slide + trickSpin + (run.spin > 0 ? (1 - run.spin) * Math.PI * 4 : 0), 0);
    if (run.hop > 0) run.hop = Math.max(0, run.hop - delta);
    if (run.cheer > 0) run.cheer -= delta;
    if (run.throwT > 0) run.throwT -= delta;
    const pose = anim.current;
    pose.speed = run.speed;
    pose.steer = run.steer;
    pose.pitch = roadPitch(z);
    pose.air = run.airborne;
    pose.vy = run.vy;
    pose.hopY = run.hop > 0 ? Math.sin((1 - run.hop / 0.28) * Math.PI) * 0.45 : 0;
    pose.offroad = run.offroad;
    pose.nitro = run.nitroTime > 0;
    pose.drift = run.driftDir * Math.min(1, run.drift * 4);
    pose.dizzy = run.spin > 0;
    pose.star = run.star > 0;
    pose.cheer = race.finishedAt !== null && run.lastPos > 0 && run.lastPos <= 3 ? 1 : run.cheer;
    pose.throwing = run.throwT;
    // landing: a puff of dust
    if (animateRig(rig, pose, t, delta)) burst(x, y + 0.2, rig.root.position.z, ["#c9a46a", "#e6d2a8", "#8b6b3e"], 14, 5, 2.5, 0.22);
    // wheel-spin smoke off the line and tyre smoke in a slide
    smoke.current -= delta;
    if (smoke.current <= 0 && !run.airborne && ((run.speed > 3 && run.speed < 22 && rig.anim.pitch < -0.02) || Math.abs(pose.drift) > 0.6)) {
      smoke.current = 0.09;
      burst(x - Math.sin(rig.root.rotation.y) * 1.5, y + 0.25, rig.root.position.z - Math.cos(rig.root.rotation.y) * 1.5, ["#ffffff", "#dfe6ee", "#c5ccd6"], 1, 1, 1.4, 0.13);
    }

    // shrunk by an apagón
    const size = run.tiny > 0 ? 0.55 : 1;
    if (Math.abs(rig.root.scale.x - size) > 0.005) rig.root.scale.setScalar(THREE.MathUtils.lerp(rig.root.scale.x, size, Math.min(1, delta * 9)));
    // transformed into a chiva
    const isChiva = !!chiva && run.bullet > 0;
    if (isChiva !== wasChiva.current) {
      wasChiva.current = isChiva;
      burst(x, y + 1.2, rig.root.position.z, ["#ffffff", "#FCD116", "#CE1126", "#003893"], 26, 8, 7, 0.17);
    }
    if (chiva) {
      chiva.root.visible = isChiva;
      rig.root.visible = !isChiva;
      if (isChiva) {
        chiva.root.position.copy(rig.root.position);
        chiva.root.rotation.copy(rig.root.rotation);
        pose.cheer = 1;
        animateRig(chiva, pose, t, delta);
        chiva.flames.visible = true;
        chiva.flames.scale.set(1.4, 1.4, 1.2 + Math.random() * 0.8);
      }
    }

    // blink while invulnerable after a hit
    rig.body.visible = run.invulnerable > 0 && run.invulnerable < 50 ? Math.floor(t * 14) % 2 === 0 : true;

    rig.flames.visible = run.nitroTime > 0;
    if (rig.flames.visible) rig.flames.scale.set(1, 1, 0.8 + Math.random() * 0.6);

    rig.shield.visible = run.shield || run.star > 0;
    // panela: the aura cycles through the rainbow
    const sm = rig.shield.material as THREE.MeshStandardMaterial;
    if (run.star > 0) {
      tmpCol.setHSL((t * 1.6) % 1, 1, 0.6);
      sm.color.copy(tmpCol);
      sm.emissive.copy(tmpCol);
    } else {
      sm.color.set("#5fd8ff");
      sm.emissive.set("#24A0CE");
    }
    if (rig.shield.visible) {
      const p = 1 + Math.sin(t * 5) * 0.04;
      rig.shield.scale.set(0.85 * p, 0.62 * p, (rig.length / 3.9) * 1.05 * p);
    }

    if (blob) {
      blob.position.y = -run.y + 0.04;
      const s = Math.max(0.4, 1 - run.y * 0.15);
      blob.scale.set(s, s, 1);
    }
  });

  return (
    <>
      <primitive object={rig.root} />
      {chiva && <primitive object={chiva.root} visible={false} />}
    </>
  );
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
    // idling: the engine shakes the kart, the driver looks around and waves now and then
    rig.body.position.y = Math.sin(t * 40) * 0.008;
    rig.driver.rotation.y = Math.sin(t * 0.9) * 0.5;
    rig.driver.rotation.z = Math.sin(t * 1.7) * 0.08;
    const wave = Math.max(0, Math.sin(t * 0.8)) ** 4;
    rig.hands.forEach((h, i) => {
      const b = h.userData.base as THREE.Vector3;
      const up = i === 1 ? wave : 0;
      h.position.set(b.x - (i === 1 ? up * 0.25 : 0), b.y + up * (0.75 + Math.sin(t * 12) * 0.08), b.z - up * 0.4);
    });
  });
  return (
    <group {...props}>
      <primitive object={rig.root} />
    </group>
  );
}
