import { useEffect } from "react";

// useFocusTrap — keep keyboard focus inside `containerRef.current` while
// `active` is true. Restores focus to whatever element was focused at
// activation time when the trap deactivates. Listens for Escape and
// invokes `onEscape` when supplied. Locks body scroll while active so
// the page underneath doesn't shift while a drawer/dialog is open.
//
// No library dependency. Selector covers the common focusable elements;
// if a fork needs more (e.g. contenteditable), extend FOCUSABLE.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

interface Options {
  active: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

export function useFocusTrap({
  active,
  containerRef,
  onEscape,
}: Options): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Lock body scroll while the trap is active. Capture the prior overflow
    // value so we restore it precisely (not just "unset" — the host page may
    // have set overflow itself).
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the container (first focusable, or the container itself
    // if it's tabbable). Without this, the user's first Tab press starts from
    // wherever they were before the drawer opened.
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      if (!container) return;
      const items = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const goingBack = e.shiftKey;
      if (goingBack && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!goingBack && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = priorOverflow;
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, onEscape]);
}
