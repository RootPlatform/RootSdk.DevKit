// ============================================================================
// API Sample: RPC Services — App (Client)
// SDK: rootClient (pre-initialized singleton from @rootsdk/client-app)
// ============================================================================
//
// Root component. Composes ItemPanel and RoomPanel, shows the authenticated
// user's ID, and provides a shared log for SDK interactions.
//
// rootClient is a pre-initialized singleton — no connect() or start() call
// needed. Import it and use it directly.
//
// ============================================================================

import React, { useState, useCallback } from "react";

// rootClient is a pre-initialized singleton. No connect/start needed.
// The Root platform handles authentication before the app loads.
import { rootClient } from "@rootsdk/client-app";

import { ItemPanel } from "./ItemPanel";
import { RoomPanel } from "./RoomPanel";

export const App: React.FC = () => {
  // rootClient.users.getCurrentUserId() returns the authenticated user's ID.
  // No login flow needed — the platform handles authentication.
  const userId: string = rootClient.users.getCurrentUserId();

  // Shared log — both panels write here to show SDK interactions.
  const [log, setLog] = useState<string[]>([]);
  const addLog = useCallback(
    (msg: string) => setLog((prev) => [...prev, msg]),
    [],
  );

  return (
    <div>
      <h1>RPC Services How-To</h1>
      <p>User: {userId}</p>
      <ItemPanel onLog={addLog} />
      <hr />
      <RoomPanel onLog={addLog} />
      <hr />
      <h2>Log</h2>
      <pre>{log.join("\n")}</pre>
    </div>
  );
};

