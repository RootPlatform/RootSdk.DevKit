---
path: bot-api-reference/type-aliases/AssetPreviewWebpage.md
audience: bot
category: reference
summary: Webpage-specific preview metadata within an `AssetPreview`. Generated when the platform processes a URL that points to a web page.
---

> **AssetPreviewWebpage** = `object`

Webpage-specific preview metadata within an `AssetPreview`. Generated when the platform processes a URL that points to a web page.

## Properties

### embedUrl?

> `optional` **embedUrl**: `string`

An embeddable URL for the page (e.g., an oEmbed URL for a YouTube video). Optional.

### favicon?

> `optional` **favicon**: `string`

The URL to the site's favicon. Optional.

### siteName?

> `optional` **siteName**: `string`

The name of the website (e.g., "YouTube", "GitHub"). Optional.