// ============================================================================
// Recipe: App Settings (List Values) — RPC service
// SDK: gen-server abstract base, RootServerException, broadcast helpers
// ============================================================================
//
// Two callable RPCs + one mutation RPC + one broadcast (declared as a fourth
// `rpc` in the proto, but semantically a broadcast):
//
//   ListBlockedTerms   — anyone. Returns the full list + is_admin flag.
//   AddBlockedTerm     — admin-only. Validates + inserts; returns full list.
//   RemoveBlockedTerm  — admin-only. Deletes by id; returns full list.
//   BroadcastBlockedTermsChanged — broadcast helper, called from each
//                                  mutation with audience "all".
//
// Each successful mutation broadcasts BlockedTermsChanged so every
// connected client refetches. Only reaches connected CLIENTS, not sibling
// app-server instances — see the prior recipe in this series for the
// scope discussion.
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";
import { BlockedTermsServiceBase } from "@appsettingslistvalues/gen-server";
import {
  ListBlockedTermsRequest,
  ListBlockedTermsResponse,
  AddBlockedTermRequest,
  AddBlockedTermResponse,
  RemoveBlockedTermRequest,
  RemoveBlockedTermResponse,
  BlockedTermsError,
  BlockedTerm as BlockedTermMessage,
} from "@appsettingslistvalues/gen-shared";
import { isAdmin, requireAdmin } from "./admin-check";
import {
  addTerm,
  listTerms,
  removeTerm,
  InvalidTermError,
  type BlockedTerm,
} from "./blocked-terms-store";

export class BlockedTermsService extends BlockedTermsServiceBase {
  async listBlockedTerms(
    _request: ListBlockedTermsRequest,
    client: Client,
  ): Promise<ListBlockedTermsResponse> {
    const [rows, callerIsAdmin] = await Promise.all([
      listTerms(),
      isAdmin(client.userId),
    ]);
    return { terms: rows.map(toMessage), isAdmin: callerIsAdmin };
  }

  async addBlockedTerm(
    request: AddBlockedTermRequest,
    client: Client,
  ): Promise<AddBlockedTermResponse> {
    await requireAdmin(client);

    let rows: BlockedTerm[];
    try {
      rows = await addTerm(request.term);
    } catch (err) {
      if (err instanceof InvalidTermError) {
        throw new RootServerException(
          BlockedTermsError.INVALID_TERM,
          err.message,
        );
      }
      throw err;
    }

    this.broadcastBlockedTermsChanged({}, "all");
    return { terms: rows.map(toMessage) };
  }

  async removeBlockedTerm(
    request: RemoveBlockedTermRequest,
    client: Client,
  ): Promise<RemoveBlockedTermResponse> {
    await requireAdmin(client);

    // request.id is uint64 on the wire → bigint on the TS side. SQLite's
    // INTEGER fits 64-bit ids fine, but our column is INTEGER PRIMARY KEY
    // AUTOINCREMENT, which in practice issues 32-bit-friendly ids. Convert
    // to Number for the query parameter; the safe-integer ceiling is far
    // beyond the row counts a settings list realistically reaches. Throw
    // on overflow rather than silently truncating — an id beyond
    // MAX_SAFE_INTEGER is a client-side bug, not a real id we should
    // accept.
    if (request.id > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RootServerException(
        BlockedTermsError.UNSPECIFIED,
        `id ${request.id} exceeds safe-integer range`,
      );
    }
    const id = Number(request.id);
    const rows = await removeTerm(id);

    this.broadcastBlockedTermsChanged({}, "all");
    return { terms: rows.map(toMessage) };
  }
}

export const blockedTermsService = new BlockedTermsService();

function toMessage(row: BlockedTerm): BlockedTermMessage {
  return {
    id: BigInt(row.id),
    term: row.term,
    addedAt: row.added_at,
  };
}
