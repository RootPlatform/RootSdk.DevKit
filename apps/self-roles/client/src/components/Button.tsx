import React, { forwardRef } from "react";
import styles from "./Button.module.css";

// ============================================================================
// Button — four variants. 44px min height, pill shape, DESIGN.md tokens.
// ============================================================================

export type ButtonVariant = "primary" | "outline" | "danger" | "text";

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
