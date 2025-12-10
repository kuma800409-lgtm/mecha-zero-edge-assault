import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Projectile as ProjectileType, WEAPON_CONFIGS } from '../types/game';

interface ProjectileProps {
  projectile: ProjectileType;
}

export function ProjectileComponent({ projectile }: ProjectileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const weaponConfig = WEAPON_CONFIGS[projectile.weaponType];

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z
      );

      const direction = new THREE.Vector3(
        projectile.velocity.x,
        projectile.velocity.y,
        projectile.velocity.z
      ).normalize();

      if (direction.length() > 0) {
        meshRef.current.lookAt(
          projectile.position.x + direction.x,
          projectile.position.y + direction.y,
          projectile.position.z + direction.z
        );
      }
    }
  });

  const color = new THREE.Color(weaponConfig.color);

  if (projectile.weaponType === 'kinetic') {
    return (
      <group>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2}
          />
        </mesh>
        <pointLight
          position={[projectile.position.x, projectile.position.y, projectile.position.z]}
          color={color}
          intensity={1}
          distance={5}
        />
      </group>
    );
  }

  if (projectile.weaponType === 'energy') {
    return (
      <group>
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
            transparent
            opacity={0.8}
          />
        </mesh>
        <pointLight
          position={[projectile.position.x, projectile.position.y, projectile.position.z]}
          color={color}
          intensity={2}
          distance={8}
        />
      </group>
    );
  }

  if (projectile.weaponType === 'explosive') {
    return (
      <group>
        <mesh ref={meshRef}>
          <coneGeometry args={[0.15, 0.6, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.5}
          />
        </mesh>
        <mesh
          position={[projectile.position.x, projectile.position.y, projectile.position.z]}
        >
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial
            color="#ff8800"
            emissive="#ff4400"
            emissiveIntensity={1}
            transparent
            opacity={0.5}
          />
        </mesh>
        <pointLight
          position={[projectile.position.x, projectile.position.y, projectile.position.z]}
          color={color}
          intensity={1.5}
          distance={6}
        />
      </group>
    );
  }

  return null;
}
