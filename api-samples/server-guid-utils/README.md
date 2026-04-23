# API Sample: GUID Utilities

Inspect, classify, and extract metadata from Root platform GUIDs without making API calls.

## Source Files

| File | What it covers |
|------|---------------|
| [guid-utils.ts](src/guid-utils.ts) | Type inspection, timestamp extraction, well-known GUIDs |

## SDK Utilities

- `RootGuidUtils.toRootGuidType(guid)` — extract the entity type from any GUID
- `RootGuidUtils.toMilliseconds(guid)` — extract the creation timestamp (ms since Root epoch)
- `RootGuidUtils.toUuidString(guid)` — convert a base64 GUID to standard UUID format (36-char with hyphens)
- `RootGuidConverter.parse(guid)` — normalize a GUID string to canonical base64 format (accepts both base64 and UUID input)
- `RootGuidType` — enum of all entity types (Person, App, Channel, Message, etc.)
- `WellKnownRootGuids.CommunityRoles.EveryoneRole` — the @everyone role GUID constant

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- `channel.createMessage` — only for the `/server-guid-utils` command trigger. The GUID utilities themselves require no permissions.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **No API calls needed** — all GUID utilities operate on the GUID string itself. They decode the binary structure of the GUID to extract type and timestamp.
- **RootGuidType.Person vs RootGuidType.App** — the primary way to distinguish human users from bots/apps. `toRootGuidType(userId)` returns `Person` (1) for humans, `App` (9) for bots and apps.
- **toMilliseconds()** — returns a value compatible with the JavaScript `Date` constructor. Pass directly to `new Date()` to get the creation time of any GUID.
- **Format conversion** — `toUuidString()` converts Root's 22-char base64 GUIDs to standard 36-char UUID format (with hyphens). `RootGuidConverter.parse()` converts back. Use these when integrating with external systems that expect UUID format.
- **WellKnownRootGuids** — platform-defined constants. Currently provides `CommunityRoles.EveryoneRole`, the GUID of the default role assigned to every community member.
- **Branded GUID types** — the SDK uses branded string types (`UserGuid`, `ChannelGuid`, `CommunityRoleGuid`, etc.) for type safety. All are strings at runtime, but TypeScript enforces correct usage at compile time.
