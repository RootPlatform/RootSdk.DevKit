// ============================================================================
// How-To: Key-Value Store
// SDK: dataStore.appData.get, .set, .update, .delete, .deleteLike, .select,
//      .selectValue
// Permissions: none (the key-value store is always available to your code)
// Events: none
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// The key-value store persists JSON-serializable data scoped to your app's
// community. Values are stored as JSON strings — objects, arrays, numbers,
// booleans, and null all round-trip correctly.
//
// No permissions are required. No events are emitted on changes.
//
// ============================================================================

import {
  rootServer,
  KeyValue,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelGuid,
  MessageType,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

const kv = rootServer.dataStore.appData;

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeKvStore(): void {
  const messages = rootServer.community.channelMessages;

  messages.on(ChannelMessageEvent.ChannelMessageCreated, onKvCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Get a single value by exact key.
// Returns undefined if the key does not exist or has expired.
export async function getValue<T>(key: string): Promise<T | undefined> {
  return await kv.get<T>(key);
}

// Set one or more key-value pairs (upsert).
// If the key already exists, its value is overwritten.
// Supports an optional expiresAt date — after that time, get/select skip it.
export async function setValue<T>(key: string, value: T, expiresAt?: Date): Promise<void> {
  const entry: KeyValue<T> = { key, value };
  if (expiresAt) entry.expiresAt = expiresAt;
  await kv.set(entry);
}

// Set multiple key-value pairs in a single call.
export async function setValues<T>(entries: KeyValue<T>[]): Promise<void> {
  await kv.set(entries);
}

// Atomically read-modify-write a value.
// If the key does not exist (or has expired), updateFunc receives defaultValue.
// Returns the new value after the update.
export async function updateValue<T>(
  key: string,
  updateFunc: (current: T) => T,
  defaultValue: T,
  expiresAt?: Date,
): Promise<T> {
  return await kv.update<T>(key, updateFunc, defaultValue, expiresAt);
}

// Delete a single key.
// Succeeds silently if the key does not exist.
export async function deleteValue(key: string): Promise<void> {
  await kv.delete(key);
}

// Delete all keys matching a SQL LIKE pattern.
// Wildcards: % = any characters, _ = exactly one character.
export async function deleteByPattern(pattern: string): Promise<void> {
  await kv.deleteLike(pattern);
}

// Get all key-value pairs matching a pattern (includes key, value, expires_at).
// Expired keys are automatically filtered out.
// Returns an empty array if nothing matches.
export async function selectEntries<T>(pattern: string): Promise<KeyValue<T>[]> {
  return await kv.select<T>(pattern);
}

// Get just the values matching a pattern (no keys or metadata).
// Returns an empty array if nothing matches.
export async function selectValues<T>(pattern: string): Promise<T[]> {
  return await kv.selectValue<T>(pattern);
}

// --- COMMAND HANDLER: /server-key-value-store ----------------------------------------------------
// Exercises all 7 KV methods in a single flow and posts the results.

async function onKvCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-key-value-store")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. set — store a value
    await setValue("howto:demo:greeting", { text: "Hello, KV store!", ts: Date.now() });
    lines.push("✓ set: stored howto:demo:greeting");

    // 2. get — retrieve it
    const greeting: { text: string; ts: number } | undefined = await getValue<{ text: string; ts: number }>("howto:demo:greeting");
    lines.push(`✓ get: ${greeting?.text}`);

    // 3. set with expiration — value auto-expires after the given date
    const expires_at = new Date(Date.now() + 60_000); // 1 minute from now
    await setValue("howto:demo:temp", "I expire in 60s", expires_at);
    lines.push(`✓ set (expires_at): stored howto:demo:temp, expires ${expires_at.toISOString()}`);

    // 4. set batch — multiple keys at once
    await setValues([
      { key: "howto:demo:counter:a", value: 10 },
      { key: "howto:demo:counter:b", value: 20 },
      { key: "howto:demo:counter:c", value: 30 },
    ]);
    lines.push("✓ set (batch): stored 3 counter keys");

    // 5. update — atomic read-modify-write (counter increment)
    const newVal = await updateValue<number>(
      "howto:demo:counter:a",
      (n) => n + 1,
      0, // defaultValue if key is missing
    );
    lines.push(`✓ update: howto:demo:counter:a incremented to ${newVal}`);

    // 6. select — pattern query returning key + value + metadata
    const entries: KeyValue<number>[] = await selectEntries<number>("howto:demo:counter:%");
    lines.push(`✓ select: found ${entries.length} entries matching howto:demo:counter:%`);
    for (const entry of entries) {
      lines.push(`    ${entry.key} = ${entry.value}`);
    }

    // 7. selectValue — pattern query returning just values
    const values: number[] = await selectValues<number>("howto:demo:counter:%");
    lines.push(`✓ selectValue: [${values.join(", ")}]`);

    // 8. delete — remove a single key
    await deleteValue("howto:demo:greeting");
    const afterDelete: unknown = await getValue("howto:demo:greeting");
    lines.push(`✓ delete: howto:demo:greeting → ${afterDelete === undefined ? "undefined (gone)" : "still exists"}`);

    // 9. deleteLike — remove keys by pattern
    await deleteByPattern("howto:demo:counter:%");
    const afterBulk: unknown[] = await selectValues("howto:demo:counter:%");
    lines.push(`✓ deleteLike: howto:demo:counter:% → ${afterBulk.length} remaining`);

    // Clean up the temp key too
    await deleteValue("howto:demo:temp");
    lines.push("✓ cleanup complete");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`KV demo error: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    } else if (err instanceof Error) {
      parts.push(`KV demo error: ${err.message}`);
    }
    await messages.create({ channelId, content: parts.join("\n") });
  }
}
