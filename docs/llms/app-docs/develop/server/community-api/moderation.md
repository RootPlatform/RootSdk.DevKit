---
path: app-docs/develop/server/community-api/moderation.md
audience: app
category: guide
summary: Build automated moderation tools that manage members, moderate content, and control voice channels.
---

# Moderation

Build automated moderation tools that manage members, moderate content, and control voice channels.

## What is moderation?

Moderation encompasses the tools and actions that maintain community standards. The Community API provides three categories of moderation capabilities:

| Category | What it controls | Key clients |
|----------|------------------|-------------|
| Member moderation | Who can participate in the community | `CommunityMemberBanClient` |
| Content moderation | What content is allowed | `ChannelMessageClient` |
| Voice moderation | Behavior in voice channels | `ChannelWebRtcClient` |

Each category has specific permissions that you declare in your manifest. Your code can combine these capabilities to build comprehensive moderation systems.

## Member moderation

Member moderation controls who can participate in the community through bans and kicks.

### Bans vs. kicks

| Action | Effect | User can rejoin? | Creates record? |
|--------|--------|------------------|-----------------|
| Ban | Removes member from community | No (until unbanned) | Yes |
| Kick | Removes member from community | Yes | No |

Use bans for serious violations where you want to prevent the user from returning. Use kicks for minor issues or when you want to give the user a chance to rejoin with better behavior.

### Ban properties

Bans support optional properties for nuanced enforcement:

- **Reason**: Stored with the ban and sent to the user in their notification. Useful for transparency and audit trails.
- **Expiration**: Bans can be temporary. After the expiration date, the user can rejoin (though they must still have an invite or the community must be public).

### Side effects

When your code bans or kicks a member, Root automatically:

1. Removes the member from the community
2. Sends a push notification to the affected user
3. Posts a system message to the community's default channel
4. Creates an entry in the community audit log

### Required permissions

| Action | Permission |
|--------|------------|
| Ban a member | `createBan` |
| Unban a member | `manageBans` |
| View ban list | `manageBans` |
| Kick a member | `kick` |

### Restrictions

Your code cannot ban or kick:

- The community owner
- Apps (use app management instead)

Attempting these actions throws `RootApiException` with `errorCode` set to `NoPermissionToBan` or `NoPermissionToKick`.

## Content moderation

Content moderation controls what messages exist in channels. Your code can delete messages or flag them for review.

### Deleting messages

Use `ChannelMessageClient.delete` to remove messages that violate community guidelines. You can delete messages posted by other members if you have the `deleteMessageOther` permission.

### Flagging messages

Use `ChannelMessageClient.flag` to report messages for human review. Flagging requires specifying a reason from the `ContentFlagReason` enum:

| Reason | Value |
|--------|-------|
| `Other` | 1 |
| `Dmca` | 2 |
| `Copyright` | 3 |
| `Spam` | 4 |
| `Hatespeech` | 5 |
| `Violence` | 6 |
| `Harassment` | 7 |
| `Sexualcontent` | 8 |
| `Misinformation` | 9 |
| `Impersonation` | 10 |
| `Objectionable` | 11 |

Flagging does not require special permissions and does not remove the message. It creates a report for community moderators to review.

### Required permissions

| Action | Permission |
|--------|------------|
| Delete own messages | (always allowed) |
| Delete others' messages | `deleteMessageOther` |
| Flag messages | (no permission required) |

## Voice moderation

Voice moderation controls behavior in voice channels through the `ChannelWebRtcClient`.

### Available actions

| Action | Method | Effect |
|--------|--------|--------|
| Mute | `setMuteAndDeafenOther` | Prevents user from transmitting audio |
| Deafen | `setMuteAndDeafenOther` | Prevents user from hearing audio |
| Kick | `kick` | Removes user from the voice session |

Muting and deafening are administrative overrides. The affected user cannot unmute or undeafen themselves until a moderator removes the restriction.

### Required permissions

| Action | Permission |
|--------|------------|
| Mute another user | `voiceMuteOther` |
| Deafen another user | `voiceDeafenOther` |
| Kick from voice | `voiceKick` |

## Preventive moderation with access rules

Beyond reactive moderation, you can use access rules for preventive moderation. Access rules let you restrict permissions in specific channels or channel groups.

Common preventive patterns:

- **Lockdown**: Deny `channelCreateMessage` to the @everyone role on a channel during incidents
- **Read-only archives**: Deny `channelCreateMessage` while keeping `channelView` allowed
- **Restricted file uploads**: Deny `channelCreateFile` in channels where file sharing is inappropriate

See [Access rules](access-rules.md) for details on creating and managing access rules.

## When to use moderation

Use moderation capabilities when your code needs to:

- **Enforce community rules automatically**: Detect violations (spam, prohibited content) and take action without human intervention.
- **Assist human moderators**: Flag suspicious content for review, provide moderation dashboards, or streamline bulk actions.
- **Respond to incidents**: Lock down channels during raids, mass-kick bot accounts, or temporarily restrict permissions.
- **Implement timed restrictions**: Create temporary bans or channel lockdowns that automatically expire.

## Listening for moderation events

Subscribe to events to track moderation actions in real time:

| Event | Emitted when |
|-------|--------------|
| `communityMemberBan.created` | A member is banned |
| `communityMemberBan.deleted` | A ban is removed |
| `channelMessage.deleted` | A message is deleted |

These events let your code react to moderation actions, such as logging them to an external system or updating a moderation dashboard.