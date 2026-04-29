// ============================================================================
// Recipe: Batch-Prefetch Related Data — RPC service
// SDK: gen-server abstract base
// ============================================================================
//
// Two RPCs, both anyone-callable:
//
//   ListActivities  — returns the full seeded list, newest first. The
//                     client uses this to populate the visible feed; it
//                     also provides the actor_id values the next call
//                     resolves in batch.
//
//   BatchGetOwners  — takes a deduplicated array of owner ids and returns
//                     a map keyed by id. The store does the SQL; this
//                     handler converts the Map to the proto's wire-shape
//                     map (a plain object).
//
// No mutations, no admin gate. The recipe is read-only — its lesson is
// purely about how to shape the read endpoints to support efficient
// list-with-references rendering on the client.
// ============================================================================

import { Client } from "@rootsdk/server-app";
import { ActivityServiceBase } from "@databatchprefetch/gen-server";
import {
  Activity as ActivityMessage,
  BatchGetOwnersRequest,
  BatchGetOwnersResponse,
  ListActivitiesRequest,
  ListActivitiesResponse,
  OwnerInfo as OwnerInfoMessage,
} from "@databatchprefetch/gen-shared";
import {
  Activity,
  OwnerInfo,
  batchGetOwners,
  listActivities,
} from "./activity-store";

export class ActivityService extends ActivityServiceBase {
  async listActivities(
    _request: ListActivitiesRequest,
    _client: Client,
  ): Promise<ListActivitiesResponse> {
    const rows = await listActivities();
    return { activities: rows.map(toActivityMessage) };
  }

  async batchGetOwners(
    request: BatchGetOwnersRequest,
    _client: Client,
  ): Promise<BatchGetOwnersResponse> {
    const map = await batchGetOwners(request.ownerIds ?? []);

    // proto3 `map<string, OwnerInfo>` lands as an index-signature object
    // on the wire. Build it by iterating the store's Map. Missing ids
    // simply don't appear in the resulting object — the proto wire format
    // handles absence naturally.
    const owners: { [key: string]: OwnerInfoMessage } = {};
    for (const [id, info] of map) {
      owners[id] = toOwnerInfoMessage(info);
    }
    return { owners };
  }
}

export const activityService = new ActivityService();

function toActivityMessage(row: Activity): ActivityMessage {
  return {
    id: BigInt(row.id),
    action: row.action,
    actorId: row.actor_id,
    occurredAt: row.occurred_at,
  };
}

function toOwnerInfoMessage(row: OwnerInfo): OwnerInfoMessage {
  return {
    id: row.id,
    displayName: row.display_name,
    color: row.color,
  };
}
