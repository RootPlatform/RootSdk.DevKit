import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { initializeAdminCheck, onAdminsChanged } from "./adminCheck";
import { initializePickerStore } from "./pickerStore";
import {
  initializeCommunityRoleSync,
  onPickerConfigChanged,
} from "./communityRoleSync";
import { rolePickerService } from "./rolePickerService";
import { log, errFields } from "./lib/log";

// ============================================================================
// Startup order matters:
//   1. initializeAdminCheck — caches community owner, binds to the
//      globalSettings.general.admins ReadOnlyMemberGroup.
//   2. initializePickerStore — hydrates the in-memory picker config cache
//      from the KV store. Must run before the service registers, since
//      readConfig() throws if the cache hasn't been populated yet.
//   3. initializeCommunityRoleSync — subscribes to CommunityRoleDeleted/Edited
//      so deleted roles are culled from the picker config and renames trigger
//      a re-broadcast.
//   4. onAdminsChanged + onPickerConfigChanged hooks — wire each notification
//      source to the corresponding broadcast.
//   5. addService — registers the RPC surface. Must be called inside
//      onStarting.
// ============================================================================

async function onStarting(state: RootAppStartState): Promise<void> {
  await initializeAdminCheck(state);
  // initializePickerStore reconciles the stored config against the live
  // role universe before the role-event subscription is wired up. There
  // is a tiny window between this completing and initializeCommunityRoleSync
  // subscribing where a CommunityRoleDeleted event could fire and be
  // missed. Self-heals on the next admin save (which calls broadcastConfig
  // → resolveGroups → live role list) or on the next process restart
  // (which re-runs the reconcile). Acceptable trade-off versus the
  // alternative of subscribing first and risking the subscription
  // delivering events while the config cache is still empty.
  await initializePickerStore();
  initializeCommunityRoleSync();

  // notifyAdminsChanged routes through safeBroadcast internally, so any
  // broadcast failure is logged there and never re-thrown — no outer
  // catch needed. `void` discards the returned Promise so the
  // synchronous-callback contract of onAdminsChanged is preserved.
  onAdminsChanged(() => {
    void rolePickerService.notifyAdminsChanged();
  });

  // broadcastConfig also resolves community roles via withRetry which
  // CAN throw on retry exhaustion (separate from the safeBroadcast call
  // it eventually makes). Keep the outer catch here.
  onPickerConfigChanged(() => {
    void rolePickerService.broadcastConfig().catch((err) =>
      log("error", "picker-config-changed broadcast failed", errFields(err)),
    );
  });

  rootServer.lifecycle.addService(rolePickerService);
  log("info", "self-roles service registered; startup complete");
}

(async () => {
  try {
    await rootServer.lifecycle.start(onStarting);
  } catch (err) {
    log("error", "lifecycle.start failed — app did not start", errFields(err));
    throw err;
  }
})();
