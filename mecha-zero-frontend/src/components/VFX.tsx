import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MuzzleFlashProps {
  position: [number, number, number];
  color?: string;
  duration?: number;
}

export function MuzzleFlash({ position, color = '#ffff00', duration = 100 }: MuzzleFlashProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (meshRef.current) {
      const elapsed = Date.now() - startTime.current;
      const progress = elapsed / duration;

      if (progress >= 1) {
        meshRef.current.visible = false;
      } else {
        meshRef.current.scale.setScalar(1 + progress * 2);
        const material = meshRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - progress;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
}

interface ExplosionProps {
  position: [number, number, number];
  size?: number;
  duration?: number;
}

export function Explosion({ position, size = 5, duration = 500 }: ExplosionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (groupRef.current) {
      const elapsed = Date.now() - startTime.current;
      const progress = elapsed / duration;

      if (progress >= 1) {
        groupRef.current.visible = false;
      } else {
        groupRef.current.scale.setScalar(1 + progress * size);
        groupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshBasicMaterial;
            material.opacity = 1 - progress;
          }
        });
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      <pointLight color="#ff4400" intensity={10} distance={size * 3} />
    </group>
  );
}

interface DamageIndicatorProps {
  position: [number, number, number];
  damage: number;
}

export function DamageIndicator({ position, damage }: DamageIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());
  const scale = Math.min(2, 0.5 + damage / 200);

  useFrame(() => {
    if (meshRef.current) {
      const elapsed = Date.now() - startTime.current;
      const progress = elapsed / 1000;

      if (progress >= 1) {
        meshRef.current.visible = false;
      } else {
        meshRef.current.position.y = position[1] + progress * 3;
        const material = meshRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - progress;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale, scale]}>
      <planeGeometry args={[1, 0.5]} />
      <meshBasicMaterial color="#ff0000" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface ShieldEffectProps {
  position: [number, number, number];
  radius?: number;
}

export function ShieldEffect({ position, radius = 3 }: ShieldEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(clock.elapsedTime * 5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial
        color="#00aaff"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        wireframe
      />
    </mesh>
  );
}

interface JetFlameProps {
  position: [number, number, number];
  intensity?: number;
}

export function JetFlame({ position, intensity = 1 }: JetFlameProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const scale = 0.8 + Math.sin(clock.elapsedTime * 20) * 0.2;
      groupRef.current.scale.set(scale * intensity, scale * intensity * 1.5, scale * intensity);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[Math.PI, 0, 0]}>
      <mesh>
        <coneGeometry args={[0.3, 1.5, 8]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <coneGeometry args={[0.2, 1, 8]} />
        <meshBasicMaterial color="#ffcc00" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} />
      </mesh>
      <pointLight color="#ff8800" intensity={2 * intensity} distance={5} />
    </group>
  );
}

interface StealthEffectProps {
  position: [number, number, number];
}

export function StealthEffect({ position }: StealthEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + Math.sin(clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial
        color="#00ff88"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
