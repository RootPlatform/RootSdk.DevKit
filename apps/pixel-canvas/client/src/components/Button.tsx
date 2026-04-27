import React, { forwardRef } from "react";
import styles from "./Button.module.css";

// ============================================================================
// Button — five variants (primary, outline, danger, text, quiet). 44px min
// height for primary/outline/danger/text, 32px for quiet, pill shape on
// the full-height variants and a smaller 8px-radius rectangle for quiet.
// See Button.module.css for the recipes and design-system-reference.md
// for canonical token usage.
// ============================================================================

// `quiet` is a flat, tinted-bg button with smaller padding than the full-
// pill primary/outline/danger. Use it for inline secondary actions that
// shouldn't read as declaratively as `outline` (whose visible border can
// feel heavy on small contextual buttons). Pairs naturally with `primary`
// or `danger` as the louder peer in a primary-secondary pair.
// See design-system-reference.md "button-quiet".
export type ButtonVariant = "primary" | "outline" | "danger" | "text" | "quiet";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className, ...rest }, ref) => {
    const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");
    return <button ref={ref} className={classes} {...rest} />;
  },
);

Button.displayName = "Button";
