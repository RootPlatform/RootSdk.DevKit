// ============================================================================
// API Sample: RPC Services — Room Tracker
// SDK: (helper module — no direct SDK calls)
// Permissions: none
// Events: none
// Works in: Apps only (@rootsdk/server-app)
// ============================================================================
//
// In-memory map of roomId → Client[]. Tracks which clients are in each room
// so RoomService can broadcast to the correct audience using Client[] targeting.
//
// Production apps should clean up disconnected users via rootServer.clients
// events (user.detached). See clients-app/ api sample for the event patterns.
//
// ============================================================================

import { Client, UserGuid } from "@rootsdk/server-app";

export class RoomTracker {
  // roomId → array of Client objects currently in that room.
  private rooms = new Map<string, Client[]>();

  // Adds a client to a room. Returns the current member list (including the
  // new client). Deduplicates by userId — the same user joining twice is a
  // no-op (the Client reference is updated in case the object changed).
  join(roomId: string, client: Client): Client[] {
    let members = this.rooms.get(roomId);
    if (!members) {
      members = [];
      this.rooms.set(roomId, members);
    }

    // Compare by userId, not object reference — the same user may reconnect
    // with a different Client object.
    const existingIndex = members.findIndex((m) => m.userId === client.userId);
    if (existingIndex >= 0) {
      members[existingIndex] = client; // Update reference
    } else {
      members.push(client);
    }

    return members;
  }

  // Removes a client from a room by userId. Returns the remaining members.
  // Deletes the room entry when empty to prevent unbounded memory growth.
  // For rooms that should persist empty, remove the cleanup line.
  leave(roomId: string, client: Client): Client[] {
    const members = this.rooms.get(roomId);
    if (!members) return [];

    const remaining = members.filter((m) => m.userId !== client.userId);

    if (remaining.length === 0) {
      this.rooms.delete(roomId);
    } else {
      this.rooms.set(roomId, remaining);
    }

    return remaining;
  }

  // Returns Client[] for the room. Pass this array directly to
  // this.broadcastXxx(event, members, client) to target only room members.
  // Returns empty array if room does not exist.
  getMembers(roomId: string): Client[] {
    return this.rooms.get(roomId) ?? [];
  }

  // Membership check — used by RoomService.send() to verify the caller is
  // in the room before broadcasting.
  isInRoom(roomId: string, userId: UserGuid): boolean {
    const members = this.rooms.get(roomId);
    return members ? members.some((m) => m.userId === userId) : false;
  }
}

export const roomTracker = new RoomTracker();
