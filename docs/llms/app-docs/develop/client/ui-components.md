---
path: app-docs/develop/client/ui-components.md
audience: app
category: guide
summary: Root provides a library of pre-built UI components designed to integrate seamlessly with the Root platform.
---

# UI component library

Root provides a library of pre-built UI components designed to integrate seamlessly with the Root platform. These components handle common patterns like user selection, role management, and platform-specific styling.

## Installation

The component library is published as [`@rootsdk/client-app-ui`](https://www.npmjs.com/package/@rootsdk/client-app-ui) on npm. Add it to your client's `package.json`:

```json
{
  "dependencies": {
    "@rootsdk/client-app-ui": "^0.1.0",
    "lit": "^3.2.1",
    "lit-element": "^4.1.1"
  }
}
```

The `lit` and `lit-element` packages are peer dependencies required by the component library.

## Usage

Import components directly in your TypeScript or JavaScript code:

```typescript
import '@rootsdk/client-app-ui';
```

Then use the custom elements in your HTML:

```html
<rootsdk-user-role-selector
  mode="multi"
></rootsdk-user-role-selector>
```

## Available components

- [UserRoleSelector](../../../app-api-reference/client/classes/UserRoleSelector.md) - A searchable dropdown for selecting users and community roles