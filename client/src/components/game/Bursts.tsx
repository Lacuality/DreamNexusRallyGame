import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { burstQueue } from "@/lib/game/fx";

const MAX = 360;

/** Pooled particle bursts (one instanced mesh, no allocations per frame). */
export function Bursts() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(
    () =>
      Array.from({ length: MAX }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        r: new THREE.Euler(),
        life: 0,
        max: 1,
        size: 0.18,
      })),
    [],
  );
  const next = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: "#ffffff", emissiveIntensity: 0.25 }), []);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 20);

    // spawn queued bursts
    while (burstQueue.length) {
      const b = burstQueue.shift()!;
      for (let i = 0; i < b.count; i++) {
        const idx = next.current;
        next.current = (next.current + 1) % MAX;
        const pt = parts[idx];
        const a = Math.random() * Math.PI * 2;
        const s = b.speed * (0.4 + Math.random() * 0.8);
        pt.p.set(b.x, b.y, b.z);
        pt.v.set(Math.cos(a) * s, b.up * (0.5 + Math.random()), Math.sin(a) * s);
        pt.r.set(Math.random() * 6, Math.random() * 6, 0);
        pt.max = pt.life = 0.6 + Math.random() * 0.5;
        pt.size = b.size * (0.6 + Math.random() * 0.8);
        color.set(b.colors[i % b.colors.length]);
        m.setColorAt(idx, color);
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    let any = false;
    for (let i = 0; i < MAX; i++) {
      const pt = parts[i];
      if (pt.life <= 0) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }
      any = true;
      pt.life -= dt;
      pt.v.y -= 16 * dt;
      pt.p.addScaledVector(pt.v, dt);
      pt.r.x += dt * 9;
      pt.r.y += dt * 7;
      dummy.position.copy(pt.p);
      dummy.rotation.copy(pt.r);
      dummy.scale.setScalar(pt.size * Math.min(1, (pt.life / pt.max) * 2.5));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.visible = any;
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} />;
}
