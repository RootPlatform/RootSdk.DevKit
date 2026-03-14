---
name: root-server-game-loop
description: Server-side tick-based game loops for real-time multiplayer Root Apps
---

# Server-Side Game Loops

Use this skill when building Root Apps that need authoritative server-side game logic with tick-based processing.

## When to Use

- User is building a real-time multiplayer game
- User needs server-authoritative game state (anti-cheat)
- User wants tick-based game logic (consistent timing)
- User needs input queuing and processing
- User wants matchmaking or lobby systems

## Architecture Overview

```
Client Input → Server Queue → Process Tick → Broadcast Update → Client Render
                                   │
                                   ├── Process player inputs
                                   ├── Update game state (physics, AI)
                                   ├── Check win/lose conditions
                                   └── Build delta or full state update
```

## Core Pattern: GameLoop Class

```typescript
interface GameSessionState {
  sessionId: string;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  players: Map<string, PlayerState>;
  tick: number;
  intervalId: NodeJS.Timeout | null;
  actionQueue: QueuedAction[];
}

interface QueuedAction {
  playerId: string;
  action: PlayerAction;
  tick: number;
  receivedAt: number;
}

class GameLoop {
  private readonly TICK_RATE_MS = 50; // 20 ticks per second
  private games: Map<string, GameSessionState> = new Map();

  /**
   * Start game loop for a session
   */
  start(sessionId: string, players: PlayerInfo[]): void {
    if (this.games.has(sessionId)) {
      console.warn(`Game ${sessionId} already has active loop`);
      return;
    }

    const state: GameSessionState = {
      sessionId,
      status: 'countdown',
      players: this.initializePlayers(players),
      tick: 0,
      intervalId: null,
      actionQueue: [],
    };

    state.intervalId = setInterval(() => {
      this.processTick(sessionId);
    }, this.TICK_RATE_MS);

    this.games.set(sessionId, state);
    console.log(`Game loop started: ${sessionId}`);
  }

  /**
   * Stop game loop
   */
  stop(sessionId: string): void {
    const state = this.games.get(sessionId);
    if (!state) return;

    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    this.games.delete(sessionId);
    console.log(`Game loop stopped: ${sessionId}`);
  }

  /**
   * Queue player input for next tick
   */
  queueInput(sessionId: string, playerId: string, action: PlayerAction): void {
    const state = this.games.get(sessionId);
    if (!state || state.status !== 'playing') return;

    state.actionQueue.push({
      playerId,
      action,
      tick: state.tick,
      receivedAt: Date.now(),
    });
  }

  /**
   * Main tick processing
   */
  private processTick(sessionId: string): void {
    const state = this.games.get(sessionId);
    if (!state) return;

    // Skip processing if not playing
    if (state.status !== 'playing') return;

    // 1. Process queued player inputs
    const inputs = [...state.actionQueue];
    state.actionQueue = [];

    for (const input of inputs) {
      this.processPlayerInput(state, input);
    }

    // 2. Update game state (physics, AI, etc.)
    this.updateGameState(state);

    // 3. Check win/lose conditions
    this.checkGameOver(state);

    // 4. Broadcast state to players
    this.broadcastTick(state);

    // 5. Increment tick
    state.tick++;
  }

  private processPlayerInput(state: GameSessionState, input: QueuedAction): void {
    const player = state.players.get(input.playerId);
    if (!player || player.status !== 'alive') return;

    // Apply input to player state
    // ... game-specific logic
  }

  private updateGameState(state: GameSessionState): void {
    // Update physics, AI, timers, etc.
    // ... game-specific logic
  }

  private checkGameOver(state: GameSessionState): void {
    // Check win/lose conditions
    // ... game-specific logic
  }

  private broadcastTick(state: GameSessionState): void {
    // Send state update to all players
    // ... use gameController.broadcastGameTick()
  }
}

export default new GameLoop();
```

## Input Rate Limiting

Prevent input spam with rate limiting:

```typescript
const INPUT_RATE_LIMIT_MS = 16; // ~60 inputs/sec max
const MAX_INPUT_QUEUE_SIZE = 10;

queueInput(sessionId: string, playerId: string, action: PlayerAction): boolean {
  const state = this.games.get(sessionId);
  if (!state) return false;

  const player = state.players.get(playerId);
  if (!player) return false;

  // Rate limit check
  const now = Date.now();
  if (now - player.lastInputTime < INPUT_RATE_LIMIT_MS) {
    return false; // Too fast, ignore
  }

  // Queue size check
  const playerInputs = state.actionQueue.filter(a => a.playerId === playerId);
  if (playerInputs.length >= MAX_INPUT_QUEUE_SIZE) {
    return false; // Queue full
  }

  player.lastInputTime = now;
  state.actionQueue.push({ playerId, action, tick: state.tick, receivedAt: now });
  return true;
}
```

## Delta Encoding for Network Optimization

Send only changed data to reduce bandwidth:

```typescript
interface PlayerGameState {
  // Current state
  board: number[];
  score: number;
  position: Position;

  // Delta tracking
  previousBoard: number[];
  previousScore: number;
}

const KEYFRAME_INTERVAL = 40; // Full state every 40 ticks (2 sec at 20 Hz)

private broadcastTick(state: GameSessionState): void {
  const isKeyframe = state.tick % KEYFRAME_INTERVAL === 0;

  for (const [playerId, player] of state.players) {
    if (isKeyframe) {
      // Send full state for resync
      this.broadcastFullState(state, playerId);
      player.previousBoard = [...player.board];
    } else {
      // Send only changes
      const delta = this.computeDelta(player);
      if (delta.hasChanges) {
        this.broadcastDelta(state, playerId, delta);
      }
    }
  }
}

private computeDelta(player: PlayerGameState): BoardDelta {
  const changes: CellChange[] = [];

  for (let i = 0; i < player.board.length; i++) {
    if (player.board[i] !== player.previousBoard[i]) {
      changes.push({ index: i, value: player.board[i] });
    }
  }

  player.previousBoard = [...player.board];

  return {
    hasChanges: changes.length > 0,
    changes,
    score: player.score,
  };
}
```

## Disconnect Handling with Grace Period

Allow players to reconnect without losing the match:

```typescript
const DISCONNECT_GRACE_PERIOD_MS = 30000; // 30 seconds

interface PlayerState {
  status: 'alive' | 'defeated' | 'disconnected';
  disconnectTime: number | null;
}

handlePlayerDisconnect(sessionId: string, playerId: string): void {
  const state = this.games.get(sessionId);
  const player = state?.players.get(playerId);
  if (!player || player.status !== 'alive') return;

  player.status = 'disconnected';
  player.disconnectTime = Date.now();

  // Broadcast disconnect to other players
  this.broadcastPlayerDisconnected(state, playerId);
}

handlePlayerReconnect(sessionId: string, playerId: string): boolean {
  const state = this.games.get(sessionId);
  const player = state?.players.get(playerId);
  if (!player || player.status !== 'disconnected') return false;

  // Check if within grace period
  const elapsed = Date.now() - (player.disconnectTime || 0);
  if (elapsed > DISCONNECT_GRACE_PERIOD_MS) {
    return false; // Too late
  }

  player.status = 'alive';
  player.disconnectTime = null;

  // Send full state for resync
  this.sendFullStateToPlayer(state, playerId);
  return true;
}

// Check in tick processing
private checkDisconnectTimeouts(state: GameSessionState): void {
  const now = Date.now();

  for (const [playerId, player] of state.players) {
    if (player.status === 'disconnected' && player.disconnectTime) {
      if (now - player.disconnectTime > DISCONNECT_GRACE_PERIOD_MS) {
        player.status = 'defeated';
        this.broadcastPlayerEliminated(state, playerId, 'disconnect_timeout');
      }
    }
  }
}
```

## Matchmaking Loop Pattern

Separate matchmaking from game logic:

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

  private readonly PROCESS_INTERVAL_MS = 2000;
  private readonly INITIAL_ELO_RANGE = 100;
  private readonly MAX_ELO_RANGE = 500;
  private readonly RANGE_EXPANSION_INTERVAL_MS = 10000;

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

  joinQueue(player: QueuedPlayer): QueueStatus {
    const queue = this.getOrCreateQueue(player.communityId);
    queue.set(player.userId, player);

    // Try immediate match if enough players
    if (queue.size >= 2) {
      this.processQueue(player.communityId, queue);
    }

    return {
      position: this.getQueuePosition(player),
      estimatedWait: this.estimateWaitTime(player),
      playersInQueue: queue.size,
    };
  }

  leaveQueue(communityId: string, userId: string): void {
    const queue = this.queues.get(communityId);
    queue?.delete(userId);
  }

  private processQueue(communityId: string, queue: Map<string, QueuedPlayer>): void {
    const players = Array.from(queue.values());
    const now = Date.now();

    // Sort by queue time
    players.sort((a, b) => a.queuedAt - b.queuedAt);

    for (let i = 0; i < players.length - 1; i++) {
      const p1 = players[i];
      if (!queue.has(p1.userId)) continue; // Already matched

      // Expand ELO range based on wait time
      const waitTime = now - p1.queuedAt;
      const eloRange = Math.min(
        this.MAX_ELO_RANGE,
        this.INITIAL_ELO_RANGE + Math.floor(waitTime / this.RANGE_EXPANSION_INTERVAL_MS) * 50
      );

      // Find opponent within ELO range
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
}

export default new MatchmakingLoop();
```

## Round-Based Timer Pattern

For turn-based or round-based games:

```typescript
const roundTimers = new Map<string, NodeJS.Timeout>();
const tickIntervals = new Map<string, NodeJS.Timeout>();

function startRoundTimer(gameId: string, durationSeconds: number): void {
  const gameKey = gameId;

  // Clear existing timers
  stopRoundTimer(gameId);

  const durationMs = durationSeconds * 1000;
  const startTime = Date.now();

  // Tick every second for countdown display
  const tickInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));

    gameController.broadcastTimerTick({ secondsRemaining: remaining }, 'all');

    if (remaining <= 0) {
      clearInterval(tickInterval);
    }
  }, 1000);

  tickIntervals.set(gameKey, tickInterval);

  // Timeout for round end
  const timer = setTimeout(async () => {
    clearInterval(tickInterval);
    tickIntervals.delete(gameKey);
    roundTimers.delete(gameKey);

    await handleRoundTimeout(gameId);
  }, durationMs);

  roundTimers.set(gameKey, timer);
}

function stopRoundTimer(gameId: string): void {
  const timer = roundTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    roundTimers.delete(gameId);
  }

  const interval = tickIntervals.get(gameId);
  if (interval) {
    clearInterval(interval);
    tickIntervals.delete(gameId);
  }
}
```

## Spectator Support

Reduce update frequency for spectators:

```typescript
const SPECTATOR_TICK_DIVISOR = 2; // Half rate for spectators

private broadcastTick(state: GameSessionState): void {
  // Full rate for players
  for (const playerId of state.players.keys()) {
    this.sendTickToPlayer(state, playerId);
  }

  // Reduced rate for spectators
  if (state.tick % SPECTATOR_TICK_DIVISOR === 0) {
    this.sendTickToSpectators(state);
  }
}
```

## Common Tick Rates

| Game Type | Tick Rate | Interval |
|-----------|-----------|----------|
| Fast action (Tetris, fighting) | 20 Hz | 50ms |
| Standard multiplayer | 10 Hz | 100ms |
| Turn-based with timers | 1 Hz | 1000ms |
| Slow strategy | 2-5 Hz | 200-500ms |

## Protobuf Events

```protobuf
message GameTickEvent {
  int32 tick = 1;
  repeated PlayerUpdate playerUpdates = 2;
  repeated CombatEvent combatEvents = 3;
}

message PlayerUpdate {
  string playerId = 1;
  Position position = 2;
  int32 score = 3;
  PlayerStatus status = 4;
}

// Delta updates for bandwidth optimization
message BoardDelta {
  repeated CellChange changes = 1;
  int32 tick = 2;
}

message CellChange {
  int32 index = 1;
  int32 value = 2;
}
```

## Examples in Codebase

- **Hextris** - Full multiplayer with matchmaking, spectators, delta encoding
- **RogueGame** - Dungeon crawler with enemy AI and action queues
- **Sketchionary** - Round-based drawing game with timers
