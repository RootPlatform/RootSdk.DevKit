import React, { useEffect, useRef } from "react";

import "@rootsdk/client-app-ui";

// ============================================================================
// RootUserRoleSelector — thin React wrapper around the Lit web component from
// @rootsdk/client-app-ui. Used for picking members (admins + reset-member-XP).
//
// Two notes for callers:
//   1. Callers typically pass fresh arrays each render (e.g. `selectedUserIds={x
//      ? [x] : []}`). Naive useEffect deps on those arrays would re-fire every
//      parent render, thrashing the listener and re-setting Lit element
//      properties. We use stable serialized keys so the effect only runs on
//      real content changes.
//   2. `onSelectionChange` is held in a ref so the listener doesn't re-attach
//      when callers inline their arrow function (most common case).
// ============================================================================

interface RootPlatformUserRoleSelector extends HTMLElement {
  selectedUserIds: string[];
  selectedRoleIds: string[];
  mode?: "single" | "multi";
}

interface RootPlatformUserRoleSelectorAttributes extends Omit<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>,
  "className" | "ref"
> {
  class?: string;
  mode?: "single" | "multi";
  ref?: React.Ref<RootPlatformUserRoleSelector>;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "rootsdk-user-role-selector": RootPlatformUserRoleSelectorAttributes;
    }
  }
}

interface Props extends Omit<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>,
  "ref"
> {
  selectedUserIds?: string[];
  selectedRoleIds?: string[];
  onSelectionChange?: (detail: { selectedUserIds: string[]; selectedRoleIds: string[] }) => void;
  mode?: "single" | "multi";
}

export const RootUserRoleSelector: React.FC<Props> = ({
  selectedUserIds = [],
  selectedRoleIds = [],
  onSelectionChange,
  className,
  mode,
  ...props
}) => {
  const ref = useRef<RootPlatformUserRoleSelector>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);

  // Keep the latest callback in a ref so the listener effect below can read
  // the current handler without re-subscribing on every render.
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Attach the DOM listener once on mount. The handler reads from the ref,
  // so it always dispatches to the current onSelectionChange.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handleSelectionChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      onSelectionChangeRef.current?.(customEvent.detail);
    };
    element.addEventListener(
      "rootsdk-user-role-selector:selection-change",
      handleSelectionChange,
    );
    return () => {
      element.removeEventListener(
        "rootsdk-user-role-selector:selection-change",
        handleSelectionChange,
      );
    };
  }, []);

  // Push selected arrays to the Lit element only when their CONTENTS change.
  // Comparing references would re-fire on every render for callers that build
  // the arrays inline. Serializing to a string acts as cheap deep equality.
  const userIdsKey = selectedUserIds.join("\u0000");
  const roleIdsKey = selectedRoleIds.join("\u0000");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.selectedUserIds = selectedUserIds;
    element.selectedRoleIds = selectedRoleIds;
    // deps use userIdsKey/roleIdsKey (stable until contents change); the
    // eslint-disable is intentional — arrays themselves are unstable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdsKey, roleIdsKey]);

  return <rootsdk-user-role-selector ref={ref} {...props} class={className} mode={mode} />;
};
