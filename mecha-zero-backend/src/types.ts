export type MechType = 'stalker' | 'griffin' | 'leo';
export type WeaponType = 'kinetic' | 'energy' | 'explosive';
export type Team = 'teamA' | 'teamB';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PlayerInput {
  sequenceNumber: number;
  timestamp: number;
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

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  mechType: MechType;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  abilityActive: boolean;
  abilityCooldown: number;
  lastProcessedInput: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
  weaponType: WeaponType;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
}

export interface Projectile {
  id: string;
  ownerId: string;
  team: Team;
  weaponType: WeaponType;
  position: Vector3;
  velocity: Vector3;
  damage: number;
  aoeRadius: number;
  createdAt: number;
}

export interface GameState {
  tick: number;
  timestamp: number;
  players: Map<string, PlayerState>;
  projectiles: Map<string, Projectile>;
  teamAScore: number;
  teamBScore: number;
  gamePhase: 'waiting' | 'countdown' | 'playing' | 'ended';
  gameStartTime: number;
  gameDuration: number;
}

export interface Snapshot {
  tick: number;
  timestamp: number;
  players: PlayerState[];
  projectiles: Projectile[];
  teamAScore: number;
  teamBScore: number;
  gamePhase: string;
}

export type WebSocketMessage =
  | { type: 'PLAYER_JOIN'; payload: { name: string; mechType: MechType; team?: Team } }
  | { type: 'PLAYER_LEAVE'; payload: { playerId: string } }
  | { type: 'PLAYER_INPUT'; payload: PlayerInput }
  | { type: 'PLAYER_MOVE'; payload: { position: Vector3; rotation: Quaternion; velocity: Vector3 } }
  | { type: 'SHOOT'; payload: { direction: Vector3 } }
  | { type: 'DAMAGE'; payload: { targetId: string; damage: number; sourceId: string } }
  | { type: 'KILL'; payload: { killerId: string; victimId: string } }
  | { type: 'ABILITY_USE'; payload: { playerId: string } }
  | { type: 'SNAPSHOT'; payload: Snapshot }
  | { type: 'STATE_UPDATE'; payload: { players: PlayerState[]; tick: number } }
  | { type: 'RECONCILE'; payload: { lastProcessedInput: number; position: Vector3; velocity: Vector3 } }
  | { type: 'GAME_START'; payload: { startTime: number } }
  | { type: 'GAME_END'; payload: { winner: Team; teamAScore: number; teamBScore: number } }
  | { type: 'QUICK_MATCH'; payload: { name: string; mechType: MechType } }
  | { type: 'ROOM_JOINED'; payload: { roomId: string; playerId: string; team: Team } }
  | { type: 'ERROR'; payload: { message: string } };

export interface MechConfig {
  type: MechType;
  maxHealth: number;
  maxShield: number;
  speed: number;
  abilityDuration: number;
  abilityCooldown: number;
}

export interface WeaponConfig {
  type: WeaponType;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  aoeRadius: number;
  maxAmmo: number;
  reloadTime: number;
}

export const MECH_CONFIGS: Record<MechType, MechConfig> = {
  stalker: {
    type: 'stalker',
    maxHealth: 800,
    maxShield: 200,
    speed: 12,
    abilityDuration: 5000,
    abilityCooldown: 15000,
  },
  griffin: {
    type: 'griffin',
    maxHealth: 1000,
    maxShield: 300,
    speed: 10,
    abilityDuration: 2000,
    abilityCooldown: 10000,
  },
  leo: {
    type: 'leo',
    maxHealth: 1500,
    maxShield: 500,
    speed: 8,
    abilityDuration: 30000,
    abilityCooldown: 45000,
  },
};

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  kinetic: {
    type: 'kinetic',
    damage: 200,
    fireRate: 500,
    projectileSpeed: 100,
    aoeRadius: 0,
    maxAmmo: 30,
    reloadTime: 2000,
  },
  energy: {
    type: 'energy',
    damage: 150,
    fireRate: 200,
    projectileSpeed: 150,
    aoeRadius: 0,
    maxAmmo: 50,
    reloadTime: 1500,
  },
  explosive: {
    type: 'explosive',
    damage: 300,
    fireRate: 1000,
    projectileSpeed: 50,
    aoeRadius: 5,
    maxAmmo: 10,
    reloadTime: 3000,
  },
};

export const SPAWN_POINTS: Record<Team, Vector3[]> = {
  teamA: [
    { x: -50, y: 0, z: -50 },
    { x: -45, y: 0, z: -45 },
    { x: -55, y: 0, z: -45 },
    { x: -50, y: 0, z: -55 },
    { x: -45, y: 0, z: -55 },
  ],
  teamB: [
    { x: 50, y: 0, z: 50 },
    { x: 45, y: 0, z: 45 },
    { x: 55, y: 0, z: 45 },
    { x: 50, y: 0, z: 55 },
    { x: 45, y: 0, z: 55 },
  ],
};
