import { useGameStore } from '../store/gameStore';
import { MechType, PlayerInput, Snapshot, Vector3 } from '../types/game';

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

class GameNetworking {
  private matchmakerWs: WebSocket | null = null;
  private gameWs: WebSocket | null = null;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private inputSendInterval: number | null = null;

  constructor() {
    this.serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:8787';
  }

  connectToMatchmaker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.serverUrl}/matchmaker/websocket`;
      console.log('Connecting to matchmaker:', wsUrl);

      this.matchmakerWs = new WebSocket(wsUrl);

      this.matchmakerWs.onopen = () => {
        console.log('Connected to matchmaker');
        useGameStore.getState().setConnected(true);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.matchmakerWs.onmessage = (event) => {
        this.handleMatchmakerMessage(JSON.parse(event.data));
      };

      this.matchmakerWs.onclose = () => {
        console.log('Disconnected from matchmaker');
        useGameStore.getState().setConnected(false);
        this.attemptReconnect('matchmaker');
      };

      this.matchmakerWs.onerror = (error) => {
        console.error('Matchmaker WebSocket error:', error);
        reject(error);
      };
    });
  }

  private handleMatchmakerMessage(message: { type: string; payload: unknown }): void {
    const store = useGameStore.getState();

    switch (message.type) {
      case 'QUEUE_JOINED':
        store.setMatchmaking(true);
        const queuePayload = message.payload as { position: number; estimatedWait: number };
        store.setQueueInfo(queuePayload.position, queuePayload.estimatedWait);
        break;

      case 'QUEUE_UPDATE':
        const updatePayload = message.payload as { position: number; estimatedWait: number };
        store.setQueueInfo(updatePayload.position, updatePayload.estimatedWait);
        break;

      case 'QUEUE_LEFT':
        store.setMatchmaking(false);
        store.setQueueInfo(0, 0);
        break;

      case 'MATCH_FOUND':
        const matchPayload = message.payload as { roomId: string; gameServerUrl: string };
        store.setRoomId(matchPayload.roomId);
        store.setMatchmaking(false);
        this.connectToGameRoom(matchPayload.roomId);
        break;

      case 'ROOM_LIST':
        console.log('Available rooms:', message.payload);
        break;
    }
  }

  quickMatch(name: string, mechType: MechType): void {
    if (!this.matchmakerWs || this.matchmakerWs.readyState !== WebSocket.OPEN) {
      console.error('Not connected to matchmaker');
      return;
    }

    this.matchmakerWs.send(
      JSON.stringify({
        type: 'QUICK_MATCH',
        payload: { name, mechType },
      })
    );
  }

  cancelQueue(): void {
    if (!this.matchmakerWs || this.matchmakerWs.readyState !== WebSocket.OPEN) {
      return;
    }

    this.matchmakerWs.send(JSON.stringify({ type: 'CANCEL_QUEUE' }));
  }

  connectToGameRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.serverUrl}/room/${roomId}/websocket`;
      console.log('Connecting to game room:', wsUrl);

      this.gameWs = new WebSocket(wsUrl);

      this.gameWs.onopen = () => {
        console.log('Connected to game room');
        const store = useGameStore.getState();
        this.joinGame(store.playerName, store.selectedMech);
        resolve();
      };

      this.gameWs.onmessage = (event) => {
        this.handleGameMessage(JSON.parse(event.data));
      };

      this.gameWs.onclose = () => {
        console.log('Disconnected from game room');
        this.stopInputSending();
        this.attemptReconnect('game');
      };

      this.gameWs.onerror = (error) => {
        console.error('Game WebSocket error:', error);
        reject(error);
      };
    });
  }

  private joinGame(name: string, mechType: MechType): void {
    if (!this.gameWs || this.gameWs.readyState !== WebSocket.OPEN) {
      return;
    }

    this.gameWs.send(
      JSON.stringify({
        type: 'PLAYER_JOIN',
        payload: { name, mechType },
      })
    );
  }

  private handleGameMessage(message: { type: string; payload: unknown }): void {
    const store = useGameStore.getState();

    switch (message.type) {
      case 'ROOM_JOINED':
        const joinPayload = message.payload as { roomId: string; playerId: string; team: string };
        store.setPlayerId(joinPayload.playerId);
        store.setTeam(joinPayload.team as 'teamA' | 'teamB');
        store.setGamePhase('countdown');
        break;

      case 'SNAPSHOT':
        const snapshot = message.payload as Snapshot;
        store.addSnapshot(snapshot);
        store.updatePlayers(snapshot.players);
        store.updateProjectiles(snapshot.projectiles);
        store.updateScores(snapshot.teamAScore, snapshot.teamBScore);
        store.setTick(snapshot.tick);

        if (snapshot.gamePhase === 'playing' && store.gamePhase !== 'playing') {
          store.setGamePhase('playing');
          this.startInputSending();
        } else if (snapshot.gamePhase === 'ended' && store.gamePhase !== 'ended') {
          store.setGamePhase('ended');
          this.stopInputSending();
        }
        break;

      case 'RECONCILE':
        const reconcilePayload = message.payload as {
          lastProcessedInput: number;
          position: Vector3;
          velocity: Vector3;
        };
        store.reconcile(
          reconcilePayload.lastProcessedInput,
          reconcilePayload.position,
          reconcilePayload.velocity
        );
        break;

      case 'GAME_START':
        store.setGamePhase('playing');
        this.startInputSending();
        break;

      case 'GAME_END':
        store.setGamePhase('ended');
        this.stopInputSending();
        break;

      case 'DAMAGE':
        console.log('Damage event:', message.payload);
        break;

      case 'KILL':
        console.log('Kill event:', message.payload);
        break;

      case 'PLAYER_LEAVE':
        console.log('Player left:', message.payload);
        break;

      case 'ERROR':
        console.error('Game error:', message.payload);
        break;
    }
  }

  private startInputSending(): void {
    if (this.inputSendInterval) return;

    this.inputSendInterval = window.setInterval(() => {
      this.sendInput();
    }, 50);
  }

  private stopInputSending(): void {
    if (this.inputSendInterval) {
      clearInterval(this.inputSendInterval);
      this.inputSendInterval = null;
    }
  }

  private sendInput(): void {
    if (!this.gameWs || this.gameWs.readyState !== WebSocket.OPEN) {
      return;
    }

    const store = useGameStore.getState();
    const { inputState } = store;
    const sequenceNumber = store.incrementInputSequence();

    const input: PlayerInput = {
      sequenceNumber,
      timestamp: Date.now(),
      ...inputState,
    };

    this.gameWs.send(
      JSON.stringify({
        type: 'PLAYER_INPUT',
        payload: input,
      })
    );

    const localPlayer = store.players.get(store.playerId || '');
    if (localPlayer) {
      store.addPendingInput({
        ...input,
        predictedPosition: { ...localPlayer.position },
        predictedVelocity: { ...localPlayer.velocity },
      });
    }
  }

  shoot(direction: Vector3): void {
    if (!this.gameWs || this.gameWs.readyState !== WebSocket.OPEN) {
      return;
    }

    this.gameWs.send(
      JSON.stringify({
        type: 'SHOOT',
        payload: { direction },
      })
    );
  }

  useAbility(): void {
    if (!this.gameWs || this.gameWs.readyState !== WebSocket.OPEN) {
      return;
    }

    this.gameWs.send(
      JSON.stringify({
        type: 'ABILITY_USE',
        payload: {},
      })
    );
  }

  private attemptReconnect(type: 'matchmaker' | 'game'): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(() => {
      if (type === 'matchmaker') {
        this.connectToMatchmaker().catch(console.error);
      } else {
        const roomId = useGameStore.getState().roomId;
        if (roomId) {
          this.connectToGameRoom(roomId).catch(console.error);
        }
      }
    }, RECONNECT_DELAY * this.reconnectAttempts);
  }

  disconnect(): void {
    this.stopInputSending();

    if (this.matchmakerWs) {
      this.matchmakerWs.close();
      this.matchmakerWs = null;
    }

    if (this.gameWs) {
      this.gameWs.close();
      this.gameWs = null;
    }

    useGameStore.getState().reset();
  }

  isConnected(): boolean {
    return (
      (this.matchmakerWs?.readyState === WebSocket.OPEN) ||
      (this.gameWs?.readyState === WebSocket.OPEN)
    );
  }
}

export const gameNetworking = new GameNetworking();
