# API Sample: Client Users

User profiles, presence status, profile pictures, and profile update events.
Use when your app needs to display user information, show online/offline status,
render profile pictures, or react to profile changes in real time.

## Source Files

| File | What it covers |
|------|---------------|
| [client/src/UserCard.tsx](client/src/UserCard.tsx) | Client: rootClient.users — profiles, presence, profile pictures, events |
| [server/src/main.ts](server/src/main.ts) | Server: minimal entry point (server-side member APIs are in api-samples/members/) |

## Client SDK Methods (`@rootsdk/client-app`)

- [x] `rootClient.users.getCurrentUserId()` — get the logged-in user's ID
- [x] `rootClient.users.getUserProfile(userId)` — fetch a single profile
- [x] `rootClient.users.getUserProfiles(userIds)` — batch fetch multiple profiles
- [x] `rootClient.users.showUserProfile(userId)` — open native profile UI
- [x] `rootClient.users.on(RootClientUserEvent.UserProfileUpdate, ...)` — profile change events
- [x] `rootClient.assets.toImageUrl(uri, resolution)` — render profile pictures

## Types

- `UserProfile` — `{ id, nickname, profilePictureUri?, onlineStatus }`
- `CommunityUserOnlineStatus` — `Unspecified | OnlineAndAttached | AwayAndAttached | Online | Away | Offline`
- `ImageUriResolution` — `"original" | "large" | "medium" | "small"`

## Permissions

None required.

## Project Structure

```
client-users/
├── root-manifest.json
├── package.json           # Workspace root
├── server/                # Server-side (deploys to Root Platform)
│   └── src/main.ts        # Minimal entry point
└── client/                # Client-side (React + Vite)
    └── src/
        ├── index.tsx      # React entry point
        ├── App.tsx        # Root component
        └── UserCard.tsx   # User profile demo
```
