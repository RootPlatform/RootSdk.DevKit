# DevKit Automated Evaluation Plan

Automated pipeline to measure DevKit quality: give an agent a bot spec, let it build using only DevKit, then score the result.

## Overview

```
Spec → Agent generates bot → Static checks → Portal create → Publish → Deploy to community → Live tests → Score → Record → Portal delete
```

## Phases

### Phase 1: Manual baseline

Run each of the 5 bot specs through a Claude Code session manually. Constrain the agent to DevKit-only resources. Evaluate results by hand. Record what the agent got right and wrong. This establishes the scoring rubric and identifies the most common failure modes.

Inputs:
- 5 bot spec files (DOCS/spec-*.md)
- DevKit repo (as-is)
- A target output directory

Process:
- Open a new Claude Code session
- Paste the spec + "Only use C:\Root\Code\RootSdk.DevKit for context"
- Let the agent build the bot
- Manually check: does it build? Correct structure? Right imports? Right permissions? Right patterns?
- Record findings per bot

Outputs:
- Per-bot scoring rubric (what to check, how to score it)
- DevKit gap list (what the agent couldn't find or got wrong)

### Phase 2: Tier 1 — automated static evaluation

Build a script that takes an agent-generated bot directory and scores it without deploying.

Checks:
1. **Structure** — required files exist (root-manifest.json, package.json, tsconfig.json, src/main.ts)
2. **Build** — `npm install && npm run build` exits 0
3. **Imports** — source files import from `@rootsdk/server-bot` (not server-app, not server-multi)
4. **Manifest permissions** — root-manifest.json contains the permissions required by the spec
5. **Pattern checks** — static analysis for known gotchas:
   - Uses `communityMembers.get()` before constructing user mentions
   - Has error handling (try/catch with RootApiException)
   - Subscribes to the correct events
   - Calls `lifecycle.start()` in main.ts
   - Ignores system messages (`MessageType.System` check)

Scoring:
- Each check is pass/fail
- Tier 1 score = passed / total checks
- A bot that doesn't build scores 0 on all downstream checks

Infrastructure needed:
- A scoring script (TypeScript or bash) that runs checks against a directory
- A results format (JSON) for recording scores

### Phase 3: Tier 2 — automated live evaluation

Build a test harness that deploys the agent-generated bot to a real Root community and verifies its behavior.

Pipeline per bot:
1. **Create app** — `app-creator.createApp()` registers a new bot on the DevPortal
2. **Patch manifest** — inject the new appId into the bot's root-manifest.json
3. **Publish** — `app-publisher` builds and releases the bot to the DevPortal
4. **Provision community** — `community-builder` creates a test community from a JSON template (channels, roles, users per the bot's test environment spec)
5. **Install bot** — community-builder installs the published bot into the test community
6. **Install observer** — install the existing app-sdk-test-observer to capture all platform events
7. **Simulate user actions** — harness performs the actions defined in the bot's acceptance criteria (user joins, sends messages, reacts, etc.) using provisioned test users
8. **Wait + collect** — pause for the bot to respond (up to configured timeout per test)
9. **Validate** — check that expected messages, role assignments, channel creations, etc. occurred
10. **Score** — per acceptance criterion: pass/fail
11. **Record** — write Tier 2 results to the same JSON results file
12. **Teardown** — destroy the test community, `app-creator.deleteApp()` removes the bot from the portal

Infrastructure needed:
- Community templates (JSON) for each of the 5 bot test environments
- Test actions + validators for each bot's acceptance criteria
- Orchestration script that runs the full pipeline
- Timeout + retry logic for bot response windows

### Phase 4: End-to-end orchestration

Combine generation + evaluation into a single automated run.

Pipeline:
1. **Generate** — programmatically launch a Claude Code session with the bot spec + DevKit constraint, capture output directory
2. **Evaluate Tier 1** — run static checks, record scores
3. **Evaluate Tier 2** — run live tests (only if Tier 1 build passes), record scores
4. **Cleanup** — delete the generated bot directory, delete the portal app, destroy the test community
5. **Report** — aggregate scores across all 5 bots into a single DevKit quality report

Run modes:
- **Single bot**: generate + evaluate one spec (for debugging)
- **Full suite**: generate + evaluate all 5 specs (for DevKit releases)
- **Re-evaluate only**: skip generation, evaluate a previously generated bot (for harness debugging)

### Phase 5: Regression tracking

Store scores over time to measure DevKit improvement.

- Each run produces a timestamped results file
- Results include: DevKit git commit, bot spec version, Tier 1 scores, Tier 2 scores, failure details
- A simple comparison script shows score deltas between runs
- Goal: every DevKit change should maintain or improve scores across all 5 bots

## Dependencies

| Component | Location | Status |
|-----------|----------|--------|
| app-creator | `Ops.Testing/packages/app-creator/` | Exists |
| app-publisher | `Ops.Testing/packages/app-publisher/` | Exists |
| community-builder | `Ops.Testing/packages/community-builder/` | Exists |
| app-sdk-test-observer | `Ops.Testing/test-server-multi/apps/app-sdk-test-observer/` | Exists |
| Bot specs | `RootSdk.DevKit/DOCS/spec-*.md` | Exists |
| Community templates (per bot) | TBD | Not started |
| Tier 1 scoring script | TBD | Not started |
| Tier 2 test actions + validators | TBD | Not started |
| Orchestration script | TBD | Not started |
| Results format + storage | TBD | Not started |

## Build Order

1. Phase 1 (manual baseline) — no code needed, just run and observe
2. Phase 2 (Tier 1 static checks) — small standalone script, high value, fast iteration
3. Phase 3 (Tier 2 live tests) — depends on community templates + validator work
4. Phase 4 (end-to-end) — glue code connecting generation to evaluation
5. Phase 5 (regression) — lightweight, added once the pipeline stabilizes
