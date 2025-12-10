import { create } from 'zustand';
import {
  PlayerState,
  Projectile,
  Snapshot,
  MechType,
  WeaponType,
  Team,
  GamePhase,
  Vector3,
  Quaternion,
  PlayerInput,
} from '../types/game';

interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
  ability: boolean;
  mouseX: number;
  mouseY: number;
}

interface PendingInput extends PlayerInput {
  predictedPosition: Vector3;
  predictedVelocity: Vector3;
}

interface GameStore {
  gamePhase: GamePhase;
  playerId: string | null;
  playerName: string;
  selectedMech: MechType;
  selectedWeapon: WeaponType;
  team: Team | null;
  roomId: string | null;

  players: Map<string, PlayerState>;
  projectiles: Map<string, Projectile>;
  teamAScore: number;
  teamBScore: number;
  tick: number;

  inputState: InputState;
  inputSequence: number;
  pendingInputs: PendingInput[];
  lastServerTick: number;
  serverTimeOffset: number;

  snapshotBuffer: Snapshot[];
  interpolationDelay: number;

  isConnected: boolean;
  isMatchmaking: boolean;
  queuePosition: number;
  estimatedWait: number;

  setGamePhase: (phase: GamePhase) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setSelectedMech: (mech: MechType) => void;
  setSelectedWeapon: (weapon: WeaponType) => void;
  setTeam: (team: Team) => void;
  setRoomId: (roomId: string) => void;

  updatePlayers: (players: PlayerState[]) => void;
  updateProjectiles: (projectiles: Projectile[]) => void;
  updateScores: (teamA: number, teamB: number) => void;
  setTick: (tick: number) => void;

  setInputState: (input: Partial<InputState>) => void;
  incrementInputSequence: () => number;
  addPendingInput: (input: PendingInput) => void;
  reconcile: (lastProcessedInput: number, serverPosition: Vector3, serverVelocity: Vector3) => void;

  addSnapshot: (snapshot: Snapshot) => void;
  getInterpolatedState: () => { players: PlayerState[]; projectiles: Projectile[] } | null;

  setConnected: (connected: boolean) => void;
  setMatchmaking: (matchmaking: boolean) => void;
  setQueueInfo: (position: number, wait: number) => void;

  reset: () => void;
}

const initialInputState: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  shoot: false,
  ability: false,
  mouseX: 0,
  mouseY: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  gamePhase: 'lobby',
  playerId: null,
  playerName: 'Player',
  selectedMech: 'griffin',
  selectedWeapon: 'kinetic',
  team: null,
  roomId: null,

  players: new Map(),
  projectiles: new Map(),
  teamAScore: 0,
  teamBScore: 0,
  tick: 0,

  inputState: { ...initialInputState },
  inputSequence: 0,
  pendingInputs: [],
  lastServerTick: 0,
  serverTimeOffset: 0,

  snapshotBuffer: [],
  interpolationDelay: 100,

  isConnected: false,
  isMatchmaking: false,
  queuePosition: 0,
  estimatedWait: 0,

  setGamePhase: (phase) => set({ gamePhase: phase }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setSelectedMech: (mech) => set({ selectedMech: mech }),
  setSelectedWeapon: (weapon) => set({ selectedWeapon: weapon }),
  setTeam: (team) => set({ team }),
  setRoomId: (roomId) => set({ roomId }),

  updatePlayers: (players) => {
    const playerMap = new Map<string, PlayerState>();
    players.forEach((p) => playerMap.set(p.id, p));
    set({ players: playerMap });
  },

  updateProjectiles: (projectiles) => {
    const projectileMap = new Map<string, Projectile>();
    projectiles.forEach((p) => projectileMap.set(p.id, p));
    set({ projectiles: projectileMap });
  },

  updateScores: (teamA, teamB) => set({ teamAScore: teamA, teamBScore: teamB }),
  setTick: (tick) => set({ tick, lastServerTick: tick }),

  setInputState: (input) =>
    set((state) => ({
      inputState: { ...state.inputState, ...input },
    })),

  incrementInputSequence: () => {
    const current = get().inputSequence;
    set({ inputSequence: current + 1 });
    return current + 1;
  },

  addPendingInput: (input) =>
    set((state) => ({
      pendingInputs: [...state.pendingInputs, input].slice(-60),
    })),

  reconcile: (lastProcessedInput, serverPosition, serverVelocity) => {
    set((state) => {
      const pendingInputs = state.pendingInputs.filter(
        (input) => input.sequenceNumber > lastProcessedInput
      );

      const players = new Map(state.players);
      const localPlayer = players.get(state.playerId || '');

      if (localPlayer) {
        const positionError = Math.sqrt(
          Math.pow(localPlayer.position.x - serverPosition.x, 2) +
            Math.pow(localPlayer.position.y - serverPosition.y, 2) +
            Math.pow(localPlayer.position.z - serverPosition.z, 2)
        );

        if (positionError > 0.5) {
          localPlayer.position = { ...serverPosition };
          localPlayer.velocity = { ...serverVelocity };

          pendingInputs.forEach((input) => {
            applyInputToPlayer(localPlayer, input);
          });
        }

        players.set(localPlayer.id, localPlayer);
      }

      return { pendingInputs, players };
    });
  },

  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshotBuffer: [...state.snapshotBuffer, snapshot].slice(-20),
    })),

  getInterpolatedState: () => {
    const { snapshotBuffer, interpolationDelay, playerId } = get();

    if (snapshotBuffer.length < 2) return null;

    const renderTime = Date.now() - interpolationDelay;

    let older: Snapshot | null = null;
    let newer: Snapshot | null = null;

    for (let i = snapshotBuffer.length - 1; i >= 0; i--) {
      if (snapshotBuffer[i].timestamp <= renderTime) {
        older = snapshotBuffer[i];
        newer = snapshotBuffer[i + 1] || snapshotBuffer[i];
        break;
      }
    }

    if (!older || !newer) {
      const latest = snapshotBuffer[snapshotBuffer.length - 1];
      return {
        players: latest.players,
        projectiles: latest.projectiles,
      };
    }

    const t =
      older.timestamp === newer.timestamp
        ? 0
        : (renderTime - older.timestamp) / (newer.timestamp - older.timestamp);

    const interpolatedPlayers = older.players.map((oldPlayer) => {
      if (oldPlayer.id === playerId) {
        return oldPlayer;
      }

      const newPlayer = newer!.players.find((p) => p.id === oldPlayer.id);
      if (!newPlayer) return oldPlayer;

      return {
        ...oldPlayer,
        position: lerpVector3(oldPlayer.position, newPlayer.position, t),
        rotation: slerpQuaternion(oldPlayer.rotation, newPlayer.rotation, t),
      };
    });

    const interpolatedProjectiles = older.projectiles.map((oldProj) => {
      const newProj = newer!.projectiles.find((p) => p.id === oldProj.id);
      if (!newProj) return oldProj;

      return {
        ...oldProj,
        position: lerpVector3(oldProj.position, newProj.position, t),
      };
    });

    return {
      players: interpolatedPlayers,
      projectiles: interpolatedProjectiles,
    };
  },

  setConnected: (connected) => set({ isConnected: connected }),
  setMatchmaking: (matchmaking) => set({ isMatchmaking: matchmaking }),
  setQueueInfo: (position, wait) => set({ queuePosition: position, estimatedWait: wait }),

  reset: () =>
    set({
      gamePhase: 'lobby',
      playerId: null,
      team: null,
      roomId: null,
      players: new Map(),
      projectiles: new Map(),
      teamAScore: 0,
      teamBScore: 0,
      tick: 0,
      inputState: { ...initialInputState },
      inputSequence: 0,
      pendingInputs: [],
      snapshotBuffer: [],
      isMatchmaking: false,
      queuePosition: 0,
      estimatedWait: 0,
    }),
}));

function applyInputToPlayer(player: PlayerState, input: PlayerInput): void {
  const speed = 10;
  const dt = 0.05;

  let moveX = 0;
  let moveZ = 0;

  if (input.forward) moveZ -= 1;
  if (input.backward) moveZ += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;

  const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (length > 0) {
    moveX /= length;
    moveZ /= length;
  }

  player.velocity.x = moveX * speed;
  player.velocity.z = moveZ * speed;

  player.position.x += player.velocity.x * dt;
  player.position.z += player.velocity.z * dt;
}

function lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function slerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

  if (dot < 0) {
    b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    dot = -dot;
  }

  if (dot > 0.9995) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      w: a.w + (b.w - a.w) * t,
    };
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return {
    x: a.x * s0 + b.x * s1,
    y: a.y * s0 + b.y * s1,
    z: a.z * s0 + b.z * s1,
    w: a.w * s0 + b.w * s1,
  };
}
