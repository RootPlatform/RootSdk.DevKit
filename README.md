# RootSdk.DevKit

A developer kit for building Root apps and bots. Supports AI-native development — clone the repo, point your agent at it, and start building.

## Structure

```
RootSdk.DevKit/
├── README.md
├── AGENTS.md
├── llms.txt
├── apps/
├── bots/
├── how-to/
└── llms/
    ├── docs/
    ├── templates/
    ├── gui/
    │   ├── tokens.md
    │   ├── icons.md
    │   └── controls.md
    └── schemas/
        ├── permissions-map.json
        └── manifest-schema.json
```

**`apps/`** — complete, runnable Root app samples. Good starting points for humans and end-to-end patterns for agents.

**`bots/`** — complete, runnable Root bot samples. Same intent as apps, server-side only.

**`how-to/`** — focused samples covering specific API surfaces (messages, channels, roles, files, etc.). Each directory is a standalone bot covering one SDK domain. Every method is covered. Files are self-contained: one file = one complete answer, with behavioral nuances inline as comments. Server-side code is shared across apps and bots.

**`llms/`** — everything an AI agent needs to build on Root effectively.
- **`docs/`** — LLM-friendly versions of the full Root developer documentation.
- **`templates/`** — scaffolded starting points that skills utilize.
- **`gui/`** — Root's theming system: CSS tokens, icons, and control recommendations for building app UIs.
- **`schemas/`** — machine-readable reference files for the Root manifest format and API permission requirements.
