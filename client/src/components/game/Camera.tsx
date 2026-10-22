import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { run } from "@/lib/game/run";
import { frameAt, toWorld } from "@/lib/track";
import { input } from "@/lib/input";
import { useSettings } from "@/lib/stores/useSettings";

/**
 * Chase camera: sits behind the car along the road direction, widens its view
 * with speed, shakes on hits. Hold B (or the 👀 button) to look behind you.
 */
export function Camera() {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3(0, 4, -9));
  const look = useRef(new THREE.Vector3(0, 1, 5));
  const tmp = useRef(new THREE.Vector3());
  const car = useRef(new THREE.Vector3());
  const reducedMotion = useSettings((s) => s.reducedMotion);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const z = run.z;
    const sp = Math.min(1.3, run.speed / 50);
    const behind = input.lookBack || input.touchLook;
    const dir = behind ? -1 : 1;

    toWorld(z, run.lat, run.y * 0.6, car.current);
    const f = frameAt(z - 6 * dir);
    const tx = Math.sin(f.heading), tz = Math.cos(f.heading);

    const portrait = size.width < size.height;
    const back = 8.2 + sp * 1.6 + (portrait ? 3 : 0);
    const height = 3.4 + sp * 0.4 + (portrait ? 1.6 : 0);
    // behind the car along the road, leaning slightly into the steer / drift
    const lean = (run.latVel * 0.06 + run.driftDir * 0.8 * Math.min(1, run.drift * 3)) * dir;
    tmp.current.set(car.current.x - tx * back * dir - f.nx * lean, 0, car.current.z - tz * back * dir - f.nz * lean);
    const groundY = toWorld(z - back * dir, 0, 0, { x: 0, y: 0, z: 0 }).y;
    tmp.current.y = Math.max(car.current.y, groundY) + height;
    // snap when flipping to the rear view so it doesn't swing through the car
    pos.current.lerp(tmp.current, behind !== lastBehind.current ? 1 : 1 - Math.exp(-dt * 7));

    const aheadZ = z + 9 * dir;
    toWorld(aheadZ, run.lat * 0.65, 0, tmp.current);
    tmp.current.y = tmp.current.y * 0.5 + car.current.y * 0.5 + 1.2;
    look.current.lerp(tmp.current, behind !== lastBehind.current ? 1 : 1 - Math.exp(-dt * 10));
    lastBehind.current = behind;

    camera.position.copy(pos.current);
    if (run.shake > 0 && !reducedMotion) {
      const s = run.shake * 0.35;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.lookAt(look.current);

    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = 62 + sp * 10 + (run.nitroTime > 0 ? 6 : 0);
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 4);
      cam.updateProjectionMatrix();
    }
  });

  const lastBehind = useRef(false);
  return null;
}
