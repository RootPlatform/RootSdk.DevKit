// ============================================================================
// Recipe: UI Feature Gating by Role — Entry Point
// Composes: server-global-settings + server-member-roles + networking-app-services
// ============================================================================
//
// Wires up:
//   1. The ViewerService RPC service (clients call GetViewerContext to learn
//      what UI features they can see).
//   2. A "go ask again" broadcast that fires when (a) globalSettings changes
//      or (b) any user's role membership changes. Clients re-fetch on
//      receipt; the response naturally returns flags for the calling user.
//
// The broadcast carries no payload — it's a signal, not a delta. Clients each
// re-fetch and rely on GetViewerContext to compute their own flags. This is
// simpler than per-user targeted broadcasts and the right choice when the
// payload would be tiny (3 booleans) regardless.
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  GlobalSettingsUpdateEvent,
  CommunityMemberRoleEvent,
  CommunityMemberRoleCreatedEvent,
  CommunityMemberRoleDeletedEvent,
} from "@rootsdk/server-app";
import { viewerService } from "./viewer-service";
// Test driver — see test-driver.ts. Forks of this recipe should DELETE
// test-driver.ts and remove this import + the initializeTestDriver() call below.
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  // Register the RPC service. Must happen inside onStarting, before start()
  // resolves — registering after has no effect.
  rootServer.lifecycle.addService(viewerService);

  // Wire the test-only slash-command driver. See test-driver.ts header for why
  // this exists and what to delete when forking. Captures the communityId so
  // the driver can build synthetic Client objects for the test users.
  initializeTestDriver(state.communityId);

  // Broadcast on settings change. The configured moderator role may have
  // moved or been cleared, so every client's `is_moderator` flag is
  // potentially stale.
  // TODO(SDK): GlobalSettingsEvent enum unreleased — swap "update" → GlobalSettingsEvent.Update once it ships
  state.globalSettings?.on("update", onSettingsChanged);

  // Broadcast on role-membership changes. When a user is added to or removed
  // from any role, that user's `is_moderator` may have flipped. We don't
  // know which user is affected without inspecting the event, but since the
  // payload is tiny we just tell every client to re-fetch — each client's
  // response is computed from its own `client.userId` server-side.
  rootServer.community.communityMemberRoles.on(
    CommunityMemberRoleEvent.CommunityMemberRoleCreated,
    onRoleMembershipChanged,
  );
  rootServer.community.communityMemberRoles.on(
    CommunityMemberRoleEvent.CommunityMemberRoleDeleted,
    onRoleMembershipChanged,
  );
}

function onSettingsChanged(_evt: GlobalSettingsUpdateEvent): void {
  viewerService.broadcastRolesChanged({}, "all");
}

function onRoleMembershipChanged(
  _evt: CommunityMemberRoleCreatedEvent | CommunityMemberRoleDeletedEvent,
): void {
  viewerService.broadcastRolesChanged({}, "all");
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
