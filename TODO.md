- Test with small-scale tasks (ask Claude to determine the tasks based on First-Party Apps)
  - how do I store per-user message count?
  - how do I trigger a daily task to summarize messages in a channel?
  - how do I upload my app?
  - how do I determine whether a member has a role?
  - etc.


## 1. Manifest `roleOrMember` field vs. schema
- **Needed:** The correct manifest field name for a user/role picker that yields a `ReadOnlyMemberGroup`.
- **Looked at:** [`how-to/server-global-settings/root-manifest.json`](Code/RootSdk.DevKit/how-to/server-global-settings/root-manifest.json) uses `roleOrMember` with `selectBehavior: "roleMultiAndUserMulti"`. However [`schemas/root-manifest.app.schema.json`](Code/RootSdk.DevKit/schemas/root-manifest.app.schema.json) defines only `member`, `role`, `roleAndMember` (no `roleOrMember`) and requires a `confirmation` field on every item.
- **Workaround:** Followed the working how-to example (`roleOrMember` / no `confirmation`). The schema and example disagree; I went with the example since it's known to compile and run.

## 3. Proto-to-TypeScript enum naming convention
- **Needed:** How protoc maps `POLL_TYPE_SINGLE`-style enum values.
- **Looked at:** No DevKit doc explains this. Only [`how-to/server-messages`](Code/RootSdk.DevKit/how-to) type enums were visible in how-to code; none of the sample apps define custom enums. The suggestion-box sample has no enums.
- **Workaround:** Built, discovered generated output strips the enum prefix (`POLL_TYPE_SINGLE` → `PollType.SINGLE`), and corrected all call sites. A note on this convention would have saved a full build cycle.

## 4. Platform status of SDK types I used
- **Needed:** Whether `settings['key']?.['subkey']` cast-to-`ReadOnlyMemberGroup` at runtime is safe; what happens when an admin hasn't configured a group yet.
- **Looked at:** [`how-to/server-global-settings/src/global-settings.ts`](Code/RootSdk.DevKit/how-to/server-global-settings/src/global-settings.ts) shows defensive unknown-casting and early-return when the value is missing.
- **Workaround:** Mirrored the defensive pattern in [`permissions.ts`](Test/agent-tests/polling/server/src/permissions.ts). If admins never configure `pollAdmins` or `voters`, permission checks return `false` — so no one can create/vote until admins set these up. That's reasonable default-deny behavior but isn't documented as such.

## 5. Client-side permission hinting
- **Needed:** A way for the client to know if the current user is a poll admin or voter (to hide the "Create Poll" button, grey out vote controls, etc.) without a round-trip.
- **Looked at:** `client-app-users` covers user profiles but not role/permission checks. `networking-app-services` and the protobuf layer don't offer a way to push derived permissions down with user-scoped data.
- **Workaround:** The client shows all controls and lets the server reject forbidden actions with `PollingError.FORBIDDEN`, which becomes a user-friendly error banner. Works correctly but slightly less polished than gating buttons client-side.

## 6. Client restart patterns on stale state
- **Looked at:** The suggestion-box hook calls `rootClient.lifecycle.restart()` on NOT_FOUND / DUPLICATE errors. There's no docs section describing when restarting is preferred over surfacing an error.
- **Workaround:** Chose to surface errors (via the error banner) rather than restart, since a full restart would be jarring for a lost poll in a list of many. No DevKit guidance on this tradeoff.

## 7. `rootsdk.Timestamp` import location for client
- **Needed:** Where to import `Timestamp` on the client.
- **Looked at:** Suggestion-box imports it from `@suggestionbox/gen-shared`. No dedicated docs section.
- **Workaround:** Imported from `@pollingdemo/gen-shared` (same pattern). Worked.

No other gaps encountered. The DevKit's suggestion-box sample was sufficient as a template for nearly everything; the main friction points were enum naming (gap #3) and the `roleOrMember`/schema mismatch (gap #1).

---

# Follow-ups from the sample-as-spec reframe (Apr 2026)

Deferred from the "Reframe DevKit samples from specs to frameworks" change (see [mighty-strolling-forest.md](../../Users/markt/.claude/plans/mighty-strolling-forest.md)). The structural changes landed (AGENTS.md quickstart + Common Needs + per-sample Coverage scope READMEs); these are the items that need more deliberate work.

## A. Sample × how-to coverage matrix in AGENTS.md
- **What:** A table under "Sample Apps" showing which how-tos each sample exercises, with `✗` (not `—`) for concerns the sample's domain should cover but doesn't.
- **Why:** Makes at-a-glance-visible that no single sample is a full template, reinforcing the per-sample README coverage blocks. An agent scanning AGENTS.md sees the gaps before it picks a sample.
- **Why deferred:** Requires a deliberate audit of every sample against every how-to — best done once, correctly, rather than extrapolated.
- **Shape:**

  | Sample | protobuf RPC | SQLite | theme tokens | access-rules | jobs | resilience | users |
  |---|---|---|---|---|---|---|---|
  | hello-world | ✓ | — | — | — | — | — | — |
  | suggestion-box | ✓ | ✓ | ✗ | — | — | ✗ | ✗ |
  | tic-tac-toe | ✓ | ✗ | ✓ | — | — | — | ✗ |
  | themes | — | — | ✓ | — | — | — | — |

## B. Fix sample anti-patterns
- **What:** Rewrite `apps/suggestion-box/client/src/components/SuggestionList/SuggestionList.css` (and any other sample still using hex colors) to use `var(--rootsdk-*)` theme tokens. Audit every non-`themes` sample's CSS.
- **Why:** Samples that demonstrate the wrong pattern train agents toward the wrong pattern — even with the Coverage scope README warning, a direct copy is more magnetic than a caveat. Suggestion-box's README now explicitly says "do not copy this CSS pattern," but the CSS is still there.
- **Why deferred:** The structural changes (reframed AGENTS.md + per-sample READMEs) have to work even when samples are imperfect, because samples drift over time. Fixing sample code is a cleanup pass, not a prerequisite — worth doing, but not blocking.
- **Known targets:**
  - `apps/suggestion-box/client/src/components/SuggestionList/SuggestionList.css` — hex colors throughout
  - Audit other samples (`hello-world`, `data-storage`, `protobuf-service`) for any inline styles or CSS that hardcodes colors