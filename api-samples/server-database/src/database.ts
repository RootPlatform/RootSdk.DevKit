// ============================================================================
// API Sample: SQLite Database
// SDK: dataStore.config.databaseType, dataStore.config.sqlite3.filename
// Permissions: none (the database config is always available to your code)
// Events: none
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Root provides a SQLite database for persistent storage. The SDK exposes the
// database configuration — use any SQLite library you prefer (sqlite3,
// better-sqlite3, knex, prisma, etc.).
//
// No permissions are required. No events are emitted on changes.
//
// ============================================================================

import {
  rootServer,
  RootDatabaseConfig,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelGuid,
  MessageType,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

import sqlite3 from "sqlite3";

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeDatabase(): void {
  const messages = rootServer.community.channelMessages;

  messages.on(ChannelMessageEvent.ChannelMessageCreated, onDbCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Get the full database configuration object.
// Currently only SQLite is supported (databaseType is always "sqlite3").
export function getDatabaseConfig(): RootDatabaseConfig {
  return rootServer.dataStore.config;
}

// Get the SQLite database file path.
// The platform backs up and restores this file. Use this path — if you create
// a separate database file, it won't be included in backups.
export function getDatabasePath(): string {
  const sqlite3Config = rootServer.dataStore.config.sqlite3;
  if (!sqlite3Config) throw new Error("SQLite config not available — check databaseType");
  return sqlite3Config.filename;
}

// Open a SQLite connection using the platform-provided path.
// The KV store (dataStore.appData) uses this same database — both coexist.
export function openDatabase(): sqlite3.Database {
  const filename = getDatabasePath();
  return new sqlite3.Database(filename);
}

// --- COMMAND HANDLER: /server-database ----------------------------------------------------
// Reads the database config and runs a minimal CRUD cycle to verify it works.

async function onDbCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-database")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Read the config
    const config: RootDatabaseConfig = getDatabaseConfig();
    lines.push(`✓ databaseType: ${config.databaseType}`);
    lines.push(`✓ filename: ${getDatabasePath()}`);

    // 2. Open the database
    const db: sqlite3.Database = openDatabase();

    // 3. Minimal CRUD cycle — create table, insert, query, clean up
    await run(db, `CREATE TABLE IF NOT EXISTS howto_demo (id INTEGER PRIMARY KEY, message TEXT)`);
    lines.push("✓ created howto_demo table");

    await run(db, `INSERT INTO howto_demo (message) VALUES (?)`, ["Hello from the database api sample!"]);
    lines.push("✓ inserted a row");

    const rows: { id: number; message: string }[] = await all<{ id: number; message: string }>(db, `SELECT * FROM howto_demo`);
    lines.push(`✓ queried ${rows.length} row(s): ${rows.map((r) => r.message).join(", ")}`);

    await run(db, `DROP TABLE howto_demo`);
    lines.push("✓ dropped howto_demo table");

    db.close();
    lines.push("✓ cleanup complete");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`DB demo error: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    } else if (err instanceof Error) {
      parts.push(`DB demo error: ${err.message}`);
    }
    await messages.create({ channelId, content: parts.join("\n") });
  }
}

// --- HELPERS -----------------------------------------------------------------
// Promisified wrappers for the callback-based sqlite3 API.

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function all<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}
