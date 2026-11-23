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

Each upload must use a version that is **strictly greater** than the latest version you've uploaded, whether or not that version was released. You cannot reuse a previous version number, and you cannot go backwards. For example, after uploading `1.2.0`, the next upload must be `1.2.1` or higher.

`npx rootsdk build package` checks the version's format. The upload compares it with your latest uploaded version and rejects it if it isn't greater.

The version is read from the manifest packed inside the `.pkg` file. After changing `version`, build a new package before you upload. See [Upload your code](../publish/upload.md).

## Example

```json
{
  "id": "ACj4U-eThgmjXUOBAjk_jw",
  "version": "1.0.0",
  "package": { ... }
}
```