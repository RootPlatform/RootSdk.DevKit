---
path: app-api-reference/client/classes/UserRoleSelector.md
audience: app
category: reference
summary: A searchable dropdown component for selecting users and community roles.
---

A searchable dropdown component for selecting users and community roles. Use this component when you need to let users pick one or more community members or roles, such as for assigning permissions, mentions, or task assignments.

The component fetches available users and roles from the Root SDK and displays them in collapsible, searchable sections. Selected items appear first in each section for easy visibility.

**Installation**

Add to your client's `package.json`:

```json
{
  "dependencies": {
    "@rootsdk/client-app-ui": "^0.1.0",
    "lit": "^3.2.1",
    "lit-element": "^4.1.1"
  }
}
```

The `lit` and `lit-element` packages are peer dependencies required by the component.

**Import**

```typescript
import '@rootsdk/client-app-ui';
```

**Basic usage**

```html
<rootsdk-user-role-selector></rootsdk-user-role-selector>
```

**Events**

The component dispatches a `rootsdk-user-role-selector:selection-change` CustomEvent whenever the selection changes. The event detail contains `{ selectedUserIds: string[], selectedRoleIds: string[] }`.

**Examples**

Multi-select mode (default):

```html
<rootsdk-user-role-selector
  mode="multi"
></rootsdk-user-role-selector>
```

Single-select mode:

```html
<rootsdk-user-role-selector
  mode="single"
></rootsdk-user-role-selector>
```

Pre-selected values:

```html
<rootsdk-user-role-selector
  .selectedUserIds=${['user-123', 'user-456']}
  .selectedRoleIds=${['role-admin']}
></rootsdk-user-role-selector>
```

Handling selection changes:

```typescript
const selector = document.querySelector('rootsdk-user-role-selector');

selector.addEventListener('rootsdk-user-role-selector:selection-change', (event) => {
  const { selectedUserIds, selectedRoleIds } = event.detail;
  console.log('Selected users:', selectedUserIds);
  console.log('Selected roles:', selectedRoleIds);
});
```

Using with Lit:

```typescript
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@rootsdk/client-app-ui';

@customElement('my-app')
class MyApp extends LitElement {
  @state() selectedUsers: string[] = [];
  @state() selectedRoles: string[] = [];

  handleSelectionChange(e: CustomEvent) {
    this.selectedUsers = e.detail.selectedUserIds;
    this.selectedRoles = e.detail.selectedRoleIds;
  }

  render() {
    return html`
      <rootsdk-user-role-selector
        mode="multi"
        .selectedUserIds=${this.selectedUsers}
        .selectedRoleIds=${this.selectedRoles}
        @rootsdk-user-role-selector:selection-change=${this.handleSelectionChange}
      ></rootsdk-user-role-selector>
    `;
  }
}
```

Using with React:

```tsx
import { useEffect, useRef, useState } from 'react';
import '@rootsdk/client-app-ui';

function UserRoleSelector() {
  const selectorRef = useRef<HTMLElement>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    const selector = selectorRef.current;
    if (!selector) return;

    const handleChange = (e: CustomEvent) => {
      setSelectedUsers(e.detail.selectedUserIds);
      setSelectedRoles(e.detail.selectedRoleIds);
    };

    selector.addEventListener('rootsdk-user-role-selector:selection-change', handleChange);
    return () => {
      selector.removeEventListener('rootsdk-user-role-selector:selection-change', handleChange);
    };
  }, []);

  return (
    <rootsdk-user-role-selector
      ref={selectorRef}
      mode="multi"
    />
  );
}
```

To set initial values in React, update the element properties after mounting:

```tsx
useEffect(() => {
  const selector = selectorRef.current;
  if (!selector) return;

  (selector as any).selectedUserIds = ['user-123'];
  (selector as any).selectedRoleIds = ['role-admin'];
}, []);
```

## Extends

- `LitElement`

## Constructors

### Constructor

> **new UserRoleSelector**(): `UserRoleSelector`

#### Returns

`UserRoleSelector`

#### Overrides

`LitElement.constructor`

## Properties

### mode

> **mode**: `"single"` | `"multi"` = `"multi"`

The selection mode. Use `"multi"` (default) to allow selecting multiple users and roles simultaneously. Use `"single"` to allow only one selection at a time: selecting a user clears any selected role and vice versa.

### selectedRoleIds

> **selectedRoleIds**: `string`[] = `[]`

Array of community role IDs that should appear as selected. Pass this prop to control the component's selection state.

### selectedUserIds

> **selectedUserIds**: `string`[] = `[]`

Array of user IDs that should appear as selected. Pass this prop to control the component's selection state.

### view

> **view**: `"both"` | `"roles"` | `"members"` = `"both"`

### styles

> `static` **styles**: `CSSResult`[]

The component's styles defined using Lit's CSS tagged template literal. These styles are scoped to the component using Shadow DOM.

#### Overrides

`LitElement.styles`

## Methods

### connectedCallback()

> **connectedCallback**(): `Promise`<`void`>

Initializes the component by fetching available community roles and suggested user profiles from the Root SDK bridge.

#### Returns

`Promise`<`void`>

#### Overrides

`LitElement.connectedCallback`

### disconnectedCallback()

> **disconnectedCallback**(): `void`

Cleans up the component when removed from the DOM.

#### Returns

`void`

#### Overrides

`LitElement.disconnectedCallback`

### render()

> **render**(): `TemplateResult`<`1`>

Renders the search input and virtualized list of users and roles.

#### Returns

`TemplateResult`<`1`>

#### Overrides

`LitElement.render`