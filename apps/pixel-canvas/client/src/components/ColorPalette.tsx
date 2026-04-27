import React from "react";
import styles from "./ColorPalette.module.css";

// ============================================================================
// ColorPalette — horizontal strip of color swatches. The selected swatch
// is outlined in brand-primary using the same row-outline-on-selected
// pattern as RoleToggle in self-roles (see design-system-reference.md
// "selectable-card"). Strip is horizontally scrollable when the swatches
// don't fit the viewport width — common at 320px-wide phones with our
// 16-color palette.
//
// Touch-target sizing: each swatch is 32×32px which clears the 32px
// minimum recommended for touch. Spacing between swatches is small (4px)
// so the swatches feel like a continuous palette rather than a button row.
//
// Disabled state: when the caller is on cooldown, `disabled` dims the
// entire strip and turns each swatch's native disabled attribute on so
// clicks don't register. The selection itself is preserved — when the
// cooldown elapses, the previously-selected swatch lights up again
// without any state churn.
// ============================================================================

interface Props {
  palette: string[];
  selected: string;
  disabled?: boolean;
  onSelect: (color: string) => void;
}

export const ColorPalette: React.FC<Props> = ({
  palette,
  selected,
  disabled = false,
  onSelect,
}) => {
  return (
    <div
      className={[styles.palette, disabled ? styles.disabled : undefined]
        .filter(Boolean)
        .join(" ")}
      role="radiogroup"
      aria-label="Color palette"
      aria-disabled={disabled || undefined}
    >
      {palette.map((color) => {
        const isSelected = color === selected;
        return (
          <button
            key={color}
            type="button"
            className={[
              styles.swatch,
              isSelected ? styles.selected : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ backgroundColor: color }}
            // The `disabled` attribute on the <button> is what actually
            // blocks the click — the redundant `!disabled &&` guard the
            // earlier version had is unnecessary.
            onClick={() => onSelect(color)}
            aria-label={`Color ${color}`}
            aria-checked={isSelected}
            role="radio"
            disabled={disabled}
          />
        );
      })}
    </div>
  );
};
