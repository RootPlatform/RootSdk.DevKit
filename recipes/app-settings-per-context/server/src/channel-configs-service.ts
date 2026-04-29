// ============================================================================
// Recipe: App Settings (Per-Context) — RPC service
// SDK: gen-server abstract base, RootServerException, broadcast helpers
// ============================================================================
//
// Three callable RPCs + one broadcast (declared as a fourth `rpc` in the
// proto, but semantically a broadcast):
//
//   ListChannelConfigs    — anyone. Full list + is_admin flag.
//   UpsertChannelConfig   — admin-only. Insert or full-replace by
//                           channel_id; broadcasts on success.
//   DeleteChannelConfig   — admin-only. Idempotent remove; broadcasts on
//                           success even when the row didn't exist (no-op
//                           is still observable to clients refreshing).
//   BroadcastChannelConfigsChanged — broadcast helper, audience "all".
//
// Validation errors from the store map to typed proto rejections so the
// client can match err.code instead of parsing messages.
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";
import { ChannelConfigsServiceBase } from "@appsettingspercontext/gen-server";
import {
  ChannelConfig as ChannelConfigMessage,
  ChannelConfigsError,
  DeleteChannelConfigRequest,
  DeleteChannelConfigResponse,
  ListChannelConfigsRequest,
  ListChannelConfigsResponse,
  UpsertChannelConfigRequest,
  UpsertChannelConfigResponse,
} from "@appsettingspercontext/gen-shared";
import { isAdmin, requireAdmin } from "./admin-check";
import {
  ChannelConfig,
  InvalidChannelIdError,
  InvalidPriorityError,
  deleteConfig,
  listConfigs,
  upsertConfig,
} from "./channel-configs-store";

export class ChannelConfigsService extends ChannelConfigsServiceBase {
  async listChannelConfigs(
    _request: ListChannelConfigsRequest,
    client: Client,
  ): Promise<ListChannelConfigsResponse> {
    const [rows, callerIsAdmin] = await Promise.all([
      listConfigs(),
      isAdmin(client.userId),
    ]);
    return { configs: rows.map(toMessage), isAdmin: callerIsAdmin };
  }

  async upsertChannelConfig(
    request: UpsertChannelConfigRequest,
    client: Client,
  ): Promise<UpsertChannelConfigResponse> {
    await requireAdmin(client);

    let saved: ChannelConfig;
    try {
      saved = await upsertConfig(
        request.channelId,
        request.enabled,
        request.priority,
      );
    } catch (err) {
      // Map the store's typed validation errors to the proto's typed
      // rejections. Without these catches the errors escape as untyped
      // server errors and the client loses the ability to match err.code.
      if (err instanceof InvalidChannelIdError) {
        throw new RootServerException(
          ChannelConfigsError.INVALID_CHANNEL_ID,
          err.message,
        );
      }
      if (err instanceof InvalidPriorityError) {
        throw new RootServerException(
          ChannelConfigsError.INVALID_PRIORITY,
          err.message,
        );
      }
      throw err;
    }

    this.broadcastChannelConfigsChanged({}, "all");
    return { config: toMessage(saved) };
  }

  async deleteChannelConfig(
    request: DeleteChannelConfigRequest,
    client: Client,
  ): Promise<DeleteChannelConfigResponse> {
    await requireAdmin(client);

    try {
      await deleteConfig(request.channelId);
    } catch (err) {
      if (err instanceof InvalidChannelIdError) {
        throw new RootServerException(
          ChannelConfigsError.INVALID_CHANNEL_ID,
          err.message,
        );
      }
      throw err;
    }

    this.broadcastChannelConfigsChanged({}, "all");
    return {};
  }
}

export const channelConfigsService = new ChannelConfigsService();

function toMessage(row: ChannelConfig): ChannelConfigMessage {
  return {
    channelId: row.channel_id,
    enabled: row.enabled,
    priority: row.priority,
    updatedAt: row.updated_at,
  };
}
