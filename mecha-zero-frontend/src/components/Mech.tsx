import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerState, MECH_CONFIGS } from '../types/game';

interface MechProps {
  player: PlayerState;
  isLocalPlayer: boolean;
}

export function Mech({ player, isLocalPlayer }: MechProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mechConfig = MECH_CONFIGS[player.mechType];

  const materials = useMemo(() => {
    const baseColor = new THREE.Color(mechConfig.color);
    const teamColor = player.team === 'teamA' ? new THREE.Color('#ff4444') : new THREE.Color('#4444ff');

    return {
      body: new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.8,
        roughness: 0.2,
        envMapIntensity: 1.0,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: teamColor,
        metalness: 0.9,
        roughness: 0.1,
        emissive: teamColor,
        emissiveIntensity: 0.3,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: '#88ccff',
        metalness: 0.1,
        roughness: 0.0,
        transparent: true,
        opacity: 0.7,
      }),
      joint: new THREE.MeshStandardMaterial({
        color: '#333333',
        metalness: 0.6,
        roughness: 0.4,
      }),
    };
  }, [mechConfig.color, player.team]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );

      const quaternion = new THREE.Quaternion(
        player.rotation.x,
        player.rotation.y,
        player.rotation.z,
        player.rotation.w
      );
      groupRef.current.setRotationFromQuaternion(quaternion);

      if (player.mechType === 'stalker' && player.abilityActive) {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.transparent = true;
            mat.opacity = 0.3;
          }
        });
      } else {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat !== materials.glass) {
              mat.transparent = false;
              mat.opacity = 1;
            }
          }
        });
      }
    }
  });

  const healthPercent = player.health / player.maxHealth;
  const shieldPercent = player.shield / player.maxShield;

  return (
    <group ref={groupRef}>
      <group position={[0, 2, 0]}>
        <mesh castShadow receiveShadow material={materials.body}>
          <boxGeometry args={[1.5, 2, 1]} />
        </mesh>

        <mesh position={[0, 0.8, 0.3]} material={materials.glass}>
          <boxGeometry args={[0.8, 0.4, 0.3]} />
        </mesh>

        <mesh position={[0.6, 0.2, 0]} material={materials.accent}>
          <boxGeometry args={[0.3, 0.8, 0.6]} />
        </mesh>
        <mesh position={[-0.6, 0.2, 0]} material={materials.accent}>
          <boxGeometry args={[0.3, 0.8, 0.6]} />
        </mesh>
      </group>

      <group position={[0, 1.5, 0]}>
        <mesh castShadow material={materials.body}>
          <sphereGeometry args={[0.6, 16, 16]} />
        </mesh>

        <mesh position={[0, 0.3, 0.4]} material={materials.glass}>
          <boxGeometry args={[0.5, 0.3, 0.2]} />
        </mesh>

        {player.mechType === 'leo' && player.abilityActive && (
          <mesh>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshStandardMaterial
              color="#00aaff"
              transparent
              opacity={0.3}
              emissive="#00aaff"
              emissiveIntensity={0.5}
            />
          </mesh>
        )}
      </group>

      <group position={[1.2, 2.5, 0]}>
        <mesh castShadow material={materials.body}>
          <boxGeometry args={[0.4, 1.2, 0.4]} />
        </mesh>
        <mesh position={[0, -0.8, 0]} material={materials.joint}>
          <sphereGeometry args={[0.2, 8, 8]} />
        </mesh>
        <mesh position={[0, -1.4, 0]} castShadow material={materials.body}>
          <boxGeometry args={[0.35, 1, 0.35]} />
        </mesh>
      </group>

      <group position={[-1.2, 2.5, 0]}>
        <mesh castShadow material={materials.body}>
          <boxGeometry args={[0.4, 1.2, 0.4]} />
        </mesh>
        <mesh position={[0, -0.8, 0]} material={materials.joint}>
          <sphereGeometry args={[0.2, 8, 8]} />
        </mesh>
        <mesh position={[0, -1.4, 0]} castShadow material={materials.body}>
          <boxGeometry args={[0.35, 1, 0.35]} />
        </mesh>
      </group>

      <group position={[0.5, 0.8, 0]}>
        <mesh castShadow material={materials.body}>
          <boxGeometry args={[0.5, 1.5, 0.5]} />
        </mesh>
        <mesh position={[0, -1, 0]} material={materials.joint}>
          <sphereGeometry args={[0.25, 8, 8]} />
        </mesh>
        <mesh position={[0, -1.8, 0]} castShadow material={materials.body}>
          <boxGeometry args={[0.45, 1.2, 0.45]} />
        </mesh>
        <mesh position={[0, -2.5, 0.2]} castShadow material={materials.accent}>
          <boxGeometry args={[0.6, 0.3, 0.8]} />
        </mesh>
      </group>

      <group position={[-0.5, 0.8, 0]}>
        <mesh castShadow material={materials.body}>
          <boxGeometry args={[0.5, 1.5, 0.5]} />
        </mesh>
        <mesh position={[0, -1, 0]} material={materials.joint}>
          <sphereGeometry args={[0.25, 8, 8]} />
        </mesh>
        <mesh position={[0, -1.8, 0]} castShadow material={materials.body}>
          <boxGeometry args={[0.45, 1.2, 0.45]} />
        </mesh>
        <mesh position={[0, -2.5, 0.2]} castShadow material={materials.accent}>
          <boxGeometry args={[0.6, 0.3, 0.8]} />
        </mesh>
      </group>

      <group position={[1.5, 2.8, 0.3]}>
        <mesh castShadow material={materials.joint}>
          <cylinderGeometry args={[0.15, 0.12, 1.5, 8]} />
        </mesh>
      </group>

      {!isLocalPlayer && (
        <group position={[0, 5, 0]}>
          <mesh position={[0, 0.3, 0]}>
            <planeGeometry args={[2, 0.2]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[-1 + healthPercent, 0.3, 0.01]}>
            <planeGeometry args={[2 * healthPercent, 0.18]} />
            <meshBasicMaterial color={healthPercent > 0.3 ? '#00ff00' : '#ff0000'} />
          </mesh>

          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[2, 0.15]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[-1 + shieldPercent, 0, 0.01]}>
            <planeGeometry args={[2 * shieldPercent, 0.13]} />
            <meshBasicMaterial color="#00aaff" />
          </mesh>
        </group>
      )}

      {player.mechType === 'griffin' && player.abilityActive && (
        <group position={[0, -0.5, 0]}>
          <pointLight color="#ff8800" intensity={2} distance={5} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.5, 2, 8]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}
