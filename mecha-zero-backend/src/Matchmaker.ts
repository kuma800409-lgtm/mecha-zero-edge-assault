import { MechType, Team } from './types';

interface QueuedPlayer {
  id: string;
  name: string;
  mechType: MechType;
  timestamp: number;
  websocket: WebSocket;
}

interface ActiveRoom {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  gamePhase: string;
  createdAt: number;
}

export class Matchmaker implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private queue: QueuedPlayer[] = [];
  private activeRooms: Map<string, ActiveRoom> = new Map();
  private sessions: Map<WebSocket, string> = new Map();
  private matchmakingInterval: number | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
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
          queueLength: this.queue.length,
          activeRooms: this.activeRooms.size,
          rooms: Array.from(this.activeRooms.values()),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.pathname === '/rooms') {
      return new Response(
        JSON.stringify(Array.from(this.activeRooms.values())),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  private handleWebSocket(ws: WebSocket): void {
    ws.accept();
    const sessionId = crypto.randomUUID();
    this.sessions.set(ws, sessionId);

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(ws, message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });

    ws.addEventListener('close', () => {
      this.handleDisconnect(ws);
    });

    ws.addEventListener('error', () => {
      this.handleDisconnect(ws);
    });

    if (!this.matchmakingInterval) {
      this.startMatchmaking();
    }
  }

  private handleMessage(ws: WebSocket, message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'QUICK_MATCH':
        this.handleQuickMatch(ws, message.payload as { name: string; mechType: MechType });
        break;
      case 'CANCEL_QUEUE':
        this.handleCancelQueue(ws);
        break;
      case 'GET_ROOMS':
        this.sendRoomList(ws);
        break;
    }
  }

  private handleQuickMatch(ws: WebSocket, payload: { name: string; mechType: MechType }): void {
    const sessionId = this.sessions.get(ws);
    if (!sessionId) return;

    const existingIndex = this.queue.findIndex((p) => p.id === sessionId);
    if (existingIndex !== -1) {
      this.queue.splice(existingIndex, 1);
    }

    const queuedPlayer: QueuedPlayer = {
      id: sessionId,
      name: payload.name,
      mechType: payload.mechType,
      timestamp: Date.now(),
      websocket: ws,
    };

    this.queue.push(queuedPlayer);

    this.sendToSocket(ws, {
      type: 'QUEUE_JOINED',
      payload: {
        position: this.queue.length,
        estimatedWait: this.estimateWaitTime(),
      },
    });

    this.tryMatchPlayers();
  }

  private handleCancelQueue(ws: WebSocket): void {
    const sessionId = this.sessions.get(ws);
    if (!sessionId) return;

    const index = this.queue.findIndex((p) => p.id === sessionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.sendToSocket(ws, {
        type: 'QUEUE_LEFT',
        payload: {},
      });
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    const sessionId = this.sessions.get(ws);
    if (sessionId) {
      const index = this.queue.findIndex((p) => p.id === sessionId);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
      this.sessions.delete(ws);
    }
  }

  private startMatchmaking(): void {
    this.matchmakingInterval = setInterval(() => {
      this.tryMatchPlayers();
      this.updateQueuePositions();
      this.cleanupStaleRooms();
    }, 1000) as unknown as number;
  }

  private tryMatchPlayers(): void {
    const availableRoom = this.findAvailableRoom();

    if (availableRoom && this.queue.length > 0) {
      const player = this.queue.shift()!;
      this.assignPlayerToRoom(player, availableRoom.roomId);
      return;
    }

    if (this.queue.length >= 2) {
      const roomId = this.createNewRoom();
      const players = this.queue.splice(0, Math.min(10, this.queue.length));

      players.forEach((player) => {
        this.assignPlayerToRoom(player, roomId);
      });
    }
  }

  private findAvailableRoom(): ActiveRoom | undefined {
    for (const room of this.activeRooms.values()) {
      if (room.playerCount < room.maxPlayers && room.gamePhase === 'waiting') {
        return room;
      }
    }
    return undefined;
  }

  private createNewRoom(): string {
    const roomId = crypto.randomUUID();
    const room: ActiveRoom = {
      roomId,
      playerCount: 0,
      maxPlayers: 100,
      gamePhase: 'waiting',
      createdAt: Date.now(),
    };
    this.activeRooms.set(roomId, room);
    return roomId;
  }

  private assignPlayerToRoom(player: QueuedPlayer, roomId: string): void {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.playerCount++;
    }

    this.sendToSocket(player.websocket, {
      type: 'MATCH_FOUND',
      payload: {
        roomId,
        gameServerUrl: `/room/${roomId}`,
      },
    });
  }

  private updateQueuePositions(): void {
    this.queue.forEach((player, index) => {
      this.sendToSocket(player.websocket, {
        type: 'QUEUE_UPDATE',
        payload: {
          position: index + 1,
          estimatedWait: this.estimateWaitTime(),
          queueLength: this.queue.length,
        },
      });
    });
  }

  private estimateWaitTime(): number {
    const avgMatchTime = 30;
    return Math.max(5, Math.ceil(this.queue.length / 2) * avgMatchTime);
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000;

    for (const [roomId, room] of this.activeRooms) {
      if (room.playerCount === 0 && now - room.createdAt > staleThreshold) {
        this.activeRooms.delete(roomId);
      }
    }
  }

  private sendRoomList(ws: WebSocket): void {
    this.sendToSocket(ws, {
      type: 'ROOM_LIST',
      payload: {
        rooms: Array.from(this.activeRooms.values()),
      },
    });
  }

  private sendToSocket(ws: WebSocket, message: { type: string; payload: unknown }): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }
}

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKER: DurableObjectNamespace;
}
