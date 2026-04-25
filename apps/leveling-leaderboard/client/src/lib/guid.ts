import { RootGuidUtils, RootGuidType } from "@rootsdk/client-app";

// ============================================================================
// Guid helpers for the client.
//
// The RootUserRoleSelector component from @rootsdk/client-app-ui lists both
// human members (Person) and apps/bots (App). It exposes no filter prop, so
// we validate the chosen ID in the selection handler and reject non-persons
// with an inline error — apps/bots can't be admins or have XP to reset.
//
// Upstream follow-up: proposing a `filter="persons"` prop on UserRoleSelector
// would remove the need for every app to roll this client-side check.
// ============================================================================

export function isPersonId(userId: string): boolean {
  return RootGuidUtils.toRootGuidType(userId) === RootGuidType.Person;
}
