import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { run } from "@/lib/game/run";
import { roadX, roadY, roadSlope } from "@/lib/track";
import { useSettings } from "@/lib/stores/useSettings";

/** Chase camera: follows the road heading, widens FOV with speed, shakes on hits. */
export function Camera() {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3(0, 4, -9));
  const look = useRef(new THREE.Vector3(0, 1, 5));
  const tmp = useRef(new THREE.Vector3());
  const reducedMotion = useSettings((s) => s.reducedMotion);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const z = run.z;
    const carX = roadX(z) + run.lat;
    const carY = roadY(z) + run.y * 0.6;
    const slope = roadSlope(z - 6);
    const sp = Math.min(1.3, run.speed / 50);

    const portrait = size.width < size.height;
    const back = 8.2 + sp * 1.6 + (portrait ? 3 : 0);
    const height = 3.4 + sp * 0.4 + (portrait ? 1.6 : 0);
    // behind the car along the road direction, leaning slightly into the steer
    const len = Math.hypot(slope, 1);
    tmp.current.set(
      carX - (slope / len) * back - run.latVel * 0.06,
      Math.max(carY, roadY(z - back)) + height,
      z - (1 / len) * back,
    );
    pos.current.lerp(tmp.current, 1 - Math.exp(-dt * 7));

    const aheadZ = z + 9;
    tmp.current.set(roadX(aheadZ) * 0.35 + carX * 0.65, roadY(aheadZ) * 0.5 + carY * 0.5 + 1.2, aheadZ);
    look.current.lerp(tmp.current, 1 - Math.exp(-dt * 10));

    camera.position.copy(pos.current);
    if (run.shake > 0 && !reducedMotion) {
      const s = run.shake * 0.35;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.lookAt(look.current);

    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = 62 + sp * 10 + (run.nitroTime > 0 ? 10 : 0);
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 4);
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
