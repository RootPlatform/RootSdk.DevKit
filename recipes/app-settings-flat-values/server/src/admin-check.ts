// ============================================================================
// Recipe: App Settings (Flat Values) — Admin authorization
// SDK: rootServer.community.communities, rootServer.globalSettings,
//      ReadOnlyMemberGroup.isMember(), RootServerException
// ============================================================================
//
// Two helpers, both pivoting on the same role check:
//
//   isAdmin(userId)        — boolean. Used by GetSettings to populate
//                            the response's is_admin flag so the client
//                            can render the form in editable vs read-only
//                            mode without a separate RPC.
//
//   requireAdmin(client)   — throws RootServerException(NOT_ADMIN) on
//                            failure. Used by every mutation RPC to
//                            enforce authorization server-side. Same
//                            decision, throwing form.
//
// Authorization rules:
//
//   - The community owner is always elevated, regardless of the admins
//     setting. Defense in depth — clearing the picker can't lock the
//     owner out.
//   - Otherwise, check membership in the configured admins picker
//     (manifest setting general.admins, a roleOrMember). The platform
//     resolves it to a ReadOnlyMemberGroup whose .isMember() does the
//     lookup against both directly-assigned users and role-based members.
//
// We re-check on every privileged call rather than caching a flag from a
// prior GetSettings response. A user demoted between two clicks must see
// the next write rejected; a stale flag from earlier would let it through.
// Always derive the security decision from current state.
// ============================================================================

import {
  Client,
  rootServer,
  ReadOnlyMemberGroup,
  RootServerException,
  UserGuid,
} from "@rootsdk/server-app";
import { SettingsError } from "@appsettingsflatvalues/gen-shared";

export async function isAdmin(userId: UserGuid): Promise<boolean> {
  const community = await rootServer.community.communities.get();
  if (community.ownerUserId === userId) return true;

  const adminsGroup = rootServer.globalSettings?.general?.admins as
    | ReadOnlyMemberGroup
    | undefined;
  if (!adminsGroup) return false;
  return adminsGroup.isMember({ userId });
}

export async function requireAdmin(client: Client): Promise<void> {
  const ok = await isAdmin(client.userId);
  if (!ok) {
    throw new RootServerException(
      SettingsError.NOT_ADMIN,
      "Admin only",
    );
  }
}
