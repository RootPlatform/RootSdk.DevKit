// ============================================================================
// How-To: RPC Services — ItemService
// SDK: extends ItemServiceBase (generated from item_service.proto)
//      this.broadcastXxx(event, "all", client) — broadcast to all clients
//      RootServerException — server-to-client error propagation
// Permissions: none (RPC services don't use channel permissions)
// Events: BroadcastCreated (ItemCreatedEvent), BroadcastDeleted (ItemDeletedEvent)
// Works in: Apps only (@rootsdk/server-app)
// ============================================================================
//
// CRUD operations on items with broadcast to "all" connected clients.
// The RPC caller receives the result via the return value; all other
// connected clients receive it via broadcast events.
//
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";

// Generated base class — extend it to implement the RPC methods defined in
// item_service.proto. Each proto `rpc` becomes an async method to override.
import { ItemServiceBase } from "@rpchowto/gen-server";

// Request/response/event types and error enum — all generated from the proto.
import {
  Item,
  ItemCreateRequest,
  ItemCreateResponse,
  ItemCreatedEvent,
  ItemListRequest,
  ItemListResponse,
  ItemDeleteRequest,
  ItemDeleteResponse,
  ItemDeletedEvent,
  ItemError,
  Timestamp,
} from "@rpchowto/gen-shared";

// --- SERVICE: ItemService ----------------------------------------------------

export class ItemService extends ItemServiceBase {
  // In-memory store. Production apps should use rootServer.dataStore.config
  // (SQLite) or rootServer.dataStore.appData (key-value). See database/ and
  // key-value-store/ how-tos.
  private items = new Map<number, Item>();
  private nextId = 1;

  // CREATE — store item, broadcast to all, return to caller.
  async create(
    request: ItemCreateRequest,
    client: Client,
  ): Promise<ItemCreateResponse> {
    // Build the Item. client.userId identifies who called this RPC method.
    const item: Item = {
      id: this.nextId++,
      name: request.name,
      creatorId: client.userId,
      createdAt: Timestamp.fromDate(new Date()),
    };
    this.items.set(item.id, item);

    // Broadcast to all connected clients EXCEPT the caller.
    //
    // Three arguments:
    //   1. event  — the typed payload (generated from proto message)
    //   2. "all"  — audience: every client connected to this app
    //   3. client — except: exclude this client from the broadcast
    //
    // The caller already knows about the item from the return value below.
    // Other clients learn about it via the BroadcastCreated event.
    const event: ItemCreatedEvent = { item };
    this.broadcastCreated(event, "all", client);

    return { item };
  }

  // LIST — return all items. No broadcast (read-only operation).
  async list(
    request: ItemListRequest,
    client: Client,
  ): Promise<ItemListResponse> {
    return { items: Array.from(this.items.values()) };
  }

  // DELETE — remove item or throw if not found.
  async delete(
    request: ItemDeleteRequest,
    client: Client,
  ): Promise<ItemDeleteResponse> {
    // RootServerException propagates to the calling client as an exception.
    // The error code (ItemError.NOT_FOUND = 1) is received by
    // the client as the exception's `code` property. The message string is
    // received as the exception's `message` property.
    //
    // Error enum values must be positive (1+). Negative codes (-1 through -8)
    // are reserved for built-in RootServerExceptionType (e.g. RequestTimeout,
    // RateLimitExceeded).
    if (!this.items.has(request.id)) {
      throw new RootServerException(
        ItemError.NOT_FOUND,
        `Item ${request.id} not found`,
      );
    }

    this.items.delete(request.id);

    const event: ItemDeletedEvent = { id: request.id };
    this.broadcastDeleted(event, "all", client);

    return {};
  }
}

// Singleton instance — pass to rootServer.lifecycle.addService() in main.ts.
export const itemService = new ItemService();
