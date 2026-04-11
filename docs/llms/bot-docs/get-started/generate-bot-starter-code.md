---
path: bot-docs/get-started/generate-bot-starter-code.md
audience: bot
category: guide
summary: Root supplies a command-line utility named `create-root` that generates starter code.
---

# Generate Bot starter code

Root supplies a command-line utility named `create-root` that generates starter code. You'll need `npx` installed on your machine in order to run the tool (`npx` is included with `Node`).

The generated code will build; however, you'll need to add a `DEV_TOKEN` to the generated `.env` file in order to test locally. You get a `DEV_TOKEN` from the [Root Developer Portal](https://dev.rootapp.com).

## Usage

To create a new project using `create-root`, open a terminal, navigate to your target folder, and run the following command:

```bash
npx create-root --bot <ProjectName>
```
## Parameters

- `<ProjectName>` → The name of your project. This will also be used as the folder name. Do not include the angle brackets in your name.

## Example

```bash
npx create-root --bot MyBot
```