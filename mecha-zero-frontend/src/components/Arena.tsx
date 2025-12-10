import { useRef } from 'react';
import * as THREE from 'three';

export function Arena() {
  const groundRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200, 50, 50]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.3}
          roughness={0.8}
        />
      </mesh>

      <gridHelper args={[200, 40, '#333355', '#222244']} position={[0, -0.49, 0]} />

      {Array.from({ length: 20 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        const height = 3 + Math.random() * 7;
        const width = 2 + Math.random() * 4;
        const depth = 2 + Math.random() * 4;

        return (
          <mesh
            key={`building-${i}`}
            position={[x, height / 2, z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
              color="#2a2a4e"
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
        );
      })}

      {Array.from({ length: 10 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        const radius = 1 + Math.random() * 2;
        const height = 2 + Math.random() * 3;

        return (
          <mesh
            key={`cylinder-${i}`}
            position={[x, height / 2, z]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[radius, radius, height, 16]} />
            <meshStandardMaterial
              color="#3a3a5e"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
        );
      })}

      <group position={[-50, 0, -50]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[10, 4, 10]} />
          <meshStandardMaterial color="#ff4444" metalness={0.5} roughness={0.5} />
        </mesh>
        <pointLight position={[0, 5, 0]} color="#ff4444" intensity={1} distance={20} />
      </group>

      <group position={[50, 0, 50]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[10, 4, 10]} />
          <meshStandardMaterial color="#4444ff" metalness={0.5} roughness={0.5} />
        </mesh>
        <pointLight position={[0, 5, 0]} color="#4444ff" intensity={1} distance={20} />
      </group>

      <mesh position={[-100, 25, 0]} receiveShadow>
        <boxGeometry args={[1, 50, 200]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[100, 25, 0]} receiveShadow>
        <boxGeometry args={[1, 50, 200]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 25, -100]} receiveShadow>
        <boxGeometry args={[200, 50, 1]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 25, 100]} receiveShadow>
        <boxGeometry args={[200, 50, 1]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}
