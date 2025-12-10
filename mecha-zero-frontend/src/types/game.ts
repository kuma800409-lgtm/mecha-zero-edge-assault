export type MechType = 'stalker' | 'griffin' | 'leo';
export type WeaponType = 'kinetic' | 'energy' | 'explosive';
export type Team = 'teamA' | 'teamB';
export type GamePhase = 'lobby' | 'matchmaking' | 'countdown' | 'playing' | 'ended';

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

export interface Snapshot {
  tick: number;
  timestamp: number;
  players: PlayerState[];
  projectiles: Projectile[];
  teamAScore: number;
  teamBScore: number;
  gamePhase: string;
}

export interface MechConfig {
  type: MechType;
  name: string;
  description: string;
  maxHealth: number;
  maxShield: number;
  speed: number;
  abilityName: string;
  abilityDescription: string;
  abilityDuration: number;
  abilityCooldown: number;
  color: string;
}

export interface WeaponConfig {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  aoeRadius: number;
  maxAmmo: number;
  reloadTime: number;
  color: string;
}

export const MECH_CONFIGS: Record<MechType, MechConfig> = {
  stalker: {
    type: 'stalker',
    name: 'Stalker',
    description: 'Light mech with stealth capability',
    maxHealth: 800,
    maxShield: 200,
    speed: 12,
    abilityName: 'Stealth Mode',
    abilityDescription: '5-second invisibility',
    abilityDuration: 5000,
    abilityCooldown: 15000,
    color: '#00ff88',
  },
  griffin: {
    type: 'griffin',
    name: 'Griffin',
    description: 'Medium mech with jump drive',
    maxHealth: 1000,
    maxShield: 300,
    speed: 10,
    abilityName: 'Jump Drive',
    abilityDescription: 'Powerful jump boost',
    abilityDuration: 2000,
    abilityCooldown: 10000,
    color: '#ff8800',
  },
  leo: {
    type: 'leo',
    name: 'Leo',
    description: 'Heavy mech with shield generator',
    maxHealth: 1500,
    maxShield: 500,
    speed: 8,
    abilityName: 'Shield Generator',
    abilityDescription: '30-second damage reduction',
    abilityDuration: 30000,
    abilityCooldown: 45000,
    color: '#0088ff',
  },
};

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  kinetic: {
    type: 'kinetic',
    name: 'Kinetic Cannon',
    damage: 200,
    fireRate: 500,
    projectileSpeed: 100,
    aoeRadius: 0,
    maxAmmo: 30,
    reloadTime: 2000,
    color: '#ffff00',
  },
  energy: {
    type: 'energy',
    name: 'Energy Beam',
    damage: 150,
    fireRate: 200,
    projectileSpeed: 150,
    aoeRadius: 0,
    maxAmmo: 50,
    reloadTime: 1500,
    color: '#00ffff',
  },
  explosive: {
    type: 'explosive',
    name: 'Missile Launcher',
    damage: 300,
    fireRate: 1000,
    projectileSpeed: 50,
    aoeRadius: 5,
    maxAmmo: 10,
    reloadTime: 3000,
    color: '#ff4400',
  },
};
