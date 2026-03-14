---
name: root-multiplayer-lobby
description: Matchmaking, lobby management, and spectator systems for multiplayer Root Apps
---

# Multiplayer Lobby Systems

Use this skill when building Root Apps that need lobbies, matchmaking, or spectator features.

## When to Use

- User wants players to create/join game rooms
- User needs automatic matchmaking with skill-based pairing
- User wants spectator mode for live matches
- User needs lobby browser showing available games

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Room Manager                          │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ lobby:xyz   │ match:abc   │ spectators: │ queue:xyz        │
│             │             │ abc         │                  │
│ - Browse    │ - Players   │ - Watchers  │ - Waiting        │
│ - Updates   │ - Game      │ - Read-only │ - Matching       │
│             │   state     │   state     │                  │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

## Room ID Pattern

Define consistent room IDs for different scopes:

```typescript
// server/src/lib/roomIds.ts
const roomIds = {
  // Global lobby for browsing games
  lobby: (communityId: string) => `lobby:${communityId}`,

  // Match room for players in a game
  match: (matchId: string) => `match:${matchId}`,

  // Spectator room (separate from players)
  spectators: (matchId: string) => `spectators:${matchId}`,

  // Matchmaking queue
  queue: (communityId: string) => `queue:${communityId}`,

  // Player-specific notifications
  player: (userId: string) => `player:${userId}`,

  // Tournament updates
  tournament: (tournamentId: string) => `tournament:${tournamentId}`,
};

export default roomIds;
```

## Lobby Controller Pattern

Full CRUD for game sessions:

```typescript
import { Client } from '@rootsdk/server-app';
import { LobbyServiceBase } from '@myapp/gen-server';
import roomManager from '../lib/roomManager';
import roomIds from '../lib/roomIds';

// In-memory store (use database in production)
const gameSessions: Map<string, GameSession> = new Map();

class LobbyController extends LobbyServiceBase {
  /**
   * Create a new game lobby
   */
  async createGame(request: CreateGameRequest, client: Client): Promise<CreateGameResponse> {
    const gameId = uuidv4();

    const session: GameSession = {
      id: gameId,
      communityId: client.communityId,
      hostUserId: client.userId,
      name: request.name || `Game ${gameId.substring(0, 8)}`,
      status: 'waiting',
      maxPlayers: Math.min(request.maxPlayers || 4, 10),
      players: [],
      createdAt: Date.now(),
    };

    gameSessions.set(gameId, session);

    // Notify lobby browsers
    this.broadcastGameSessionUpdated(
      { session },
      roomManager.getClientsInRoom({ roomId: roomIds.lobby(client.communityId) })
    );

    return { session };
  }

  /**
   * Join an existing game
   */
  async joinGame(request: JoinGameRequest, client: Client): Promise<JoinGameResponse> {
    const session = gameSessions.get(request.gameId);
    if (!session) throw new Error('Game not found');
    if (session.status !== 'waiting') throw new Error('Game already started');
    if (session.players.length >= session.maxPlayers) throw new Error('Game is full');

    // Check if already joined
    const existing = session.players.find(p => p.userId === client.userId);
    if (existing) return { session, player: existing };

    // Create player
    const player: Player = {
      id: uuidv4(),
      userId: client.userId,
      name: request.playerName || `Player ${session.players.length + 1}`,
      ready: false,
    };

    session.players.push(player);

    // Add to game room
    roomManager.addClientToRoom({
      roomId: roomIds.match(request.gameId),
      client,
    });

    // Notify players in game
    this.broadcastPlayerJoined(
      { gameId: request.gameId, player },
      roomManager.getClientsInRoom({ roomId: roomIds.match(request.gameId) })
    );

    // Update lobby browsers
    this.broadcastGameSessionUpdated(
      { session },
      roomManager.getClientsInRoom({ roomId: roomIds.lobby(client.communityId) })
    );

    return { session, player };
  }

  /**
   * Leave a game
   */
  async leaveGame(request: LeaveGameRequest, client: Client): Promise<void> {
    const session = gameSessions.get(request.gameId);
    if (!session) return;

    const playerIndex = session.players.findIndex(p => p.userId === client.userId);
    if (playerIndex === -1) return;

    const player = session.players[playerIndex];
    session.players.splice(playerIndex, 1);

    // Remove from game room
    roomManager.removeClientFromRoom({
      roomId: roomIds.match(request.gameId),
      client,
    });

    // Notify remaining players
    this.broadcastPlayerLeft(
      { gameId: request.gameId, playerId: player.id, playerName: player.name },
      roomManager.getClientsInRoom({ roomId: roomIds.match(request.gameId) })
    );

    // If host left and game waiting, delete session
    if (session.hostUserId === client.userId && session.status === 'waiting') {
      gameSessions.delete(request.gameId);
    }

    // Update lobby
    this.broadcastGameSessionUpdated(
      { session: gameSessions.get(request.gameId) || null },
      roomManager.getClientsInRoom({ roomId: roomIds.lobby(client.communityId) })
    );
  }

  /**
   * Host starts the game
   */
  async startGame(request: StartGameRequest, client: Client): Promise<void> {
    const session = gameSessions.get(request.gameId);
    if (!session) throw new Error('Game not found');
    if (session.hostUserId !== client.userId) throw new Error('Only host can start');
    if (session.status !== 'waiting') throw new Error('Game already started');
    if (session.players.length === 0) throw new Error('No players');

    session.status = 'playing';
    session.startedAt = Date.now();

    // Start game loop
    gameLoop.start(session);

    // Notify players
    this.broadcastGameStarted(
      { gameId: request.gameId, session },
      roomManager.getClientsInRoom({ roomId: roomIds.match(request.gameId) })
    );

    // Update lobby (game no longer joinable)
    this.broadcastGameSessionUpdated(
      { session },
      roomManager.getClientsInRoom({ roomId: roomIds.lobby(client.communityId) })
    );
  }

  /**
   * List available games
   */
  async listGames(request: ListGamesRequest, client: Client): Promise<ListGamesResponse> {
    const sessions: GameSession[] = [];

    for (const session of gameSessions.values()) {
      if (session.communityId !== client.communityId) continue;
      if (!request.includeFull && session.players.length >= session.maxPlayers) continue;
      if (!request.includeStarted && session.status !== 'waiting') continue;
      sessions.push(session);
    }

    return { sessions };
  }
}

export const lobbyController = new LobbyController();
```

## Matchmaking System

Automatic pairing based on skill rating:

```typescript
interface QueuedPlayer {
  userId: string;
  displayName: string;
  elo: number;
  queuedAt: number;
  communityId: string;
  clientContext: ClientContext;
}

class MatchmakingLoop {
  private queues: Map<string, Map<string, QueuedPlayer>> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  // Config
  private readonly PROCESS_INTERVAL_MS = 2000;
  private readonly INITIAL_ELO_RANGE = 100;
  private readonly MAX_ELO_RANGE = 500;
  private readonly RANGE_EXPANSION_MS = 10000; // Expand range every 10s

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(
      () => this.processAllQueues(),
      this.PROCESS_INTERVAL_MS
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Add player to matchmaking queue
   */
  joinQueue(player: QueuedPlayer): QueueStatus {
    const queue = this.getOrCreateQueue(player.communityId);
    queue.set(player.userId, player);

    // Try immediate match
    if (queue.size >= 2) {
      this.processQueue(player.communityId, queue);
    }

    return {
      position: this.getQueuePosition(player),
      estimatedWait: this.estimateWaitTime(player),
      playersInQueue: queue.size,
    };
  }

  /**
   * Remove player from queue
   */
  leaveQueue(communityId: string, userId: string): void {
    this.queues.get(communityId)?.delete(userId);
  }

  private processQueue(communityId: string, queue: Map<string, QueuedPlayer>): void {
    const players = Array.from(queue.values());
    const now = Date.now();

    // Sort by wait time (longest waiting first)
    players.sort((a, b) => a.queuedAt - b.queuedAt);

    for (let i = 0; i < players.length - 1; i++) {
      const p1 = players[i];
      if (!queue.has(p1.userId)) continue; // Already matched

      // Expand ELO range based on wait time
      const waitTime = now - p1.queuedAt;
      const expansions = Math.floor(waitTime / this.RANGE_EXPANSION_MS);
      const eloRange = Math.min(
        this.MAX_ELO_RANGE,
        this.INITIAL_ELO_RANGE + expansions * 50
      );

      // Find opponent
      for (let j = i + 1; j < players.length; j++) {
        const p2 = players[j];
        if (!queue.has(p2.userId)) continue;

        if (Math.abs(p1.elo - p2.elo) <= eloRange) {
          // Match found!
          queue.delete(p1.userId);
          queue.delete(p2.userId);
          this.createMatch(communityId, [p1, p2]);
          break;
        }
      }
    }
  }

  private createMatch(communityId: string, players: QueuedPlayer[]): void {
    const matchId = uuidv4();

    // Create match via game loop
    gameLoop.createMatch(communityId, players.map(p => ({
      id: uuidv4(),
      userId: p.userId,
      displayName: p.displayName,
      eloRating: p.elo,
    })));

    // Notify matched players
    for (const player of players) {
      matchmakingController.broadcastMatchFound(
        { matchId, opponent: players.find(p => p.userId !== player.userId)! },
        [player.clientContext]
      );
    }
  }

  private getQueuePosition(player: QueuedPlayer): number {
    const queue = this.queues.get(player.communityId);
    if (!queue) return 1;

    const sorted = Array.from(queue.values())
      .filter(p => Math.abs(p.elo - player.elo) <= this.MAX_ELO_RANGE)
      .sort((a, b) => a.queuedAt - b.queuedAt);

    return sorted.findIndex(p => p.userId === player.userId) + 1;
  }

  private estimateWaitTime(player: QueuedPlayer): number {
    // Simple estimation based on queue size and historical data
    const queue = this.queues.get(player.communityId);
    const queueSize = queue?.size || 0;
    return Math.max(5, 30 - queueSize * 5); // 5-30 seconds estimate
  }
}

export default new MatchmakingLoop();
```

## Spectator System

Allow watching live matches:

```typescript
class SpectatorController extends SpectatorServiceBase {
  /**
   * Join as spectator
   */
  async joinSpectate(
    request: { matchId: string },
    client: Client
  ): Promise<JoinSpectateResponse> {
    const match = gameLoop.getMatch(request.matchId);

    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    if (match.status === 'finished' || match.status === 'abandoned') {
      return { success: false, error: 'Match has ended' };
    }

    // Add to spectator room (separate from players)
    roomManager.addClientToRoom({
      roomId: roomIds.spectators(request.matchId),
      client,
    });

    const spectatorCount = roomManager.getClientsInRoom({
      roomId: roomIds.spectators(request.matchId),
    }).length;

    return {
      success: true,
      matchInfo: this.serializeMatchInfo(match),
      playerStates: this.serializePlayerStates(match),
      currentTick: match.tick,
      spectatorCount,
    };
  }

  /**
   * Leave spectator mode
   */
  async leaveSpectate(request: { matchId: string }, client: Client): Promise<void> {
    roomManager.removeClientFromRoom({
      roomId: roomIds.spectators(request.matchId),
      client,
    });
  }

  /**
   * Get current match state (for late joiners)
   */
  async getSpectateState(
    request: { matchId: string },
    client: Client
  ): Promise<SpectateStateResponse> {
    const match = gameLoop.getMatch(request.matchId);
    if (!match) throw new Error('Match not found');

    return {
      matchInfo: this.serializeMatchInfo(match),
      playerStates: this.serializePlayerStates(match),
      currentTick: match.tick,
      spectatorCount: roomManager.getClientsInRoom({
        roomId: roomIds.spectators(request.matchId),
      }).length,
    };
  }

  private serializeMatchInfo(match: MatchState) {
    return {
      matchId: match.matchId,
      status: match.status,
      players: Array.from(match.players.values()).map(p => ({
        id: p.id,
        displayName: p.displayName,
        eloRating: p.eloRating,
      })),
    };
  }

  private serializePlayerStates(match: MatchState) {
    return Array.from(match.playerStates.entries()).map(([id, state]) => ({
      playerId: id,
      score: state.score,
      status: state.status,
      // ... other visible state
    }));
  }
}

export const spectatorController = new SpectatorController();
```

## Broadcasting to Different Audiences

Send updates to the right rooms:

```typescript
// In game loop tick processing
private broadcastTick(state: MatchState): void {
  const matchRoom = roomIds.match(state.matchId);
  const spectatorRoom = roomIds.spectators(state.matchId);

  // Full updates to players
  const playerClients = roomManager.getClientsInRoom({ roomId: matchRoom });
  if (playerClients.length > 0) {
    gameController.broadcastGameTick(
      { tick: state.tick, updates: this.getPlayerUpdates(state) },
      playerClients
    );
  }

  // Reduced rate for spectators (every other tick)
  if (state.tick % 2 === 0) {
    const spectatorClients = roomManager.getClientsInRoom({ roomId: spectatorRoom });
    if (spectatorClients.length > 0) {
      spectatorController.broadcastSpectatorTick(
        { tick: state.tick, state: this.getSpectatorState(state) },
        spectatorClients
      );
    }
  }
}
```

## Protobuf Definitions

```protobuf
// Lobby service
service LobbyService {
  rpc CreateGame(CreateGameRequest) returns (CreateGameResponse);
  rpc JoinGame(JoinGameRequest) returns (JoinGameResponse);
  rpc LeaveGame(LeaveGameRequest) returns (rootsdk.Void);
  rpc StartGame(StartGameRequest) returns (rootsdk.Void);
  rpc ListGames(ListGamesRequest) returns (ListGamesResponse);

  // Broadcast events
  rpc BroadcastPlayerJoined(PlayerJoinedEvent) returns (rootsdk.Void);
  rpc BroadcastPlayerLeft(PlayerLeftEvent) returns (rootsdk.Void);
  rpc BroadcastGameStarted(GameStartedEvent) returns (rootsdk.Void);
  rpc BroadcastGameSessionUpdated(GameSessionUpdatedEvent) returns (rootsdk.Void);
}

// Matchmaking service
service MatchmakingService {
  rpc JoinQueue(JoinQueueRequest) returns (QueueStatus);
  rpc LeaveQueue(LeaveQueueRequest) returns (rootsdk.Void);
  rpc GetQueueStatus(GetQueueStatusRequest) returns (QueueStatus);

  rpc BroadcastMatchFound(MatchFoundEvent) returns (rootsdk.Void);
  rpc BroadcastQueueUpdate(QueueUpdateEvent) returns (rootsdk.Void);
}

// Spectator service
service SpectatorService {
  rpc JoinSpectate(JoinSpectateRequest) returns (JoinSpectateResponse);
  rpc LeaveSpectate(LeaveSpectateRequest) returns (rootsdk.Void);
  rpc GetSpectateState(GetSpectateStateRequest) returns (SpectateStateResponse);

  rpc BroadcastSpectatorTick(SpectatorTickEvent) returns (rootsdk.Void);
}

// Common messages
message GameSession {
  string id = 1;
  string name = 2;
  string hostUserId = 3;
  GameStatus status = 4;
  int32 maxPlayers = 5;
  repeated Player players = 6;
}

message QueueStatus {
  int32 position = 1;
  int32 estimatedWaitSeconds = 2;
  int32 playersInQueue = 3;
}

enum GameStatus {
  WAITING = 0;
  COUNTDOWN = 1;
  PLAYING = 2;
  FINISHED = 3;
}
```

## Client-Side Integration

```tsx
// React hook for lobby
function useLobby() {
  const [games, setGames] = useState<GameSession[]>([]);

  useEffect(() => {
    // Load initial list
    lobbyServiceClient.listGames({ includeFull: false, includeStarted: false })
      .then(res => setGames(res.sessions));

    // Subscribe to updates
    const onUpdate = (event: GameSessionUpdatedEvent) => {
      setGames(prev => {
        if (!event.session) {
          return prev.filter(g => g.id !== event.session?.id);
        }
        const idx = prev.findIndex(g => g.id === event.session!.id);
        if (idx >= 0) {
          return [...prev.slice(0, idx), event.session, ...prev.slice(idx + 1)];
        }
        return [...prev, event.session];
      });
    };

    lobbyServiceClient.on(LobbyServiceClientEvent.GameSessionUpdated, onUpdate);
    return () => lobbyServiceClient.off(LobbyServiceClientEvent.GameSessionUpdated, onUpdate);
  }, []);

  return { games };
}
```

## Examples in Codebase

- **Hextris** - Matchmaking queue, spectator system, ELO rating
- **RogueGame** - Lobby browser, host-controlled start, party system
- **Sketchionary** - Game rooms with player ready states
