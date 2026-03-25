# Sample Apps

Complete, runnable Root app examples. Each app has a client (React/TypeScript), server (Node.js/TypeScript), and networking layer (Protobuf RPC services).

| Folder | Description | Key Patterns | Complexity |
|--------|-------------|-------------|------------|
| `hello-world` | Minimal echo service | Client-server protobuf round-trip | Minimal |
| `data-storage` | Task list with persistence | SQLite database, CRUD operations | Moderate |
| `protobuf-service` | Voting between two options | Custom RPC services, broadcast updates | Moderate |
| `suggestion-box` | Community suggestion board | Multiple services, voting, error handling, client state management | Complex |
| `themes` | UI theming showcase | Root design tokens, CSS variables, icons — no networking | Minimal (UI) |
| `tic-tac-toe` | Real-time multiplayer game | Shared game state, turn logic, multiple services | Complex |
