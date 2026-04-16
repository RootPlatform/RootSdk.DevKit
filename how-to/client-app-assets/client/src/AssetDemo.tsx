// ============================================================================
// How-To: Client Assets — AssetDemo Component
// SDK: rootClient.assets — file uploads, asset URLs, image resolutions
//      uploadServiceClient — RPC call to submit upload token to server
// ============================================================================
//
// Full upload flow:
//   1. rootClient.assets.fileUpload()          — open picker, upload file
//   2. rootClient.assets.toUploadImagePreview() — preview the upload (images only)
//   3. uploadServiceClient.submitUpload()      — send token to server via RPC
//   4. Server converts token → permanent asset URI, posts channel message
//   5. Client displays the image using toImageUrl()
//
// Also demonstrates:
//   - rootClient.assets.toUrl(uri)             — convert asset URI to URL
//   - rootClient.assets.toImageUrl(uri, res)   — get image at specific resolution
//
// Types:
//   - FileUploadType: "all" | "text" | "imageAll" | "pdf"
//   - FileUploadRequest: { fileType, multiple?, windowTitle? }
//   - FileUploadResponse: { tokens: string[] }
//   - ImageUriResolution: "original" | "large" | "medium" | "small"
//
// ============================================================================

import React, { useState, useCallback } from "react";

import {
  rootClient,
  FileUploadResponse,
  RootServerException,
} from "@rootsdk/client-app";

import type {
  FileUploadType,
  FileUploadRequest,
  ImageUriResolution,
} from "@rootsdk/client-app";

// Generated RPC client — import and call directly (no setup needed).
import { uploadServiceClient } from "@clientassets/gen-client";

// Shared types from proto — used by both server and client.
import {
  SubmitUploadRequest,
  SubmitUploadResponse,
  UploadError,
} from "@clientassets/gen-shared";

// --- HELPERS -----------------------------------------------------------------

// All valid file type filters for the upload picker.
const FILE_TYPES: FileUploadType[] = ["all", "text", "imageAll", "pdf"];

// All valid image resolutions for toImageUrl.
const IMAGE_RESOLUTIONS: ImageUriResolution[] = [
  "original",
  "large",
  "medium",
  "small",
];

// --- COMPONENT ---------------------------------------------------------------

export const AssetDemo: React.FC = () => {
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // --- Full upload flow ------------------------------------------------------
  // 1. fileUpload → 2. preview → 3. submitUpload RPC → 4. display image

  async function handleUploadFlow(fileType: FileUploadType) {
    // Step 1: Open the file picker and upload.
    // fileUpload() opens the platform's native file picker filtered by type.
    // Returns upload tokens (temporary, identity-scoped).
    const request: FileUploadRequest = {
      fileType,
      multiple: false,
      windowTitle: `Upload ${fileType} file`,
    };

    let tokens: string[];
    try {
      const response: FileUploadResponse =
        await rootClient.assets.fileUpload(request);
      tokens = response.tokens;
      addLog(`fileUpload(${fileType}): ${tokens.length} token(s)`);
    } catch (err: unknown) {
      addLog(`fileUpload error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (tokens.length === 0) {
      addLog("No files selected");
      return;
    }

    // Step 2: Preview the upload (images only).
    // toUploadImagePreview returns a temporary URL for just-uploaded images.
    // Returns undefined for non-image uploads.
    const preview: string | undefined = rootClient.assets.toUploadImagePreview(tokens[0]);
    setPreviewUrl(preview);
    addLog(
      `toUploadImagePreview: ${preview ? "preview available" : "no preview (non-image)"}`,
    );

    // Step 3: Send the token to the server via RPC.
    // The server converts the temporary token to a permanent asset URI
    // using dataStore.assets.create() and persists it in the key-value store.
    try {
      const submitRequest: SubmitUploadRequest = { token: tokens[0] };
      const result: SubmitUploadResponse = await uploadServiceClient.submitUpload(submitRequest);
      setAssetUri(result.assetUri);
      addLog(
        `submitUpload: uri=${result.assetUri} type=${result.assetType}`,
      );

      // Step 4: Display the image at different resolutions.
      // toImageUrl converts a permanent asset URI to an HTTP URL at the
      // requested resolution. Use "small" for thumbnails, "medium" for
      // previews, "original" for full quality.
      const urls: Record<string, string> = {};
      for (const resolution of IMAGE_RESOLUTIONS) {
        urls[resolution] = rootClient.assets.toImageUrl(
          result.assetUri,
          resolution,
        );
      }
      setImageUrls(urls);
      addLog(
        `toImageUrl: generated ${Object.keys(urls).length} resolution URLs`,
      );
    } catch (err: unknown) {
      if (err instanceof RootServerException) {
        switch (err.code) {
          case UploadError.INVALID_TOKEN:
            addLog("Server: invalid upload token");
            break;
          case UploadError.CONVERSION_FAILED:
            addLog(`Server: conversion failed — ${err.message}`);
            break;
          default:
            addLog(`Server error: code=${err.code} ${err.message}`);
        }
      } else if (err instanceof Error) {
        addLog(`submitUpload error: ${err.message}`);
      }
    }
  }

  // --- toUrl demo ------------------------------------------------------------

  function demonstrateToUrl() {
    if (!assetUri) {
      addLog("No asset URI yet — upload a file first");
      return;
    }
    // toUrl converts an asset URI (root:// scheme) to a displayable HTTP URL.
    // Handles null/undefined gracefully (returns empty string).
    const url: string = rootClient.assets.toUrl(assetUri);
    addLog(`toUrl -> "${url}"`);

    // Null safety — toUrl returns "" for null/undefined
    const nullResult: string = rootClient.assets.toUrl(null);
    addLog(`toUrl(null) -> "${nullResult}"`);
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>Asset Upload Flow</h2>

      {/* Upload buttons — one per file type filter */}
      <h3>1. Upload File</h3>
      <div style={{ display: "flex", gap: 8 }}>
        {FILE_TYPES.map((type) => (
          <button key={type} onClick={() => handleUploadFlow(type)}>
            Upload: {type}
          </button>
        ))}
      </div>

      {/* Upload preview (temporary, before server conversion) */}
      {previewUrl && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Upload preview:</div>
          <img
            src={previewUrl}
            alt="Upload preview"
            style={{ maxWidth: 200, marginTop: 4 }}
          />
        </div>
      )}

      {/* Permanent asset display at different resolutions */}
      {assetUri && Object.keys(imageUrls).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3>2. Display Asset</h3>
          <div style={{ fontSize: 12, color: "#666" }}>
            Asset URI: {assetUri}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {IMAGE_RESOLUTIONS.map((res) => (
              <div key={res} style={{ textAlign: "center" }}>
                <img
                  src={imageUrls[res]}
                  alt={`${res} resolution`}
                  style={{ maxWidth: res === "small" ? 64 : res === "medium" ? 128 : 256 }}
                />
                <div style={{ fontSize: 11, color: "#999" }}>{res}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URL conversion */}
      {assetUri && (
        <div style={{ marginTop: 12 }}>
          <h3>3. URL Conversion</h3>
          <button onClick={demonstrateToUrl}>toUrl()</button>
        </div>
      )}

      {/* Event log */}
      <h3>Log</h3>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          background: "#f5f5f5",
          padding: 8,
          maxHeight: 200,
          overflow: "auto",
        }}
      >
        {log.map((entry, i) => (
          <div key={i}>{entry}</div>
        ))}
      </div>
    </div>
  );
};
