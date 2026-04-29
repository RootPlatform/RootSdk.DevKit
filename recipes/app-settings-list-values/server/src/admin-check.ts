// ============================================================================
// Recipe: App Settings (List Values) — Admin authorization
// SDK: rootServer.community.communities, rootServer.globalSettings,
//      ReadOnlyMemberGroup.isMember(), RootServerException
// ============================================================================
//
// Two helpers:
//
//   isAdmin(userId)        — boolean. Used by ListBlockedTerms to populate
//                            the response's is_admin flag.
//   requireAdmin(client)   — throws RootServerException(NOT_ADMIN) on
//                            failure. Used by every mutation RPC.
//
// Authorization rules (same as the prior recipe in the settings series):
//   - The community owner is always elevated regardless of the admins
//     setting. Defense in depth.
//   - Otherwise, check membership in globalSettings.general.admins
//     (manifest setting, a roleOrMember picker).
//
// This file is intentionally near-identical to the same file in
// app-settings-flat-values — only the error-enum import differs. When the
// SDK ships a typed admin helper, all three recipes in the series drop
// their copies. Until then, the duplication is a teaching choice — recipes
// read top-to-bottom without cross-recipe imports.
// ============================================================================

import {
  Client,
  rootServer,
  ReadOnlyMemberGroup,
  RootServerException,
  UserGuid,
} from "@rootsdk/server-app";
import { BlockedTermsError } from "@appsettingslistvalues/gen-shared";

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
      BlockedTermsError.NOT_ADMIN,
      "Admin only",
    );
  }
}
