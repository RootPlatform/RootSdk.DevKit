// ============================================================================
// Recipe: App Settings (Per-Context) — Admin authorization
// SDK: rootServer.community.communities, rootServer.globalSettings,
//      ReadOnlyMemberGroup.isMember(), RootServerException
// ============================================================================
//
// Same shape as the same file in app-settings-flat-values and
// app-settings-list-values. Only the error-enum import differs. The
// duplication is a teaching choice — recipes read top-to-bottom; when the
// SDK ships a typed admin helper, all the recipes in the series drop their
// copies.
// ============================================================================

import {
  Client,
  rootServer,
  ReadOnlyMemberGroup,
  RootServerException,
  UserGuid,
} from "@rootsdk/server-app";
import { ChannelConfigsError } from "@appsettingspercontext/gen-shared";

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
      ChannelConfigsError.NOT_ADMIN,
      "Admin only",
    );
  }
}
