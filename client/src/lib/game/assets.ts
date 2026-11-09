import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { asset } from "../env";

/**
 * Real 3D models (CC0: Kenney's Car Kit + Nature Kit, Quaternius props —
 * see public/models/LICENSE-ASSETS.txt). Everything is preloaded once at
 * startup; builders then clone the templates. If a file fails to load the
 * game falls back to its procedural models, so nothing breaks offline.
 */
export const MODEL_FILES = [
  "kart_a", "kart_b", "kart_c", "kart_d", "kart_e", "race_car", "race_car_future", "taxi", "police_car", "suv", "van", "truck", "hatchback_sports", "tractor",
  "banana", "tree_palm", "tree_pine", "tree_pine_tall", "tree_oak", "tree_fat", "tree_autumn", "bush", "bush_large", "rock_large", "rock_small", "rock_tall", "cactus", "fence", "barrel", "crate", "log", "stump",
] as const;
export type ModelName = (typeof MODEL_FILES)[number];

const templates = new Map<string, THREE.Group>();
let loading: Promise<void> | null = null;

/** Convert glTF materials to lit, shadowed standard materials (Kenney's nature kit is "unlit"). */
function prepare(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const fixed = mats.map((mat) => {
      if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        const b = mat as THREE.MeshBasicMaterial;
        return new THREE.MeshStandardMaterial({ color: b.color, map: b.map, roughness: 0.9, metalness: 0, vertexColors: b.vertexColors });
      }
      const s = mat as THREE.MeshStandardMaterial;
      if (s.isMeshStandardMaterial) {
        s.roughness = Math.max(0.45, s.roughness);
        s.metalness = Math.min(0.15, s.metalness);
      }
      return mat;
    });
    m.material = Array.isArray(m.material) ? fixed : fixed[0];
  });
}

export function preloadAssets(): Promise<void> {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loading = Promise.all(
    MODEL_FILES.map(
      (name) =>
        new Promise<void>((resolve) => {
          loader.load(
            asset(`/models/${name}.glb`),
            (gltf) => {
              prepare(gltf.scene);
              templates.set(name, gltf.scene);
              resolve();
            },
            undefined,
            (err) => {
              console.warn(`Model ${name} did not load`, err);
              resolve();
            },
          );
        }),
    ),
  ).then(() => undefined);
  return loading;
}

export function hasModel(name: ModelName) {
  return templates.has(name);
}

const box = new THREE.Box3();
const size = new THREE.Vector3();
const center = new THREE.Vector3();

/**
 * Clone of a model, scaled so its longest footprint side (or the given axis) is `targetSize`
 * metres, standing on y = 0 and centred on x/z. Returns null if the model isn't loaded.
 */
export function cloneModel(name: ModelName, targetSize?: number, axis: "x" | "y" | "z" | "max" = "max"): THREE.Group | null {
  const t = templates.get(name);
  if (!t) return null;
  const inner = t.clone(true);
  // clone materials so each copy can be tinted on its own
  inner.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : (m.material as THREE.Material).clone();
  });
  const wrap = new THREE.Group();
  wrap.add(inner);
  box.setFromObject(inner);
  box.getSize(size);
  box.getCenter(center);
  if (targetSize) {
    const cur = axis === "max" ? Math.max(size.x, size.z) : size[axis];
    const s = targetSize / Math.max(1e-6, cur);
    inner.scale.setScalar(s);
    inner.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  } else inner.position.set(-center.x, -box.min.y, -center.z);
  wrap.userData.model = name;
  return wrap;
}

/** Tint every material of a model (Kenney's cars share one light palette texture, so a tint reads as paint). */
export function tintModel(root: THREE.Object3D, color: THREE.ColorRepresentation, skip?: (o: THREE.Object3D) => boolean) {
  const c = new THREE.Color(color);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (skip && skip(m))) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const s = mat as THREE.MeshStandardMaterial;
      if (s.color) s.color.copy(c);
    }
  });
}
