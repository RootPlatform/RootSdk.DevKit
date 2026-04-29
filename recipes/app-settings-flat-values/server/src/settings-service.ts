// ============================================================================
// Recipe: App Settings (Flat Values) — RPC service
// SDK: gen-server abstract base, RootServerException, broadcast helpers
// ============================================================================
//
// Two callable RPCs + one broadcast (declared as a third `rpc` in the
// proto, but semantically a broadcast — protobuf-ts uses the same syntax
// for both):
//
//   GetSettings    — anyone. Returns current values + is_admin flag for
//                    the caller. The flag is computed against
//                    globalSettings.general.admins; the client uses it to
//                    gate the Settings form's editability.
//
//   UpdateSettings — admins only. Partial update; missing fields keep
//                    their stored value. After persisting, broadcasts
//                    SettingsChanged so connected clients refetch.
//
//   BroadcastSettingsChanged — broadcast helper exposed by the service
//                              base; called from updateSettings with
//                              audience "all".
// ============================================================================

import { Client } from "@rootsdk/server-app";
import { SettingsServiceBase } from "@appsettingsflatvalues/gen-server";
import {
  GetSettingsRequest,
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from "@appsettingsflatvalues/gen-shared";
import { isAdmin, requireAdmin } from "./admin-check";
import { getSettings, updateSettings } from "./settings-store";

export class SettingsService extends SettingsServiceBase {
  async getSettings(
    _request: GetSettingsRequest,
    client: Client,
  ): Promise<GetSettingsResponse> {
    const [values, callerIsAdmin] = await Promise.all([
      getSettings(),
      isAdmin(client.userId),
    ]);
    return { values, isAdmin: callerIsAdmin };
  }

  async updateSettings(
    request: UpdateSettingsRequest,
    client: Client,
  ): Promise<UpdateSettingsResponse> {
    // Server-side authorization. Throws RootServerException(NOT_ADMIN) for
    // unauthorized callers — the client matches err.code to render a
    // friendly message instead of a generic failure.
    await requireAdmin(client);

    // Partial-update merge happens in the store. Each request field is
    // proto3 `optional`, so undefined here means "don't touch this knob".
    const merged = await updateSettings({
      welcomeMessage: request.welcomeMessage,
      maxItems: request.maxItems,
      showTimestamps: request.showTimestamps,
    });

    // Tell connected clients the values changed. Empty payload — they
    // re-fetch and the response is computed per caller (its own is_admin
    // flag). Audience "all" because we can't predict which clients care;
    // a 3-field payload broadcast to every connection is cheap.
    //
    // Note this only reaches connected CLIENTS, not sibling app-server
    // instances. Service broadcasts go out via the platform's connection
    // layer; app servers don't subscribe to their own service's
    // broadcasts. Cross-instance cache invalidation is out of scope for
    // this recipe (see README "Does NOT cover").
    this.broadcastSettingsChanged({}, "all");

    return { values: merged };
  }
}

export const settingsService = new SettingsService();
