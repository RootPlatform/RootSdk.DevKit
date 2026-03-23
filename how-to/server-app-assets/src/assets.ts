// ============================================================================
// How-To: Assets
// SDK: dataStore.assets.create, dataStore.assets.get
// Permissions: none required (assets are app-scoped)
// Events: none (assets have no SDK events)
// Works in: Apps only (@rootsdk/server-app) — AssetClient is not in server-bot
// ============================================================================
//
// Convert upload tokens into permanent asset URIs, then resolve asset metadata.
//
// Upload tokens are created when a user or the platform uploads a file. They
// are temporary — convert them to asset URIs promptly and do not store them.
// Once converted, asset URIs are permanent references that appear on entities
// like CommunityEmoji.assetUri, ChannelFile.assetUri, and
// CommunityMember.profilePictureAssetUri. Use get() to resolve metadata.
//
// ============================================================================

import {
  rootServer,
  AssetAppCreateRequest,
  AssetAppCreateResponse,
  // AssetGetRequest and AssetGetResponse are defined in the SDK source but not
  // yet exported from @rootsdk/server-app. Inline definitions below until the
  // next release adds them to grpc_client/index.ts exports.
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootApiException,
  ErrorCodeType,
} from "@rootsdk/server-app";

// TODO: Remove these once AssetGetRequest/AssetGetResponse are exported from
// @rootsdk/server-app (add to sdk/server-app/src/grpc_client/index.ts line 241)
type AssetGetRequest = {
  uris: string[];
};
type AssetGetResponse = {
  assets: {
    [key: string]: {
      link:
        | { oneofKind: "url"; url: string }
        | { oneofKind: "image"; image: unknown }
        | { oneofKind: "video"; video: unknown }
        | { oneofKind: "file"; file: unknown }
        | { oneofKind: "invalid"; invalid: unknown }
        | { oneofKind: undefined };
      linkExpiresAt?: Date;
      assetId: string;
      preview?: unknown;
    };
  };
};

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeAssets(): void {
  const messages = rootServer.community.channelMessages;

  // Command trigger — the harness sends an upload token as the command argument
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onAssetsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Converts upload tokens into permanent asset URIs. Each token maps to one URI.
// Upload tokens are temporary — convert them promptly and do not persist them.
// The returned map is keyed by the original token, with the asset URI as value.
export async function createAssets(tokens: string[]): Promise<AssetAppCreateResponse> {
  const request: AssetAppCreateRequest = { tokens };
  return rootServer.dataStore.assets.create(request);
}

// Resolves asset URIs to full metadata. The returned map is keyed by URI.
// AssetInformation.link is a discriminated union — check link.oneofKind to
// determine the asset type: "image", "video", "file", "url", or "invalid".
// Link URLs may have an expiry (linkExpiresAt) — do not cache them permanently.
//
// TODO: Once get() is exported, simplify to: rootServer.dataStore.assets.get(request)
export async function getAssets(uris: string[]): Promise<AssetGetResponse> {
  const request: AssetGetRequest = { uris };
  const assets = rootServer.dataStore.assets as any;
  return assets.get(request);
}

// --- COMMAND HANDLER: /server-app-assets ------------------------------------------------
// Expects an upload token as the command argument:
//   /server-app-assets <uploadTokenUri>
//
// Flow: receive token → create (convert to asset URI) → get (resolve metadata)

async function onAssetsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-app-assets")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Parse the upload token from the command argument
    const token = content.replace("/server-app-assets", "").trim();
    if (!token) {
      lines.push("\u2717 usage: /assets <uploadTokenUri>");
      await messages.create({ channelId, content: lines.join("\n") });
      return;
    }

    // 2. Convert upload token to permanent asset URI
    const createResult = await createAssets([token]);
    const assetUri = createResult.assets[token];

    if (!assetUri) {
      lines.push("\u2717 create returned no URI for token");
      await messages.create({ channelId, content: lines.join("\n") });
      return;
    }

    lines.push(`\u2713 asset created: ${assetUri}`);

    // 3. Resolve the asset URI to metadata
    const getResult = await getAssets([assetUri]);
    const info = getResult.assets[assetUri];

    if (!info) {
      lines.push("\u2717 get returned no metadata for URI");
      await messages.create({ channelId, content: lines.join("\n") });
      return;
    }

    // 4. Report link type — AssetInformation.link is a discriminated union
    //    Possible oneofKind values: "image", "video", "file", "url", "invalid"
    const linkType = info.link.oneofKind ?? "unknown";
    lines.push(`\u2713 asset resolved: ${linkType}`);

    // 5. Report asset ID
    lines.push(`\u2713 asset id: ${info.assetId}`);

    // 6. Report expiry status — link URLs may expire, asset URIs do not
    if (info.linkExpiresAt) {
      lines.push(`\u2713 asset has expiry`);
    } else {
      lines.push(`\u2713 asset no expiry`);
    }

    // Asset URIs (root://asset/...) are permanent references. They appear on
    // entities like CommunityEmoji.assetUri, ChannelFile.assetUri, and
    // CommunityMember.profilePictureAssetUri. Use get() to resolve any asset
    // URI to its metadata (type, dimensions, download URLs, etc.).

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NotFound:
          console.error("Asset not found — token may be expired or invalid");
          break;
        case ErrorCodeType.TooManyRequests:
          console.error("Rate limited — queries max ~20 req/s, commands ~5 req/s");
          break;
        default:
          console.error("RootApiException:", err.errorCode);
      }
      lines.push(`\u2717 error: ${err.errorCode}`);
    } else if (err instanceof Error) {
      console.error("Unexpected error:", err.message);
      lines.push(`\u2717 error: ${err.message}`);
    }
    await messages.create({ channelId, content: lines.join("\n") });
  }
}
