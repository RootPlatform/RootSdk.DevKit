// ============================================================================
// How-To: RPC Services — RoomService
// SDK: extends RoomServiceBase (generated from room_service.proto)
//      this.broadcastXxx(event, Client[], client) — targeted broadcast
//      RootServerException — server-to-client error propagation
// Permissions: none (RPC services don't use channel permissions)
// Events: BroadcastJoined (RoomJoinedEvent), BroadcastLeft (RoomLeftEvent),
//         BroadcastMessage (RoomMessageEvent)
// Works in: Apps only (@rootsdk/server-app)
// ============================================================================
//
// Join/leave rooms, send messages to room members. Demonstrates targeted
// broadcasts using Client[] audience — unlike ItemService which broadcasts
// to "all", RoomService broadcasts only to the specific clients who have
// joined a room.
//
// Other broadcast audience options (not shown here — see comments below):
//   CommunityGuid        — all clients in a specific community
//   ClientContext[]       — lightweight client references
//   CustomMemberGroupGuid — by member group ID (persistent groups)
//   ReadOnlyMemberGroup   — by member group reference
//
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";
import { RoomServiceBase } from "@rpchowto/gen-server";
import {
  RoomJoinRequest,
  RoomJoinResponse,
  RoomJoinedEvent,
  RoomLeaveRequest,
  RoomLeaveResponse,
  RoomLeftEvent,
  RoomSendRequest,
  RoomSendResponse,
  RoomMessageEvent,
  RoomError,
} from "@rpchowto/gen-shared";
import { roomTracker } from "./room-tracker";

// --- SERVICE: RoomService ----------------------------------------------------

export class RoomService extends RoomServiceBase {

  // JOIN — add client to room, broadcast to room members.
  async join(
    request: RoomJoinRequest,
    client: Client,
  ): Promise<RoomJoinResponse> {
    const members: Client[] = roomTracker.join(request.roomId, client);

    // Client[] audience: sends the event ONLY to the listed clients.
    // This is the key difference from "all" — only room members receive
    // the event. Clients outside the room never see it.
    const event: RoomJoinedEvent = {
      roomId: request.roomId,
      userId: client.userId,
    };
    this.broadcastJoined(event, members, client);

    // Return the current member list to the joining client.
    return { memberIds: members.map((m) => m.userId) };
  }

  // LEAVE — remove client from room, broadcast to remaining members.
  async leave(
    request: RoomLeaveRequest,
    client: Client,
  ): Promise<RoomLeaveResponse> {
    const remaining: Client[] = roomTracker.leave(request.roomId, client);

    // No `except` parameter needed here — the leaving client was already
    // removed from the members array by roomTracker.leave(). Passing
    // `client` as except would also work (harmless, more explicit).
    const event: RoomLeftEvent = {
      roomId: request.roomId,
      userId: client.userId,
    };
    this.broadcastLeft(event, remaining);

    return {};
  }

  // SEND — broadcast a message to all room members except the sender.
  async send(
    request: RoomSendRequest,
    client: Client,
  ): Promise<RoomSendResponse> {
    // Verify membership before allowing send. Without this check, any
    // connected client could broadcast to a room they haven't joined.
    if (!roomTracker.isInRoom(request.roomId, client.userId)) {
      throw new RootServerException(
        RoomError.NOT_A_MEMBER,
        `Not a member of room ${request.roomId}`,
      );
    }

    const members: Client[] = roomTracker.getMembers(request.roomId);

    // Broadcast to all room members except the sender.
    const event: RoomMessageEvent = {
      roomId: request.roomId,
      senderId: client.userId,
      text: request.text,
    };
    this.broadcastMessage(event, members, client);

    return {};
  }
}

// Singleton instance — pass to rootServer.lifecycle.addService() in main.ts.
export const roomService = new RoomService();
