// ============================================================================
// How-To: Voice (WebRTC)
// SDK: channelWebRtcs.list, .setMuteAndDeafenOther, .kick
// Permissions: channel.voiceMuteOther, channel.voiceDeafenOther, channel.voiceKick
// Events: ChannelWebRtcEvent.ChannelWebRtcUserAttach, .ChannelWebRtcUserDetach,
//         .ChannelWebRtcUserDeviceSetStatus, .ChannelWebRtcUserDeviceSetTransport,
//         .ChannelWebRtcUserDeviceSetDataChannel
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Observe and moderate voice channel participants. Bots/apps cannot join
// voice calls — these are moderation tools: list who's in the call,
// server-mute/deafen users, and kick them.
//
// Each participant has 4 mute/deafen flags:
//   isMuted / isDeafened        — set by the user themselves
//   isAdminMuted / isAdminDeafened — set by admins or bots via setMuteAndDeafenOther
// Both flag pairs are independent.
//
// ============================================================================

import {
  rootServer,
  ChannelWebRtcEvent,
  ChannelWebRtcUserAttachEvent,
  ChannelWebRtcUserDetachEvent,
  ChannelWebRtcUserDeviceSetStatusEvent,
  ChannelWebRtcUserDeviceSetTransportEvent,
  ChannelWebRtcUserDeviceSetDataChannelEvent,
  ChannelWebRtcListRequest,
  ChannelWebRtcListResponse,
  ChannelWebRtcSetMuteAndDeafenOtherRequest,
  ChannelWebRtcKickRequest,
  ChannelGuid,
  UserGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeVoice(): void {
  const webRtc = rootServer.community.channelWebRtcs;
  const messages = rootServer.community.channelMessages;

  // Voice events
  webRtc.on(ChannelWebRtcEvent.ChannelWebRtcUserAttach, onUserAttach);
  webRtc.on(ChannelWebRtcEvent.ChannelWebRtcUserDetach, onUserDetach);
  webRtc.on(ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetStatus, onDeviceStatusChanged);
  webRtc.on(ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetTransport, onDeviceTransportChanged);
  webRtc.on(ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetDataChannel, onDeviceDataChannelChanged);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onVoiceCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Lists current voice session participants. Returns createdAt (when the session
// started) and members (participant list). Both are optional — undefined if
// there is no active voice session in the channel.
// No permissions required.
export async function listVoiceParticipants(
  channelId: ChannelGuid,
): Promise<ChannelWebRtcListResponse> {
  const request: ChannelWebRtcListRequest = { channelId };
  return rootServer.community.channelWebRtcs.list(request);
}

// Server-mute and/or server-deafen a participant. Sets the admin flags
// (isAdminMuted, isAdminDeafened), which are independent of the user's own
// mute/deafen state. Omit isMuted or isDeafened to leave that flag unchanged.
// Requires channel.voiceMuteOther (if setting isMuted) and/or
// channel.voiceDeafenOther (if setting isDeafened).
export async function setMuteAndDeafen(
  channelId: ChannelGuid,
  userId: UserGuid,
  isMuted?: boolean,
  isDeafened?: boolean,
): Promise<void> {
  const request: ChannelWebRtcSetMuteAndDeafenOtherRequest = {
    channelId,
    userId,
    isMuted,
    isDeafened,
  };
  return rootServer.community.channelWebRtcs.setMuteAndDeafenOther(request);
}

// Kick a participant from the voice channel. Omit userId to kick ALL
// participants (clears the entire voice session).
// Requires channel.voiceKick permission.
export async function kickFromVoice(
  channelId: ChannelGuid,
  userId?: UserGuid,
): Promise<void> {
  const request: ChannelWebRtcKickRequest = { channelId, userId };
  return rootServer.community.channelWebRtcs.kick(request);
}

// --- COMMAND HANDLER: /server-voice -------------------------------------------------
// Lists current voice participants. setMuteAndDeafenOther and kick require
// real participants in a call, so the command only demos list().

async function onVoiceCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-voice")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // List voice participants in this channel
    const session: ChannelWebRtcListResponse = await listVoiceParticipants(channelId);

    if (!session.members || session.members.length === 0) {
      lines.push("No active voice session in this channel.");
    } else {
      lines.push(`✓ Voice session started: ${session.createdAt?.toISOString() ?? "unknown"}`);
      lines.push(`✓ Participants: ${session.members.length}`);

      for (const member of session.members) {
        const media: string[] = [];
        if (member.isAudio) media.push("audio");
        if (member.isVideo) media.push("video");
        if (member.isScreen) media.push("screen");

        lines.push(
          `  - user=${member.userId} device=${member.deviceId} ` +
          `muted=${member.isMuted} adminMuted=${member.isAdminMuted} ` +
          `deafened=${member.isDeafened} adminDeafened=${member.isAdminDeafened} ` +
          `media=[${media.join(", ")}]`,
        );
      }
    }

    // Note: setMuteAndDeafenOther and kick are documented in the operations
    // above but not executed here — they require real voice participants.

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    console.error("Voice demo error:", err);
    await messages.create({ channelId, content: `Voice demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL voice events from any source.

function onUserAttach(evt: ChannelWebRtcUserAttachEvent): void {
  console.log(
    `Voice attach: user=${evt.userId} device=${evt.deviceId} channel=${evt.channelId} ` +
    `muted=${evt.isMuted} adminMuted=${evt.isAdminMuted} ` +
    `deafened=${evt.isDeafened} adminDeafened=${evt.isAdminDeafened} ` +
    `audio=${evt.audioTrackId ?? "none"} video=${evt.videoTrackId ?? "none"} ` +
    `screen=${evt.screenTrackId ?? "none"}`,
  );
}

// isKick distinguishes voluntary leave (false) from admin kick (true).
function onUserDetach(evt: ChannelWebRtcUserDetachEvent): void {
  console.log(
    `Voice detach: user=${evt.userId} device=${evt.deviceId} channel=${evt.channelId} ` +
    `isKick=${evt.isKick}`,
  );
}

function onDeviceStatusChanged(evt: ChannelWebRtcUserDeviceSetStatusEvent): void {
  console.log(
    `Voice status: user=${evt.userId} device=${evt.deviceId} channel=${evt.channelId} ` +
    `muted=${evt.isMuted} adminMuted=${evt.isAdminMuted} ` +
    `deafened=${evt.isDeafened} adminDeafened=${evt.isAdminDeafened}`,
  );
}

function onDeviceTransportChanged(evt: ChannelWebRtcUserDeviceSetTransportEvent): void {
  console.log(
    `Voice transport: user=${evt.userId} device=${evt.deviceId} channel=${evt.channelId} ` +
    `audio=${evt.audioTrackId ?? "none"} video=${evt.videoTrackId ?? "none"} ` +
    `screen=${evt.screenTrackId ?? "none"} screenAudio=${evt.screenAudioTrackId ?? "none"}`,
  );
}

function onDeviceDataChannelChanged(evt: ChannelWebRtcUserDeviceSetDataChannelEvent): void {
  console.log(
    `Voice dataChannel: user=${evt.userId} device=${evt.deviceId} ` +
    `channel=${evt.channelId} name=${evt.dataChannelName}`,
  );
}
