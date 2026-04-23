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
├── api-samples/
├── docs/
├── templates/
└── schemas/
```

**`AGENTS.md`**, **`CLAUDE.md`**, **`llms.txt`** — agent navigation files. These orient an agent on what's available, where to find it, and which resources to load for a given task. An agent building a bot reads `AGENTS.md` and knows exactly which docs to load, which template to copy, and which api-sample modules to reference.

**`apps/`** — the agent's architectural reference for full-stack patterns. Complete, runnable app samples ranging from minimal hello-world to complex multi-service examples. When an agent needs to understand how pieces fit together (client-server communication, protobuf services, state management), it reads a sample that demonstrates the pattern end-to-end.

**`bots/`** — same role as apps, server-side only. Complete, runnable bot samples for server-only automation patterns.

**`api-samples/`** — the agent's API reference in working code. ~30 standalone modules, one per SDK domain (messages, channels, roles, files, database, jobs, etc.). When an agent needs to implement a specific capability, it reads the matching module and gets copy-ready code with every method demonstrated and behavioral nuances as inline comments. One file = one complete answer. No synthesis required.

**`docs/`** — the agent's deep knowledge base. LLM-friendly versions of the full Root developer documentation, split by audience and type so agents load only what they need — a bot agent loads ~200K tokens instead of ~470K.

**`templates/`** — the agent's starting point. Scaffolded starting points for new apps and bots. Instead of generating project structure from scratch, the agent copies a working template and modifies it.

**`schemas/`** — the agent's validation layer. A permissions map linking every SDK method to its required manifest permission, plus JSON schemas for manifest validation.
