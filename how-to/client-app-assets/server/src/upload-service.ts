// ============================================================================
// How-To: Client Assets — UploadService (Server)
// SDK: dataStore.assets.create — convert upload tokens to permanent asset URIs
//      dataStore.appData — persist asset URIs for later retrieval
// ============================================================================
//
// Server side of the client upload flow:
//   1. Client calls rootClient.assets.fileUpload() → gets upload token
//   2. Client sends token to server via RPC (SubmitUpload)
//   3. Server converts token to permanent asset URI via dataStore.assets.create()
//   4. Server persists the asset URI in the key-value store
//   5. Server returns the asset URI to the client for display
//
// Upload tokens are temporary — convert them to asset URIs promptly.
// Asset URIs (root://asset/...) are permanent and safe to store.
//
// ============================================================================

import {
  rootServer,
  RootServerException,
  RootApiException,
  AssetAppCreateRequest,
  AssetAppCreateResponse,
  AssetGetRequest,
  AssetGetResponse,
  AssetInformation,
  KeyValue,
} from "@rootsdk/server-app";

import { UploadServiceBase } from "@clientassets/gen-server";

import {
  SubmitUploadRequest,
  SubmitUploadResponse,
  UploadError,
} from "@clientassets/gen-shared";

import type { Client } from "@rootsdk/server-app";

// Key prefix for persisted asset URIs in the key-value store.
const ASSET_KEY_PREFIX = "upload:";

class UploadService extends UploadServiceBase {
  async submitUpload(
    request: SubmitUploadRequest,
    client: Client,
  ): Promise<SubmitUploadResponse> {
    if (!request.token) {
      throw new RootServerException(
        UploadError.INVALID_TOKEN,
        "Upload token is required",
      );
    }

    // Step 1: Convert the upload token to a permanent asset URI.
    // dataStore.assets.create() takes an array of tokens and returns a map
    // of token → asset URI. Tokens are temporary — convert them promptly.
    let assetUri: string;
    try {
      const createRequest: AssetAppCreateRequest = { tokens: [request.token] };
      const result: AssetAppCreateResponse = await rootServer.dataStore.assets.create(createRequest);
      const uri: string | undefined = result.assets[request.token];
      if (!uri) {
        throw new RootServerException(
          UploadError.CONVERSION_FAILED,
          "Token conversion returned no URI",
        );
      }
      assetUri = uri;
    } catch (err: unknown) {
      if (err instanceof RootServerException) throw err;
      if (err instanceof RootApiException) {
        throw new RootServerException(
          UploadError.CONVERSION_FAILED,
          `Failed to convert token: ${err.errorCode} ${err.message}`,
        );
      }
      throw new RootServerException(
        UploadError.CONVERSION_FAILED,
        `Failed to convert token: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Step 2: Resolve asset metadata to determine the type.
    let assetType = "unknown";
    try {
      const getRequest: AssetGetRequest = { uris: [assetUri] };
      const metadata: AssetGetResponse = await rootServer.dataStore.assets.get(getRequest);
      const info: AssetInformation | undefined = metadata.assets[assetUri];
      if (info?.link?.oneofKind) {
        assetType = info.link.oneofKind;
      }
    } catch (err: unknown) {
      // Metadata resolution is best-effort — don't fail the upload.
      console.warn("Asset metadata resolution failed:", err instanceof Error ? err.message : String(err));
    }

    // Step 3: Persist the asset URI.
    // Asset URIs are permanent references — store them, not the upload tokens.
    // Here we use the key-value store keyed by the uploader's user ID.
    // In a real app you might store this in a database row, on a user profile,
    // or as part of a document/post entity.
    const key: string = ASSET_KEY_PREFIX + client.userId;
    const entry: KeyValue<string> = { key, value: assetUri };
    await rootServer.dataStore.appData.set(entry);

    return { assetUri, assetType };
  }
}

export const uploadService = new UploadService();
