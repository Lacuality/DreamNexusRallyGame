import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NitroParticlesProps {
  active: boolean;
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
}

export function NitroParticles({ active, carPositionRef }: NitroParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  
  const particleCount = 50;
  
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.1 + 0.05, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 0.2 + 0.1;
    }
    
    return { positions, colors, sizes };
  }, []);
  
  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return;
    
    timeRef.current += delta;
    const positionAttribute = particlesRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const offset = (timeRef.current + i * 0.1) % 1;
      const spread = 0.4;
      
      positions[i * 3] = carPositionRef.current.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = carPositionRef.current.y - 0.3 + Math.random() * 0.2;
      positions[i * 3 + 2] = carPositionRef.current.z - offset * 2;
    }
    
    positionAttribute.needsUpdate = true;
  });
  
  if (!active) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface DustTrailProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
  speedRef: React.MutableRefObject<number>;
}

export function DustTrail({ carPositionRef, speedRef }: DustTrailProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  
  const particleCount = 30;
  
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      colors[i * 3] = 0.6;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0.4;
      
      sizes[i] = Math.random() * 0.15 + 0.1;
    }
    
    return { positions, colors, sizes };
  }, []);
  
  useFrame((state, delta) => {
    if (!particlesRef.current || speedRef.current < 5) return;
    
    timeRef.current += delta;
    const positionAttribute = particlesRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const offset = (timeRef.current * 2 + i * 0.1) % 1;
      const spread = 0.6;
      
      positions[i * 3] = carPositionRef.current.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = 0.1 + Math.random() * 0.1;
      positions[i * 3 + 2] = carPositionRef.current.z - offset * 3;
    }
    
    positionAttribute.needsUpdate = true;
  });
  
  if (speedRef.current < 5) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

interface CollectibleSparklesProps {
  position: THREE.Vector3;
}

export function CollectibleSparkles({ position }: CollectibleSparklesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  
  const particleCount = 20;
  
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.5;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(timeRef.current + i * 0.3) * 0.3;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.9;
      colors[i * 3 + 2] = 0.3;
      
      sizes[i] = 0.08;
    }
    
    return { positions, colors, sizes };
  }, []);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    timeRef.current += delta * 2;
    const positionAttribute = particlesRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + timeRef.current;
      const radius = 0.5 + Math.sin(timeRef.current * 2 + i) * 0.1;
      
      positions[i * 3] = position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = position.y + Math.sin(timeRef.current * 3 + i * 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius;
    }
    
    positionAttribute.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface ExhaustSmokeProps {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
  speedRef: React.MutableRefObject<number>;
}

export function ExhaustSmoke({ carPositionRef, speedRef }: ExhaustSmokeProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  
  const particleCount = 25;
  
  const { positions, colors, sizes, lifetimes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.3;
      colors[i * 3 + 2] = 0.35;
      
      sizes[i] = Math.random() * 0.2 + 0.15;
      lifetimes[i] = Math.random();
    }
    
    return { positions, colors, sizes, lifetimes };
  }, []);
  
  useFrame((state, delta) => {
    if (!particlesRef.current || speedRef.current < 10) return;
    
    timeRef.current += delta;
    const positionAttribute = particlesRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      lifetimes[i] += delta * 2;
      if (lifetimes[i] > 1) lifetimes[i] = 0;
      
      const life = lifetimes[i];
      const spread = life * 0.8;
      
      positions[i * 3] = carPositionRef.current.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = 0.2 + life * 0.5;
      positions[i * 3 + 2] = carPositionRef.current.z - 1.2 - life * 2;
    }
    
    positionAttribute.needsUpdate = true;
  });
  
  if (speedRef.current < 10) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

interface CollisionSparksProps {
  position: THREE.Vector3;
  active: boolean;
}

export function CollisionSparks({ position, active }: CollisionSparksProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const startTimeRef = useRef(0);
  
  const particleCount = 30;
  
  const { positions, colors, sizes, velocities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.5;
      positions[i * 3 + 2] = position.z;
      
      const isOrange = Math.random() > 0.5;
      colors[i * 3] = isOrange ? 1 : 1;
      colors[i * 3 + 1] = isOrange ? 0.5 : 0.8;
      colors[i * 3 + 2] = 0;
      
      sizes[i] = Math.random() * 0.15 + 0.1;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.random() * 2 + 1;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }
    
    return { positions, colors, sizes, velocities };
  }, [position.x, position.y, position.z]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return;
    
    if (timeRef.current === 0) {
      startTimeRef.current = state.clock.elapsedTime;
    }
    
    timeRef.current += delta;
    
    if (timeRef.current > 0.5) {
      timeRef.current = 0;
      return;
    }
    
    const positionAttribute = particlesRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += (velocities[i * 3 + 1] - 9.8 * timeRef.current) * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    
    positionAttribute.needsUpdate = true;
  });
  
  if (!active || timeRef.current > 0.5) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
