// ============================================================================
// How-To: RPC Services — ItemPanel (Client)
// SDK: itemServiceClient (gen-client), RootServerException, ItemError
// ============================================================================
//
// Client side of ItemService: call CRUD RPCs, subscribe to broadcast events,
// handle server errors with typed error codes.
//
// Generated service clients (gen-client) are pre-initialized singletons.
// No connect() or start() call needed — import and use directly.
//
// ============================================================================

import React, { useState, useEffect } from "react";

// RootServerException is thrown by RPC calls when the server throws one.
// Import from @rootsdk/client-app (not server-app).
import { RootServerException } from "@rootsdk/client-app";

// Generated service client — a singleton. Import and call directly.
// ItemServiceClientEvent is an enum of broadcast event names.
import {
  itemServiceClient,
  ItemServiceClientEvent,
} from "@rpchowto/gen-client";

// Request/response/event types and error enum — generated from item_service.proto.
// Both server and client import from gen-shared.
import {
  Item,
  ItemCreateRequest,
  ItemCreatedEvent,
  ItemDeletedEvent,
  ItemError,
} from "@rpchowto/gen-shared";

// --- RPC CALLS: ItemService --------------------------------------------------
// Plain async functions. The generated client handles serialization,
// transport, and deserialization. You get typed responses back.
//
// These are framework-agnostic — copy them into any client (React, Vue,
// vanilla JS). The React component below calls these functions.

async function listItems(): Promise<Item[]> {
  const response = await itemServiceClient.list({});
  return response.items;
}

async function createItem(name: string): Promise<Item> {
  const request: ItemCreateRequest = { name };
  const response = await itemServiceClient.create(request);
  // The caller gets the created item via the return value.
  // Other connected clients receive it via BroadcastCreated instead.
  return response.item!;
}

async function deleteItem(id: number): Promise<void> {
  // If the item doesn't exist, the server throws RootServerException
  // with code ItemError.NOT_FOUND. Catch it at the call site.
  await itemServiceClient.delete({ id });
}

// --- REACT COMPONENT ---------------------------------------------------------

export const ItemPanel: React.FC<{ onLog: (msg: string) => void }> = ({
  onLog,
}) => {
  const [items, setItems] = useState<Item[]>([]);

  // Load items on mount.
  useEffect(() => {
    listItems().then(setItems);
  }, []);

  // Subscribe to ItemService broadcasts on mount, unsubscribe on unmount.
  // These fire when OTHER clients create or delete items.
  // The caller receives the result via the RPC return value instead.
  useEffect(() => {
    const onCreated = (event: ItemCreatedEvent) => {
      onLog(`[broadcast] item created: ${event.item!.name}`);
      setItems((prev) => [...prev, event.item!]);
    };
    const onDeleted = (event: ItemDeletedEvent) => {
      onLog(`[broadcast] item deleted: id=${event.id}`);
      setItems((prev) => prev.filter((i) => i.id !== event.id));
    };

    // .on() subscribes — type-safe via generated event enums.
    itemServiceClient.on(ItemServiceClientEvent.Created, onCreated);
    itemServiceClient.on(ItemServiceClientEvent.Deleted, onDeleted);

    // Cleanup: .off() unsubscribes. Always clean up in useEffect return.
    return () => {
      itemServiceClient.off(ItemServiceClientEvent.Created, onCreated);
      itemServiceClient.off(ItemServiceClientEvent.Deleted, onDeleted);
    };
  }, [onLog]);

  // --- Event handlers --------------------------------------------------------

  const handleCreate = async () => {
    const item = await createItem(`Item ${Date.now()}`);
    onLog(`created item: id=${item.id}, name=${item.name}`);
    setItems((prev) => [...prev, item]);
  };

  const handleList = async () => {
    const result = await listItems();
    onLog(`listed ${result.length} item(s)`);
    setItems(result);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteItem(id);
      onLog(`deleted item: id=${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      // RootServerException carries the error code and message from the server.
      // The code matches the ItemError proto enum values.
      if (error instanceof RootServerException) {
        switch (error.code) {
          case ItemError.NOT_FOUND:
            onLog(`item ${id} not found — refreshing list`);
            setItems(await listItems());
            break;
          default:
            onLog(`server error: code=${error.code} ${error.message}`);
        }
      } else {
        onLog(`unexpected error: ${error}`);
      }
    }
  };

  // --- Render ----------------------------------------------------------------

  return (
    <div>
      <h2>Items</h2>
      <button onClick={handleCreate}>Create Item</button>
      <button onClick={handleList}>Refresh List</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} (id={item.id})
            <button onClick={() => handleDelete(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
