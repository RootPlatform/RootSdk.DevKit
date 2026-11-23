---
path: support/sdk-release-notes.md
audience: both
category: guide
summary: Changes in each release of the Root SDK packages: `@rootsdk/server-app`, `@rootsdk/server-bot`, `@rootsdk/client-app` and `@rootsdk/dev-tools`.
---

# SDK release notes

Changes in each release of the Root SDK packages: `@rootsdk/server-app`, `@rootsdk/server-bot`, `@rootsdk/client-app` and `@rootsdk/dev-tools`.

## 0.22.0

Released 2026-11-23.

Update every `@rootsdk` package in your project to 0.22.0. `@rootsdk/client-app-ui` has no changes and stays at 0.21.3.

### Changes that can affect your code

- **The dev host listens on `127.0.0.1` only.** Before, it listened on every network interface. To open your App from a phone or another computer during development, set `ROOT_DEV_BIND_IP=0.0.0.0` before you start the dev host.
- **A server that loses its connection to Root exits.** Before, an App or Bot server kept running without receiving events when its connection to Root ended. It now logs which connection it lost and exits with code 1, so Root restarts it. Under the dev host, your server also exits when the dev host stops.
- **`KeyValueStore` key patterns treat a backslash as an escape character.** `deleteLike`, `select` and `selectValue` now match `_` as a literal `_` and `\%` as a literal `%`, as the API reference describes. Before, the backslash was matched as a character.
- **`KeyValueStore` rejects `undefined` values.** `set()`, and an `update()` callback that returns `undefined`, throw an error that names the key. Before, they failed with `SQLITE_CONSTRAINT: NOT NULL constraint failed`. Use `delete()` to remove a key. `null`, `0` and `""` are stored as before.
- **Malformed UUIDs are rejected.** A 36-character ID must match the `8-4-4-4-12` hexadecimal format. Before, a string such as `zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz` was read as an ID of all zeros.
- **Three enums are no longer exported:** `BillingPaymentStatus`, `BillingSubscriptionStatus` and `BillingSubscriptionInterval`. No SDK type used them.

### New

- `Community` has `bannerAssetUri` and `category`. `CommunityEditRequest` has optional `category`, `updateBanner` and `bannerTokenUri` fields, so your code can set a community's category and banner. Existing `communities.edit()` calls work unchanged.
- `communityRoles.list()` returns `CommunityRoleListItem` objects: a `CommunityRole` with an optional `memberCount`.
- The packaging CLI (`rootsdk build package` and `rootsdk upload package`) runs on macOS, on Apple silicon and Intel Macs.

### Fixes

**App and Bot servers**

- `KeyValueStore` deletes expired keys while your server runs. Before, expired keys were deleted only at startup. Reads already left out expired keys.
- Creating a role and then adding it to a member group no longer fails with `FOREIGN KEY constraint failed`. The same error no longer happens when a member joins with, or is given, a role your server had not recorded.
- An error in a member group event handler is logged with the event name and no longer stops your server.
- A setting that names a deleted role no longer fails the whole settings update. The unknown role is skipped with a warning, and the rest of the update is saved.
- When Root stops your server, your stopping callback runs to the end before the process exits. If shutdown takes longer than 15 seconds, the process exits with code 1.
- The server connects normally during the hour that repeats when clocks go back for daylight saving time. Before, it failed with "Failed to connect before the deadline".
- The published packages declare every package they load (`@grpc/grpc-js` for the server packages, `protobufjs` and `long` for `dev-tools`). Before, they could fail to load with pnpm or `npm install --legacy-peer-deps`.

**Code generation**

- `rootsdk-protoc` compiles with its own TypeScript version. Before, it used your project's TypeScript, and TypeScript 6 or 7 made code generation fail.

**Dev host**

- Images load through `rootClient.assets.toImageUrl` and `toUrl`. Before, every image request returned 404.
- Permissions in your manifest are applied in your test community. Before, they were dropped.
- A number setting in your manifest no longer crashes the dev host.
- A manifest `id` that is not an App ID stops the dev host with an error that says so.
- The dev host reconnects when Root closes its connection. Before, it stayed running without receiving events.
- A Bot under the dev host receives events only from the community its `DEV_TOKEN` belongs to.
- User search matches the text you type. Before, characters such as `[` or `(` returned an HTTP 500 error.

**Packaging CLI**

- The CLI unpacks its binary the first time you run it if your package manager skipped install scripts (`npm --ignore-scripts`, pnpm 10 or later, Bun). Before, it failed with `CLI binary not found`.
- On a platform with no CLI binary, the error names your platform and lists the supported ones.
- The client bundle leaves out `.env` files (except examples), `.git`, `.ssh`, `.aws`, `.npmrc`, `.netrc`, private SSH keys and database files, and the CLI lists what it left out. If `package.client.deploy` is your project folder, the CLI warns that everything in it is published.
- A Bot package has no client bundle. Before, the CLI packaged the Bot's project folder as its client bundle.
- When the manifest `id` is not an App ID, the error names the file and tells you to copy the App ID from the Developer Portal.
- The CLI runs on Alpine Linux without ICU installed.