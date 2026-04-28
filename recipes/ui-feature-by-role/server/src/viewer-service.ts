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
    //
    // Read pattern: re-fetch on each call. Fine for the recipe's scope —
    // ownership is stable, so the round-trip is harmless at small call
    // rates. At scale: cache ownerUserId at startup and refresh inside
    // rootServer.community.communities.on(CommunityEvent.CommunityEdited,
    // ...). The same handler can also broadcastRolesChanged so clients
    // refetch their is_owner flag on ownership transfer (which this
    // recipe doesn't currently signal).
    const community = await rootServer.community.communities.get();
    const isOwner = community.ownerUserId === userId;

    // Moderator check. Re-read on each call — rootServer.globalSettings is
    // a live SDK object, so re-reading is free and admins can change the
    // setting at any time. Cast to the leaf type the manifest declared
    // (roleOrMember → ReadOnlyMemberGroup); the SDK's index signature
    // returns GlobalSetting (a union). Undefined when no settings block
    // in manifest, or admin hasn't picked anyone yet.
    //
    // ReadOnlyMemberGroup.memberUserIds includes both directly-assigned
    // users and role-based members. .isMember() does the lookup — no
    // manual role-list traversal needed.
    let isModerator = false;
    const moderatorRole = rootServer.globalSettings?.general?.moderatorRole as
      | ReadOnlyMemberGroup
      | undefined;
    if (moderatorRole) {
      isModerator = await moderatorRole.isMember({ userId });
    }

    return { userId, isModerator, isOwner };
  }
}

// Singleton instance. main.ts passes this to rootServer.lifecycle.addService.
export const viewerService = new ViewerService();
