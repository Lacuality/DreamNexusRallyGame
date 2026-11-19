import * as THREE from "three";

/**
 * The game's look: cel shading (three flat tones instead of smooth gradients)
 * and dark ink outlines on the things you interact with.
 */
let ramp: THREE.DataTexture | null = null;
function gradient() {
  if (!ramp) {
    // shadow / mid / light
    ramp = new THREE.DataTexture(new Uint8Array([104, 108, 132, 255, 186, 188, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.generateMipmaps = false;
    ramp.needsUpdate = true;
  }
  return ramp;
}

type Params = THREE.MeshStandardMaterialParameters;

/** A cel-shaded material. Takes the usual parameters; ignores the PBR-only ones. */
export function toonMat(p: Params = {}): THREE.MeshStandardMaterial {
  const { roughness, metalness, flatShading, envMapIntensity, ...rest } = p as any;
  void roughness, void metalness, void flatShading, void envMapIntensity;
  const m = new THREE.MeshToonMaterial({ ...rest, gradientMap: gradient() });
  // typed as a standard material so existing code (colour, emissive, map...) keeps working
  return m as unknown as THREE.MeshStandardMaterial;
}

/** Convert a loaded model's material to the cel-shaded look. */
export function toonify(mat: THREE.Material): THREE.Material {
  const s = mat as THREE.MeshStandardMaterial;
  if ((mat as any).isMeshToonMaterial) return mat;
  if (!(s.isMeshStandardMaterial || (mat as any).isMeshBasicMaterial || (mat as any).isMeshLambertMaterial || (mat as any).isMeshPhongMaterial)) return mat;
  return toonMat({
    color: s.color,
    map: s.map,
    emissive: s.emissive,
    emissiveMap: s.emissiveMap,
    emissiveIntensity: s.emissiveIntensity,
    transparent: s.transparent,
    opacity: s.opacity,
    alphaTest: s.alphaTest,
    side: s.side,
    vertexColors: s.vertexColors,
    name: s.name,
  });
}

const outlineMats = new Map<string, THREE.Material>();
function outlineMat(thickness: number, color: string) {
  const key = `${thickness}|${color}`;
  let m = outlineMats.get(key);
  if (!m) {
    const mm = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    // push the back faces out along the normal, in view space, so the line is the same width whatever the model's scale
    mm.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
         vec3 outlineN = normalize( normalMatrix * objectNormal );
         mvPosition.xyz += outlineN * ${thickness.toFixed(4)};
         gl_Position = projectionMatrix * mvPosition;`,
      );
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n#include <beginnormal_vertex>");
    };
    mm.customProgramCacheKey = () => `outline-${key}`;
    m = mm;
    outlineMats.set(key, m);
  }
  return m;
}

/** Ink outline: a slightly bigger, inside-out black copy behind every solid mesh. */
export function addOutline(root: THREE.Object3D, thickness = 0.045, color = "#10141c") {
  const targets: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.outline) return;
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    if (!mat || mat.transparent || (mat as any).isMeshBasicMaterial || !m.geometry?.attributes?.normal) return;
    targets.push(m);
  });
  for (const m of targets) {
    const line = new THREE.Mesh(m.geometry, outlineMat(thickness, color));
    line.userData.outline = true;
    line.castShadow = false;
    line.receiveShadow = false;
    m.add(line);
  }
  return root;
}
