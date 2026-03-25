// ============================================================================
// How-To: RPC Services — RoomPanel (Client)
// SDK: roomServiceClient (gen-client), RootServerException, RoomError
// ============================================================================
//
// Client side of RoomService: join/leave rooms, send messages, subscribe to
// targeted broadcast events.
//
// Targeted broadcasts (Client[] audience on the server) mean only room
// members receive events. Clients outside the room never see them.
//
// ============================================================================

import React, { useState, useEffect } from "react";

import { RootServerException } from "@rootsdk/client-app";

import {
  roomServiceClient,
  RoomServiceClientEvent,
} from "@rpchowto/gen-client";

import {
  RoomJoinedEvent,
  RoomLeftEvent,
  RoomMessageEvent,
  RoomError,
} from "@rpchowto/gen-shared";

// --- RPC CALLS: RoomService --------------------------------------------------

async function joinRoom(roomId: string): Promise<string[]> {
  const response = await roomServiceClient.join({ roomId });
  return response.memberIds;
}

async function leaveRoom(roomId: string): Promise<void> {
  await roomServiceClient.leave({ roomId });
}

async function sendToRoom(roomId: string, text: string): Promise<void> {
  // Throws RootServerException with RoomError.NOT_A_MEMBER
  // if the caller hasn't joined the room.
  await roomServiceClient.send({ roomId, text });
}

// --- REACT COMPONENT ---------------------------------------------------------

export const RoomPanel: React.FC<{ onLog: (msg: string) => void }> = ({
  onLog,
}) => {
  const [roomId] = useState("demo-room");

  // Subscribe to RoomService broadcasts.
  // These only fire for room members — the server broadcasts to Client[]
  // (not "all"), so only users who joined the room receive events.
  useEffect(() => {
    const onJoined = (event: RoomJoinedEvent) => {
      onLog(
        `[broadcast] user ${event.userId} joined room ${event.roomId}`,
      );
    };
    const onLeft = (event: RoomLeftEvent) => {
      onLog(
        `[broadcast] user ${event.userId} left room ${event.roomId}`,
      );
    };
    const onMessage = (event: RoomMessageEvent) => {
      onLog(`[broadcast] ${event.senderId}: ${event.text}`);
    };

    roomServiceClient.on(RoomServiceClientEvent.Joined, onJoined);
    roomServiceClient.on(RoomServiceClientEvent.Left, onLeft);
    roomServiceClient.on(RoomServiceClientEvent.Message, onMessage);

    return () => {
      roomServiceClient.off(RoomServiceClientEvent.Joined, onJoined);
      roomServiceClient.off(RoomServiceClientEvent.Left, onLeft);
      roomServiceClient.off(RoomServiceClientEvent.Message, onMessage);
    };
  }, [onLog]);

  // --- Event handlers --------------------------------------------------------

  const handleJoin = async () => {
    const members = await joinRoom(roomId);
    onLog(`joined room "${roomId}": ${members.length} member(s)`);
  };

  const handleLeave = async () => {
    await leaveRoom(roomId);
    onLog(`left room "${roomId}"`);
  };

  const handleSend = async () => {
    try {
      await sendToRoom(roomId, "Hello from client!");
      onLog(`sent message to room "${roomId}"`);
    } catch (error: unknown) {
      if (error instanceof RootServerException) {
        switch (error.code) {
          case RoomError.NOT_A_MEMBER:
            onLog(`not a member of room "${roomId}" — join first`);
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
      <h2>Room: {roomId}</h2>
      <button onClick={handleJoin}>Join Room</button>
      <button onClick={handleLeave}>Leave Room</button>
      <button onClick={handleSend}>Send Message</button>
    </div>
  );
};
