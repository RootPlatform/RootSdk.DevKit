import {
  rootServer,
  CommunityRoleEvent,
  CommunityRoleDeletedEvent,
  CommunityRoleEditedEvent,
} from "@rootsdk/server-app";
import { readConfig, writeConfig } from "./pickerStore";
import { log, errFields } from "./lib/log";

// ============================================================================
// communityRoleSync — keeps the picker config consistent with the platform's
// view of community roles.
//
// Two events matter:
//
//   CommunityRoleDeleted — a role in our picker just stopped existing.
//   We must cull it: remove the role from any group it appears in, and
//   delete groups that become empty as a result. Without this, members'
//   pickers would show ghost toggles for roles that ToggleRole would then
//   reject. Admins would see stale entries in their Settings tab.
//
//   CommunityRoleEdited — a role's name or color changed. We don't STORE
//   names or colors (they're resolved at response time from communityRoles.list),
//   but already-connected clients have stale text rendered. Broadcast a
//   PickerConfigChanged so they re-render with fresh names.
//
// CommunityRoleCreated and CommunityRoleMoved don't affect us:
//   - Created: a new role isn't in our picker until an admin adds it.
//   - Moved: changes role ordering in the platform; our picker has its
//     own admin-controlled order.
//
// onPickerConfigChanged callback lets the service broadcast PickerConfigChanged
// after we mutate the config or detect a role rename. Multiple subscribers
// are allowed; they fire in registration order. Failures from one don't
// block the others (mirrors adminCheck's pattern).
// ============================================================================

const onChangeCallbacks: Array<() => void> = [];

export function onPickerConfigChanged(cb: () => void): void {
  onChangeCallbacks.push(cb);
}

// Single-flight queue: each role event handler runs to completion before
// the next one starts. Without this, two near-simultaneous role-deleted
// events both `readConfig()` against the same baseline, mutate, and then
// the second `writeConfig()` overwrites the first — losing the first
// role's cull on disk. The promise chain serializes them at the cost of
// a few ms of latency per event, which is fine for an edge-case stream.
//
// Errors don't poison the chain: the catch swallows so the next op still
// runs. Each op also has its own try/catch in the handlers.
let queueTail: Promise<void> = Promise.resolve();

function enqueue(op: () => Promise<void>): void {
  queueTail = queueTail.then(op).catch(() => undefined);
}

function emitChange(): void {
  for (const cb of onChangeCallbacks) {
    try {
      cb();
    } catch (err) {
      log("error", "onPickerConfigChanged subscriber threw", errFields(err));
    }
  }
}

export function initializeCommunityRoleSync(): void {
  rootServer.community.communityRoles.on(
    CommunityRoleEvent.CommunityRoleDeleted,
    (evt) => {
      enqueue(async () => {
        try {
          await onRoleDeleted(evt);
        } catch (err) {
          log("error", "communityRoleSync.onRoleDeleted failed", {
            roleId: evt.communityRoleId,
            ...errFields(err),
          });
        }
      });
    },
  );

  rootServer.community.communityRoles.on(
    CommunityRoleEvent.CommunityRoleEdited,
    (evt) => {
      enqueue(async () => {
        try {
          await onRoleEdited(evt);
        } catch (err) {
          log("error", "communityRoleSync.onRoleEdited failed", {
            roleId: evt.id,
            ...errFields(err),
          });
        }
      });
    },
  );
}

async function onRoleDeleted(evt: CommunityRoleDeletedEvent): Promise<void> {
  const config = readConfig();
  // Walk groups, drop the deleted role from each. We do NOT cull groups
  // that go empty as a result — empty groups are valid state that the
  // admin editor needs to render (so an admin can re-add roles without
  // recreating the group). HomeView filters empty groups for members at
  // render time. See resolveGroups in rolePickerService.ts.
  let touched = false;
  const newGroups = config.groups.map((g) => {
    const filtered = g.roles.filter((r) => r.roleId !== evt.communityRoleId);
    if (filtered.length !== g.roles.length) touched = true;
    return { ...g, roles: filtered };
  });

  if (!touched) return;

  await writeConfig({ groups: newGroups });
  log("info", "picker config culled deleted role", {
    roleId: evt.communityRoleId,
    groupCount: newGroups.length,
  });
  emitChange();
}

async function onRoleEdited(evt: CommunityRoleEditedEvent): Promise<void> {
  // We don't persist names/colors so there's nothing to write back. But
  // already-connected clients have the old name rendered in their picker;
  // emit a change so the service broadcasts a fresh snapshot.
  //
  // Cheap filter: only emit when the edited role is actually in our picker.
  // Otherwise an unrelated role rename would cause every client of every
  // app on the platform to re-render — the SDK's role event is community-
  // wide, not picker-scoped.
  //
  // Slight over-broadcast: the event payload includes name/colorHex but
  // also community/channel-permission and is-mentionable, any of which can
  // trip "edited" without affecting our picker rendering. We could diff
  // against communityRoles.list to only emit on display-relevant changes,
  // but the cost of a redundant re-render is one client refresh against
  // a tiny payload — cheaper than maintaining a parallel cache to diff
  // against. Acceptable trade-off for a sample.
  const config = readConfig();
  const inPicker = config.groups.some((g) =>
    g.roles.some((r) => r.roleId === evt.id),
  );
  if (!inPicker) return;
  emitChange();
}
