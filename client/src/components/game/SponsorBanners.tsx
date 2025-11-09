import { useMemo } from "react";
import * as THREE from "three";

export function SponsorBanners() {
  const bannerPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      positions.push({
        key: i,
        position: [
          side * 7,
          1.5,
          i * 30 + 20
        ] as [number, number, number],
        rotation: side === 1 ? -Math.PI / 2 : Math.PI / 2
      });
    }
    return positions;
  }, []);
  
  return (
    <group>
      {bannerPositions.map((banner) => (
        <Banner
          key={banner.key}
          position={banner.position}
          rotation={banner.rotation}
        />
      ))}
    </group>
  );
}

function Banner({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#0E1B24';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#24A0CE';
      ctx.font = 'bold 60px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Dream Nexus', canvas.width / 2, canvas.height / 2 - 30);
      
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = '#FDC6B5';
      ctx.fillText('Rally', canvas.width / 2, canvas.height / 2 + 40);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 1.5, 3]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.05, 2, 4]} />
        <meshStandardMaterial
          map={texture}
          emissive="#0E1B24"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}
