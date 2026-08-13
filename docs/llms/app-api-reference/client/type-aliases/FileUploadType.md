---
path: app-api-reference/client/type-aliases/FileUploadType.md
audience: app
category: reference
summary: Restricts which file types the user can select in the file picker opened by `rootClient.assets.fileUpload()`.
---

> **FileUploadType** = `"all"` | `"text"` | `"imageAll"` | `"pdf"`

Restricts which file types the user can select in the file picker opened by `rootClient.assets.fileUpload()`.

- `"all"`: Any file type.
- `"text"`: Text files only.
- `"imageAll"`: Image files only.
- `"pdf"`: PDF files only.