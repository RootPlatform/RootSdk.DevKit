---
path: bot-docs/configure/manifest-version.md
audience: bot
category: guide
summary: Semantic version string (e.g., MAJOR.MINOR.PATCH). Your version number must be unique for each release; that is, you cannot republish a new package...
---

# Manifest `version`

Semantic version string (e.g., MAJOR.MINOR.PATCH). Your version number must be unique for each release; that is, you cannot republish a new package with a previously-used version number.

## Details

|                |                |
| -------------- | -------------- |
| **Name**       | `version`     |
| **Type**       | `string`      |
| **Required**   | Yes           |

## Example

```json
{
    "version": "1.0.0"
}
```