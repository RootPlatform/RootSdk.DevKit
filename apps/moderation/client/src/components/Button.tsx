import React from "react";
import styles from "./Button.module.css";

type Variant = "default" | "primary" | "danger" | "iconDanger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  className,
  ...rest
}) => {
  const variantClass =
    variant === "primary"
      ? styles.primary
      : variant === "danger"
        ? styles.danger
        : variant === "iconDanger"
          ? styles.iconDanger
          : "";
  return (
    <button
      {...rest}
      className={`${styles.button} ${variantClass} ${className ?? ""}`}
    />
  );
};
