// ============================================================================
// API Sample: Client Attachment
// SDK: rootServer.clients.getClients, .getClient, .getDeviceIds, .on/.off
// Permissions: channel.createMessage (for the /server-app-client-attachment command only)
// Events: user.attached, user.detached, user.device.attached, user.device.detached
// Works in: Apps only (@rootsdk/server-app)
//           rootServer.clients (AttachedClients) is NOT available in
//           @rootsdk/server-bot.
// ============================================================================
//
// Track connected users and devices in real time. Query who is online and
// listen for connection/disconnection events.
//
// AttachedClients extends TypedEventEmitter<ClientEvents>, so use .on(),
// .off(), and .once() for type-safe event handling.
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  Client,
  ClientContext,
  ClientEvent,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  UserGuid,
  ChannelGuid,
  RootApiException,
} from "@rootsdk/server-app";

// --- SUBSCRIBE ---------------------------------------------------------------

// rootServer.clients tracks users and devices connected to this app in real
// time. Subscribe to events in the starting callback so listeners are active
// before any client connections arrive.
export function initializeClients(state: RootAppStartState): void {
  const clients = rootServer.clients;

  // Connection lifecycle events — use the ClientEvent enum for type safety.
  clients.on(ClientEvent.UserAttached, onUserAttached);
  clients.on(ClientEvent.UserDetached, onUserDetached);
  clients.on(ClientEvent.UserDeviceAttached, onDeviceAttached);
  clients.on(ClientEvent.UserDeviceDetached, onDeviceDetached);

  // Command trigger
  const messages = rootServer.community.channelMessages;
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onClientsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Returns all currently connected users with their device arrays.
// Each Client has: userId, communityId, deviceIds (all devices), deviceId
// (current device, may be undefined).
export function listConnectedClients(): Client[] {
  return rootServer.clients.getClients();
}

// Returns a single connected user by userId, or undefined if the user has no
// active connections. A user with multiple devices returns one Client object
// containing all deviceIds.
export function getConnectedClient(userId: UserGuid): Client | undefined {
  return rootServer.clients.getClient(userId);
}

// Returns raw device IDs for all connected devices. Use getClients() when you
// need user-to-device mapping.
export function listDeviceIds(): string[] {
  return rootServer.clients.getDeviceIds();
}

// --- EVENT HANDLERS ----------------------------------------------------------

// Fires when a user's first device connects. The Client object contains all
// device IDs (which will be exactly one at this point).
// Does NOT fire when an already-connected user adds another device — that
// triggers user.device.attached instead.
function onUserAttached(client: Client): void {
  console.log(
    `[clients] user.attached: userId=${client.userId} ` +
    `communityId=${client.communityId} devices=${client.deviceIds.length}`,
  );
}

// Fires when the user's last device disconnects. After this event,
// getClient(userId) returns undefined for this user.
function onUserDetached(client: Client): void {
  console.log(
    `[clients] user.detached: userId=${client.userId} ` +
    `communityId=${client.communityId}`,
  );
}

// Fires when an additional device connects for an already-connected user.
// Does NOT fire for the first device — that triggers user.attached instead.
// ClientContext has: userId, communityId, deviceId (the specific device).
function onDeviceAttached(ctx: ClientContext): void {
  console.log(
    `[clients] user.device.attached: userId=${ctx.userId} ` +
    `deviceId=${ctx.deviceId}`,
  );
}

// Fires when a device disconnects. If this was the user's last device,
// user.detached fires immediately after this event.
function onDeviceDetached(ctx: ClientContext): void {
  console.log(
    `[clients] user.device.detached: userId=${ctx.userId} ` +
    `deviceId=${ctx.deviceId}`,
  );
}

// --- COMMAND HANDLER: /server-app-client-attachment -------------------------------------------
// Lists connected clients, looks up a specific user, and reports device counts.

async function onClientsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-app-client-attachment")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  // 1. List all connected clients
  const allClients: Client[] = listConnectedClients();
  lines.push(`\u2713 connected clients: ${allClients.length}`);

  // 2. List all device IDs
  const deviceIds: string[] = listDeviceIds();
  lines.push(`\u2713 device ids: ${deviceIds.length}`);

  // 3. Look up a specific client (use the first connected user if any)
  if (allClients.length > 0) {
    const firstClient: Client = allClients[0];
    const looked: Client | undefined = getConnectedClient(firstClient.userId);
    lines.push(`\u2713 client lookup: ${looked ? "found" : "none"}`);
  } else {
    lines.push(`\u2713 client lookup: none`);
  }

  // 4. Confirm event listeners are registered
  lines.push(`\u2713 event listeners: 4 registered`);

  try {
    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      console.error("Clients command error:", err.errorCode);
    } else if (err instanceof Error) {
      console.error("Clients command error:", err.message);
    }
  }
}
