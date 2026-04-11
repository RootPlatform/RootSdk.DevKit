---
path: app-docs/configure/manifest-version.md
audience: app
category: guide
summary: Semantic version string for your release. Required.
---

# Manifest `version`

Semantic version string for your release. Required.

## Format

Use standard [semver](https://semver.org/) format: `MAJOR.MINOR.PATCH`. Pre-release and build metadata are also supported (e.g., `1.0.0-beta.1+build.42`).

## Versioning rules

Each push must use a version that is **strictly greater** than the last published version. You cannot reuse a previous version number, and you cannot go backwards. For example, after publishing `1.2.0`, the next push must be `1.2.1` or higher.

The version is validated locally by the CLI and again server-side during push. If the version is not greater than the latest published version, the push is rejected.

## Example

```json
{
  "id": "ACj4U-eThgmjXUOBAjk_jw",
  "version": "1.0.0",
  "package": { ... }
}
```