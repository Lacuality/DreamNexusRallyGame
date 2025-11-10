import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useBiome } from "@/lib/stores/useBiome";

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function AtmosphericParticles({ carPositionRef }: { carPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { currentBiome } = useBiome();

  const particleCount = 150;
  const particles = useRef<ParticleData[]>([]);

  const { geometry, positions, colors, sizes } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const siz = new Float32Array(particleCount);

    particles.current = [];
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          Math.random() * 15,
          (Math.random() - 0.5) * 60
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          -0.01 - Math.random() * 0.02,
          -0.05 - Math.random() * 0.1
        ),
        life: Math.random(),
        maxLife: 1,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));

    return { geometry: geo, positions: pos, colors: col, sizes: siz };
  }, []);

  const particleColor = useMemo(() => {
    switch (currentBiome) {
      case "coffee_hills":
        return new THREE.Color(0x8B4513);
      case "andes_highland":
        return new THREE.Color(0xE8F4F8);
      case "pueblo":
        return new THREE.Color(0xFFE5CC);
      default:
        return new THREE.Color(0xFFFFFF);
    }
  }, [currentBiome]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const carPos = carPositionRef.current;

    for (let i = 0; i < particleCount; i++) {
      const particle = particles.current[i];
      
      particle.position.add(particle.velocity);
      particle.life -= delta * 0.3;

      if (particle.life <= 0 || particle.position.y < -1) {
        particle.position.set(
          (Math.random() - 0.5) * 40,
          12 + Math.random() * 5,
          carPos.z + 20 + Math.random() * 40
        );
        particle.life = 1;
        
        if (currentBiome === "coffee_hills") {
          particle.velocity.set(
            (Math.random() - 0.5) * 0.03,
            -0.015,
            -0.08
          );
        } else if (currentBiome === "andes_highland") {
          particle.velocity.set(
            (Math.random() - 0.5) * 0.01,
            -0.02,
            -0.06
          );
        } else {
          particle.velocity.set(
            (Math.random() - 0.5) * 0.02,
            -0.01,
            -0.07
          );
        }
      }

      const idx = i * 3;
      positions[idx] = particle.position.x;
      positions[idx + 1] = particle.position.y;
      positions[idx + 2] = particle.position.z;

      const alpha = particle.life;
      colors[idx] = particleColor.r * alpha;
      colors[idx + 1] = particleColor.g * alpha;
      colors[idx + 2] = particleColor.b * alpha;

      sizes[i] = currentBiome === "coffee_hills" ? 0.15 : 0.25;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={0.2}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
