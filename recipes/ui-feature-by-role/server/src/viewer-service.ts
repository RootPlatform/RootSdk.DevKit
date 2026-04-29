// ============================================================================
// Recipe: UI Feature Gating by Role — ViewerService
// SDK: rootServer.globalSettings, rootServer.community.community,
//      ReadOnlyMemberGroup.isMember(), RootServerException
// ============================================================================
//
// Two responsibilities, both around the configured moderator role:
//
//   1. getViewerContext — informational query. Returns is_owner / is_moderator
//      flags so the client can gate UI visibility. Never trusted as a security
//      boundary; it just shapes the UX.
//
//   2. getModeratorReport — moderator-only action. Server independently
//      enforces the role check and throws RootServerException(NOT_MODERATOR)
//      for unauthorized callers. This is the security boundary; the client's
//      hide-the-button is just polish on top.
//
// Both methods compute the role check the same way, against the calling user
// (`client.userId` — provided by the framework, can't be spoofed):
//
//   - Community owner is always elevated regardless of moderator-role
//     configuration, so misconfiguring or clearing the setting can't lock
//     the owner out.
//   - Otherwise, look up `rootServer.globalSettings.general.moderatorRole`
//     (a ReadOnlyMemberGroup populated from the manifest's roleOrMember
//     picker) and call .isMember() on the calling userId.
//
// The check is duplicated rather than extracted into a shared helper so the
// recipe reads top-to-bottom — each method shows the full pattern.
//
// ============================================================================

import {
  Client,
  rootServer,
  ReadOnlyMemberGroup,
  RootServerException,
} from "@rootsdk/server-app";
import { ViewerServiceBase } from "@uifeaturebyrole/gen-server";
import {
  GetViewerContextRequest,
  GetViewerContextResponse,
  GetModeratorReportRequest,
  GetModeratorReportResponse,
  ViewerError,
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

    // Moderator check. Skip when the caller is already the owner — owners
    // are elevated regardless, so the membership lookup would change
    // nothing. Mirrors the short-circuit in getModeratorReport so the
    // two methods compute the role decision identically.
    //
    // Re-read on each call — rootServer.globalSettings is a live SDK
    // object, so re-reading is free and admins can change the setting at
    // any time. Cast to the leaf type the manifest declared
    // (roleOrMember → ReadOnlyMemberGroup); the SDK's index signature
    // returns GlobalSetting (a union). Undefined when no settings block
    // in manifest, or admin hasn't picked anyone yet.
    //
    // ReadOnlyMemberGroup.memberUserIds includes both directly-assigned
    // users and role-based members. .isMember() does the lookup — no
    // manual role-list traversal needed.
    let isModerator = false;
    if (!isOwner) {
      const moderatorRole = rootServer.globalSettings?.general?.moderatorRole as
        | ReadOnlyMemberGroup
        | undefined;
      if (moderatorRole) {
        isModerator = await moderatorRole.isMember({ userId });
      }
    }

    return { userId, isModerator, isOwner };
  }

  /**
   * Moderator-only action. Authorizes the caller, then returns a (toy)
   * report. Non-moderators get a typed RootServerException with code
   * ViewerError.NOT_MODERATOR — clients can match `instanceof
   * RootServerException` and switch on `err.code` to render a friendly
   * message instead of a generic failure.
   *
   * Authorization mirrors getViewerContext: owner OR moderator-role member.
   * The owner case ensures admins can never lock themselves out by clearing
   * the moderator setting. The order — owner first — is intentional so that
   * owners pay the cheaper community fetch instead of the membership lookup.
   *
   * Note we re-check authorization on every call rather than caching a flag
   * from a prior getViewerContext response. The two RPCs are independent;
   * a stale flag from an earlier call could let a demoted moderator slip
   * through. Always derive the security decision from current state.
   */
  async getModeratorReport(
    _request: GetModeratorReportRequest,
    client: Client,
  ): Promise<GetModeratorReportResponse> {
    const userId = client.userId;

    const community = await rootServer.community.communities.get();
    const isOwner = community.ownerUserId === userId;

    let isModerator = false;
    if (!isOwner) {
      const moderatorRole = rootServer.globalSettings?.general?.moderatorRole as
        | ReadOnlyMemberGroup
        | undefined;
      if (moderatorRole) {
        isModerator = await moderatorRole.isMember({ userId });
      }
    }

    if (!isOwner && !isModerator) {
      throw new RootServerException(
        ViewerError.NOT_MODERATOR,
        "Moderator-only action",
      );
    }

    // Stand-in payload. Real recipes would return e.g. a list of reported
    // messages, an audit log, or whatever moderation data the feature needs.
    return { data: "moderator-only payload" };
  }
}

// Singleton instance. main.ts passes this to rootServer.lifecycle.addService.
export const viewerService = new ViewerService();
