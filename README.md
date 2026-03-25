# RootSdk.DevKit

A developer kit for building Root apps and bots. Supports AI-native development — clone the repo, point your agent at it, and start building.

## Structure

```
RootSdk.DevKit/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── llms.txt
├── apps/
├── bots/
├── how-to/
├── docs/
├── templates/
└── schemas/
```

**`apps/`** — complete, runnable Root app samples. Good starting points for humans and end-to-end patterns for agents.

**`bots/`** — complete, runnable Root bot samples. Same intent as apps, server-side only.

**`how-to/`** — focused samples covering specific API surfaces (messages, channels, roles, files, etc.). Each directory is a standalone bot covering one SDK domain. Every method is covered. Files are self-contained: one file = one complete answer, with behavioral nuances inline as comments. Server-side code is identical between apps and bots except for the import path and lifecycle — so how-to bots double as server-side references for apps. Client code is app-only.

**`docs/`** — LLM-friendly versions of the full Root developer documentation.

**`templates/`** — scaffolded starting points for new apps and bots.

**`schemas/`** — machine-readable reference files for the Root manifest format and API permission requirements.
