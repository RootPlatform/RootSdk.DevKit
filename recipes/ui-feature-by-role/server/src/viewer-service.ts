// ============================================================================
// Recipe: UI Feature Gating by Role — ViewerService
// SDK: rootServer.globalSettings, rootServer.community.community,
//      ReadOnlyMemberGroup.isMember()
// ============================================================================
//
// Computes the calling user's "what UI features can they see?" flags. The
// client uses these flags to gate UI visibility ONLY. Action enforcement
// belongs server-side and is recipe #20's lesson, not this one.
//
// Two flags returned, both computed against the calling user (`client.userId`
// — provided by the framework, can't be spoofed):
//
//   - is_owner    — community owner check (always elevated, defence in depth)
//   - is_moderator — caller is in the configured moderator role group
//
// The "configured moderator role" comes from manifest setting
// `general.moderatorRole`, a roleOrMember picker. The platform resolves it
// to a ReadOnlyMemberGroup whose .isMember() does the membership check
// for us — no need to walk the role list manually.
//
// ============================================================================

import {
  Client,
  rootServer,
  ReadOnlyMemberGroup,
} from "@rootsdk/server-app";
import { ViewerServiceBase } from "@uifeaturebyrole/gen-server";
import {
  GetViewerContextRequest,
  GetViewerContextResponse,
} from "@uifeaturebyrole/gen-shared";

export class ViewerService extends ViewerServiceBase {
  async getViewerContext(
    _request: GetViewerContextRequest,
    client: Client,
  ): Promise<GetViewerContextResponse> {
    const userId = client.userId;

    // Owner check first. The community owner is always elevated regardless
    // of moderator-role configuration, so misconfiguring or clearing the
    // moderator setting can't lock the owner out of admin features.
    const community = await rootServer.community.communities.get();
    const isOwner = community.ownerUserId === userId;

    // Moderator check. The roleOrMember picker resolves to a
    // ReadOnlyMemberGroup whose `memberUserIds` already includes both
    // directly-assigned users and role-based members. .isMember() does the
    // lookup; no manual role-list traversal needed.
    let isModerator = false;
    const moderatorRole = readModeratorRoleSetting();
    if (moderatorRole) {
      isModerator = await moderatorRole.isMember({ userId });
    }

    return { userId, isModerator, isOwner };
  }
}

// Reads `general.moderatorRole` from globalSettings and returns the
// ReadOnlyMemberGroup, or undefined if the setting is missing/cleared.
//
// We re-read on every request rather than caching at startup because admins
// can change the setting at any time. The platform resolves role membership
// inside the group itself, so reading is cheap.
function readModeratorRoleSetting(): ReadOnlyMemberGroup | undefined {
  const settings = rootServer.globalSettings;
  if (!settings) return undefined;

  const raw: unknown = settings["general"]?.["moderatorRole"];
  if (raw && typeof raw === "object" && "memberUserIds" in raw) {
    return raw as ReadOnlyMemberGroup;
  }
  return undefined;
}

// Singleton instance. main.ts passes this to rootServer.lifecycle.addService.
export const viewerService = new ViewerService();
