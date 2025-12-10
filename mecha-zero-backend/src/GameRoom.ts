import {
  GameState,
  PlayerState,
  PlayerInput,
  Projectile,
  Snapshot,
  WebSocketMessage,
  Team,
  MechType,
  WeaponType,
  Vector3,
  Quaternion,
  MECH_CONFIGS,
  WEAPON_CONFIGS,
  SPAWN_POINTS,
} from './types';

const TICK_RATE = 20;
const TICK_INTERVAL = 1000 / TICK_RATE;
const GAME_DURATION = 10 * 60 * 1000;

export class GameRoom implements DurableObject {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, string> = new Map();
  private gameState: GameState;
  private tickInterval: number | null = null;
  private inputBuffer: Map<string, PlayerInput[]> = new Map();

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.gameState = this.createInitialGameState();
  }

  private createInitialGameState(): GameState {
    return {
      tick: 0,
      timestamp: Date.now(),
      players: new Map(),
      projectiles: new Map(),
      teamAScore: 0,
      teamBScore: 0,
      gamePhase: 'waiting',
      gameStartTime: 0,
      gameDuration: GAME_DURATION,
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === '/status') {
      return new Response(
        JSON.stringify({
          playerCount: this.gameState.players.size,
          gamePhase: this.gameState.gamePhase,
          teamAScore: this.gameState.teamAScore,
          teamBScore: this.gameState.teamBScore,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  private handleWebSocket(ws: WebSocket): void {
    ws.accept();

    ws.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        this.handleMessage(ws, message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });

    ws.addEventListener('close', () => {
      const playerId = this.sessions.get(ws);
      if (playerId) {
        this.handlePlayerLeave(playerId);
        this.sessions.delete(ws);
      }
    });

    ws.addEventListener('error', () => {
      const playerId = this.sessions.get(ws);
      if (playerId) {
        this.handlePlayerLeave(playerId);
        this.sessions.delete(ws);
      }
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
      case 'PLAYER_JOIN':
        this.handlePlayerJoin(ws, message.payload);
        break;
      case 'PLAYER_INPUT':
        this.handlePlayerInput(ws, message.payload);
        break;
      case 'SHOOT':
        this.handleShoot(ws, message.payload);
        break;
      case 'ABILITY_USE':
        this.handleAbilityUse(ws);
        break;
    }
  }

  private handlePlayerJoin(
    ws: WebSocket,
    payload: { name: string; mechType: MechType; team?: Team }
  ): void {
    const playerId = crypto.randomUUID();
    const team = payload.team || this.assignTeam();
    const mechConfig = MECH_CONFIGS[payload.mechType];
    const spawnPoint = this.getSpawnPoint(team);

    const player: PlayerState = {
      id: playerId,
      name: payload.name,
      team,
      mechType: payload.mechType,
      position: { ...spawnPoint },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      health: mechConfig.maxHealth,
      maxHealth: mechConfig.maxHealth,
      shield: mechConfig.maxShield,
      maxShield: mechConfig.maxShield,
      abilityActive: false,
      abilityCooldown: 0,
      lastProcessedInput: 0,
      isAlive: true,
      kills: 0,
      deaths: 0,
      weaponType: 'kinetic',
      ammo: WEAPON_CONFIGS.kinetic.maxAmmo,
      maxAmmo: WEAPON_CONFIGS.kinetic.maxAmmo,
      reloading: false,
    };

    this.gameState.players.set(playerId, player);
    this.sessions.set(ws, playerId);
    this.inputBuffer.set(playerId, []);

    this.sendToSocket(ws, {
      type: 'ROOM_JOINED',
      payload: { roomId: this.state.id.toString(), playerId, team },
    });

    this.broadcastSnapshot();

    if (this.gameState.players.size >= 2 && this.gameState.gamePhase === 'waiting') {
      this.startCountdown();
    }
  }

  private handlePlayerLeave(playerId: string): void {
    this.gameState.players.delete(playerId);
    this.inputBuffer.delete(playerId);

    this.broadcast({
      type: 'PLAYER_LEAVE',
      payload: { playerId },
    });

    if (this.gameState.players.size === 0) {
      this.stopGameLoop();
      this.gameState = this.createInitialGameState();
    }
  }

  private handlePlayerInput(ws: WebSocket, input: PlayerInput): void {
    const playerId = this.sessions.get(ws);
    if (!playerId) return;

    const buffer = this.inputBuffer.get(playerId);
    if (buffer) {
      buffer.push(input);
      if (buffer.length > 60) {
        buffer.shift();
      }
    }
  }

  private handleShoot(ws: WebSocket, payload: { direction: Vector3 }): void {
    const playerId = this.sessions.get(ws);
    if (!playerId) return;

    const player = this.gameState.players.get(playerId);
    if (!player || !player.isAlive || player.ammo <= 0 || player.reloading) return;

    const weaponConfig = WEAPON_CONFIGS[player.weaponType];
    const projectileId = crypto.randomUUID();

    const projectile: Projectile = {
      id: projectileId,
      ownerId: playerId,
      team: player.team,
      weaponType: player.weaponType,
      position: { ...player.position },
      velocity: {
        x: payload.direction.x * weaponConfig.projectileSpeed,
        y: payload.direction.y * weaponConfig.projectileSpeed,
        z: payload.direction.z * weaponConfig.projectileSpeed,
      },
      damage: weaponConfig.damage,
      aoeRadius: weaponConfig.aoeRadius,
      createdAt: Date.now(),
    };

    this.gameState.projectiles.set(projectileId, projectile);
    player.ammo--;

    this.applyRecoil(player, payload.direction);
  }

  private applyRecoil(player: PlayerState, direction: Vector3): void {
    const recoilStrength = 0.5;
    player.velocity.x -= direction.x * recoilStrength;
    player.velocity.z -= direction.z * recoilStrength;
  }

  private handleAbilityUse(ws: WebSocket): void {
    const playerId = this.sessions.get(ws);
    if (!playerId) return;

    const player = this.gameState.players.get(playerId);
    if (!player || !player.isAlive || player.abilityCooldown > 0 || player.abilityActive) return;

    const mechConfig = MECH_CONFIGS[player.mechType];
    player.abilityActive = true;

    setTimeout(() => {
      player.abilityActive = false;
      player.abilityCooldown = mechConfig.abilityCooldown;
    }, mechConfig.abilityDuration);
  }

  private assignTeam(): Team {
    let teamACount = 0;
    let teamBCount = 0;

    this.gameState.players.forEach((player) => {
      if (player.team === 'teamA') teamACount++;
      else teamBCount++;
    });

    return teamACount <= teamBCount ? 'teamA' : 'teamB';
  }

  private getSpawnPoint(team: Team): Vector3 {
    const spawnPoints = SPAWN_POINTS[team];
    const teamPlayers = Array.from(this.gameState.players.values()).filter(
      (p) => p.team === team
    );
    const index = teamPlayers.length % spawnPoints.length;
    return { ...spawnPoints[index] };
  }

  private startCountdown(): void {
    this.gameState.gamePhase = 'countdown';

    setTimeout(() => {
      this.startGame();
    }, 5000);
  }

  private startGame(): void {
    this.gameState.gamePhase = 'playing';
    this.gameState.gameStartTime = Date.now();

    this.broadcast({
      type: 'GAME_START',
      payload: { startTime: this.gameState.gameStartTime },
    });

    this.startGameLoop();

    setTimeout(() => {
      this.endGame();
    }, GAME_DURATION);
  }

  private startGameLoop(): void {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL) as unknown as number;
  }

  private stopGameLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    this.gameState.tick++;
    this.gameState.timestamp = Date.now();

    this.processInputs();
    this.updateProjectiles();
    this.checkCollisions();
    this.updateCooldowns();
    this.broadcastSnapshot();
  }

  private processInputs(): void {
    this.gameState.players.forEach((player, playerId) => {
      if (!player.isAlive) return;

      const inputs = this.inputBuffer.get(playerId);
      if (!inputs || inputs.length === 0) return;

      const mechConfig = MECH_CONFIGS[player.mechType];
      const input = inputs.shift()!;

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

      player.velocity.x = moveX * mechConfig.speed;
      player.velocity.z = moveZ * mechConfig.speed;

      if (input.jump && player.mechType === 'griffin' && player.abilityActive) {
        player.velocity.y = 20;
      }

      player.position.x += player.velocity.x * (TICK_INTERVAL / 1000);
      player.position.y += player.velocity.y * (TICK_INTERVAL / 1000);
      player.position.z += player.velocity.z * (TICK_INTERVAL / 1000);

      player.velocity.y -= 9.8 * (TICK_INTERVAL / 1000);

      if (player.position.y < 0) {
        player.position.y = 0;
        player.velocity.y = 0;
      }

      player.rotation = this.eulerToQuaternion(0, input.mouseX, 0);

      player.lastProcessedInput = input.sequenceNumber;

      this.sendReconciliation(playerId, player);
    });
  }

  private eulerToQuaternion(x: number, y: number, z: number): Quaternion {
    const c1 = Math.cos(y / 2);
    const s1 = Math.sin(y / 2);
    const c2 = Math.cos(x / 2);
    const s2 = Math.sin(x / 2);
    const c3 = Math.cos(z / 2);
    const s3 = Math.sin(z / 2);

    return {
      w: c1 * c2 * c3 - s1 * s2 * s3,
      x: s1 * s2 * c3 + c1 * c2 * s3,
      y: s1 * c2 * c3 + c1 * s2 * s3,
      z: c1 * s2 * c3 - s1 * c2 * s3,
    };
  }

  private sendReconciliation(playerId: string, player: PlayerState): void {
    const ws = this.getSocketByPlayerId(playerId);
    if (!ws) return;

    this.sendToSocket(ws, {
      type: 'RECONCILE',
      payload: {
        lastProcessedInput: player.lastProcessedInput,
        position: player.position,
        velocity: player.velocity,
      },
    });
  }

  private updateProjectiles(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.gameState.projectiles.forEach((projectile, id) => {
      projectile.position.x += projectile.velocity.x * (TICK_INTERVAL / 1000);
      projectile.position.y += projectile.velocity.y * (TICK_INTERVAL / 1000);
      projectile.position.z += projectile.velocity.z * (TICK_INTERVAL / 1000);

      if (now - projectile.createdAt > 5000) {
        toRemove.push(id);
      }

      if (
        Math.abs(projectile.position.x) > 200 ||
        Math.abs(projectile.position.z) > 200 ||
        projectile.position.y < -10
      ) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => this.gameState.projectiles.delete(id));
  }

  private checkCollisions(): void {
    const toRemove: string[] = [];

    this.gameState.projectiles.forEach((projectile, projectileId) => {
      this.gameState.players.forEach((player, playerId) => {
        if (player.team === projectile.team || !player.isAlive) return;

        if (player.mechType === 'stalker' && player.abilityActive) return;

        const dx = player.position.x - projectile.position.x;
        const dy = player.position.y - projectile.position.y;
        const dz = player.position.z - projectile.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const hitRadius = projectile.aoeRadius > 0 ? projectile.aoeRadius : 2;

        if (distance < hitRadius) {
          this.applyDamage(player, projectile);
          toRemove.push(projectileId);

          if (projectile.aoeRadius > 0) {
            this.applyAoeDamage(projectile);
          }
        }
      });
    });

    toRemove.forEach((id) => this.gameState.projectiles.delete(id));
  }

  private applyDamage(player: PlayerState, projectile: Projectile): void {
    let damage = projectile.damage;

    if (player.mechType === 'leo' && player.abilityActive) {
      damage *= 0.5;
    }

    if (player.shield > 0) {
      const shieldDamage = Math.min(player.shield, damage);
      player.shield -= shieldDamage;
      damage -= shieldDamage;
    }

    player.health -= damage;

    this.broadcast({
      type: 'DAMAGE',
      payload: {
        targetId: player.id,
        damage: projectile.damage,
        sourceId: projectile.ownerId,
      },
    });

    if (player.health <= 0) {
      this.handlePlayerDeath(player, projectile.ownerId);
    }
  }

  private applyAoeDamage(projectile: Projectile): void {
    this.gameState.players.forEach((player) => {
      if (player.team === projectile.team || !player.isAlive) return;

      const dx = player.position.x - projectile.position.x;
      const dy = player.position.y - projectile.position.y;
      const dz = player.position.z - projectile.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < projectile.aoeRadius && distance > 2) {
        const falloff = 1 - distance / projectile.aoeRadius;
        const aoeDamage = projectile.damage * falloff * 0.5;

        player.health -= aoeDamage;

        if (player.health <= 0) {
          this.handlePlayerDeath(player, projectile.ownerId);
        }
      }
    });
  }

  private handlePlayerDeath(player: PlayerState, killerId: string): void {
    player.isAlive = false;
    player.deaths++;

    const killer = this.gameState.players.get(killerId);
    if (killer) {
      killer.kills++;
      if (killer.team === 'teamA') {
        this.gameState.teamAScore++;
      } else {
        this.gameState.teamBScore++;
      }
    }

    this.broadcast({
      type: 'KILL',
      payload: { killerId, victimId: player.id },
    });

    setTimeout(() => {
      this.respawnPlayer(player);
    }, 5000);
  }

  private respawnPlayer(player: PlayerState): void {
    const mechConfig = MECH_CONFIGS[player.mechType];
    const spawnPoint = this.getSpawnPoint(player.team);

    player.position = { ...spawnPoint };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.health = mechConfig.maxHealth;
    player.shield = mechConfig.maxShield;
    player.isAlive = true;
    player.abilityActive = false;
    player.abilityCooldown = 0;
    player.ammo = WEAPON_CONFIGS[player.weaponType].maxAmmo;
    player.reloading = false;
  }

  private updateCooldowns(): void {
    this.gameState.players.forEach((player) => {
      if (player.abilityCooldown > 0) {
        player.abilityCooldown -= TICK_INTERVAL;
        if (player.abilityCooldown < 0) player.abilityCooldown = 0;
      }
    });
  }

  private endGame(): void {
    this.stopGameLoop();
    this.gameState.gamePhase = 'ended';

    const winner: Team =
      this.gameState.teamAScore > this.gameState.teamBScore ? 'teamA' : 'teamB';

    this.broadcast({
      type: 'GAME_END',
      payload: {
        winner,
        teamAScore: this.gameState.teamAScore,
        teamBScore: this.gameState.teamBScore,
      },
    });
  }

  private broadcastSnapshot(): void {
    const snapshot: Snapshot = {
      tick: this.gameState.tick,
      timestamp: this.gameState.timestamp,
      players: Array.from(this.gameState.players.values()),
      projectiles: Array.from(this.gameState.projectiles.values()),
      teamAScore: this.gameState.teamAScore,
      teamBScore: this.gameState.teamBScore,
      gamePhase: this.gameState.gamePhase,
    };

    this.broadcast({
      type: 'SNAPSHOT',
      payload: snapshot,
    });
  }

  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    this.sessions.forEach((_, ws) => {
      try {
        ws.send(data);
      } catch (e) {
        console.error('Failed to send message:', e);
      }
    });
  }

  private sendToSocket(ws: WebSocket, message: WebSocketMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }

  private getSocketByPlayerId(playerId: string): WebSocket | undefined {
    for (const [ws, id] of this.sessions) {
      if (id === playerId) return ws;
    }
    return undefined;
  }
}
