import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gameNetworking } from '../utils/networking';
import { Mech } from './Mech';
import { Arena } from './Arena';
import { ProjectileComponent } from './Projectile';
import { HUD } from './HUD';

function CameraController() {
  const { camera } = useThree();
  const { playerId, players, setInputState } = useGameStore();
  const cameraOffset = useRef(new THREE.Vector3(0, 10, 15));
  const mousePosition = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLocked.current) {
        mousePosition.current.x += e.movementX * 0.002;
        mousePosition.current.y = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 6, mousePosition.current.y + e.movementY * 0.002)
        );
        setInputState({ mouseX: mousePosition.current.x, mouseY: mousePosition.current.y });
      }
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement !== null;
    };

    const handleClick = () => {
      if (!isPointerLocked.current) {
        document.body.requestPointerLock();
      } else {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        gameNetworking.shoot({ x: direction.x, y: direction.y, z: direction.z });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          setInputState({ forward: true });
          break;
        case 'KeyS':
          setInputState({ backward: true });
          break;
        case 'KeyA':
          setInputState({ left: true });
          break;
        case 'KeyD':
          setInputState({ right: true });
          break;
        case 'Space':
          setInputState({ jump: true });
          gameNetworking.useAbility();
          break;
        case 'Escape':
          document.exitPointerLock();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          setInputState({ forward: false });
          break;
        case 'KeyS':
          setInputState({ backward: false });
          break;
        case 'KeyA':
          setInputState({ left: false });
          break;
        case 'KeyD':
          setInputState({ right: false });
          break;
        case 'Space':
          setInputState({ jump: false });
          break;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera, setInputState]);

  useFrame(() => {
    if (!playerId) return;

    const localPlayer = players.get(playerId);
    if (!localPlayer) return;

    const targetPosition = new THREE.Vector3(
      localPlayer.position.x,
      localPlayer.position.y + 3,
      localPlayer.position.z
    );

    const rotatedOffset = cameraOffset.current.clone();
    rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), mousePosition.current.x);

    const cameraTarget = targetPosition.clone().add(rotatedOffset);
    camera.position.lerp(cameraTarget, 0.1);
    camera.lookAt(targetPosition);
  });

  return null;
}

function GameContent() {
  const { players, projectiles, playerId, getInterpolatedState } = useGameStore();

  const interpolatedState = getInterpolatedState();
  const displayPlayers = interpolatedState?.players || Array.from(players.values());
  const displayProjectiles = interpolatedState?.projectiles || Array.from(projectiles.values());

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <pointLight position={[0, 50, 0]} intensity={0.5} />

      <Sky sunPosition={[100, 20, 100]} />
      <fog attach="fog" args={['#1a1a2e', 50, 200]} />

      <Arena />

      {displayPlayers.map((player) => (
        <Mech
          key={player.id}
          player={player}
          isLocalPlayer={player.id === playerId}
        />
      ))}

      {displayProjectiles.map((projectile) => (
        <ProjectileComponent key={projectile.id} projectile={projectile} />
      ))}

      <CameraController />
    </>
  );
}

export function GameScene() {
  return (
    <div className="w-full h-screen">
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 10, 15] }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <GameContent />
      </Canvas>
      <HUD />
    </div>
  );
}
