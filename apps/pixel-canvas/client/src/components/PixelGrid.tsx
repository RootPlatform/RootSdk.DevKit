import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./PixelGrid.module.css";
import { pixelKey, type PixelInfo } from "../contexts/CanvasContext";

// ============================================================================
// PixelGrid — the canvas surface. CSS-grid of cells, NOT an HTML5 <canvas>.
//
// Why CSS grid over <canvas>: at 32×32 (1,024 cells) and 64×64 (4,096), DOM
// performance is comfortable IF we're disciplined about reconciliation.
// CSS grid gives us per-cell focus + click handlers without hit-testing
// math. <canvas> would be more performant at much larger sizes (256×256+)
// but adds significant complexity — see DESIGN.md "Why CSS grid" for the
// rationale and the upgrade path if a fork wants larger canvases.
//
// Reconciliation discipline:
//   - PixelGrid itself is React.memo'd so cooldown ticks in HomeView (a
//     250ms-tick re-render at the parent) don't cascade through the grid
//     unless props actually changed.
//   - Each cell is extracted into a React.memo'd Cell component receiving
//     primitives: x, y, data (PixelInfo | undefined), previewColor
//     (string | undefined — only set when the user is previewing this
//     cell), isFocused (boolean — for roving tabindex).
//   - `data` references are stable for unchanged pixels because the
//     `pixels` Map is cloned shallow on each PixelPlaced (only the
//     changed entry gets a new object). A broadcast that places one
//     pixel re-renders one Cell, not the whole 4096-cell grid.
//   - `previewColor` is undefined for non-selected cells — changing the
//     palette selection only re-renders the previously-selected and
//     newly-selected cells.
//
// Click handling uses event delegation: one onClick on the wrapping div
// reads `data-x` / `data-y` off the clicked button. With 4096 cells per
// render at max canvas, attaching a fresh inline arrow per cell would
// allocate 4096 closures every time React renders the grid. Delegation
// keeps that to one stable handler.
//
// Keyboard navigation uses a roving tabindex pattern: exactly one cell
// at a time has tabIndex=0 (the "currently focused" cell, defaulting to
// (0,0)), all others have tabIndex=-1. Arrow keys move the focused cell
// (handler on the grid wrapper); Enter/Space activate via the native
// button click. Without this, Tabbing into the grid would cycle through
// all 4096 cells linearly — a usability dead-end at large canvas sizes.
// Tab in/out leaves the grid as a single focus stop.
//
// Sizing: cells are sized via inline CSS variables on the wrapper. Each
// cell uses aspect-ratio: 1 to stay square as `cellSize` changes. The
// full grid's width is `cellSize × width`.
//
// Tap targeting: `touch-action: manipulation` on the cells disables the
// browser's default double-tap-to-zoom which would otherwise eat rapid
// taps. tap-highlight-color: transparent removes the default gray flash;
// we draw our own preview ring instead.
//
// A11y: `aria-pressed` (not aria-selected) communicates the preview
// state — buttons that toggle a "this is my current target" state map
// to pressed/unpressed in WAI-ARIA. `aria-label` includes the cell
// coordinates and (when placed) the color hex; placer nickname is
// surfaced in the action panel below the grid for the focused/selected
// cell, so AT users get the full "placed by" context without per-cell
// profile lookups in the grid itself.
//
// Empty cells render as `--rootsdk-background-tertiary` — reads as a
// neutral canvas background in both light and dark themes. Placed cells
// override with the role color via inline style.
// ============================================================================

interface Props {
  width: number;
  height: number;
  pixels: Map<string, PixelInfo>;
  selected: { x: number; y: number } | undefined;
  selectedColor: string;
  // Cell size in pixels. Set by parent based on available width.
  cellSize: number;
  onCellClick: (x: number, y: number) => void;
}

interface CellInfo {
  x: number;
  y: number;
  data: PixelInfo | undefined;
}

interface CellProps {
  x: number;
  y: number;
  data: PixelInfo | undefined;
  // Defined only when this cell is the user's selection. When defined,
  // overrides the cell's `data?.color` for visual + aria — the cell
  // shows the *would-be* placement color for preview.
  previewColor: string | undefined;
  isFocused: boolean;
}

const Cell: React.FC<CellProps> = React.memo(function Cell({
  x,
  y,
  data,
  previewColor,
  isFocused,
}) {
  const isSelected = previewColor !== undefined;
  const bg = previewColor ?? data?.color;
  const ariaLabel = data
    ? `(${x}, ${y}) — color ${data.color}`
    : `(${x}, ${y}) — empty`;
  return (
    <button
      type="button"
      data-x={x}
      data-y={y}
      tabIndex={isFocused ? 0 : -1}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      className={[
        styles.cell,
        isSelected ? styles.selected : undefined,
        data ? styles.placed : styles.empty,
      ]
        .filter(Boolean)
        .join(" ")}
      style={bg ? { backgroundColor: bg } : undefined}
    />
  );
});

export const PixelGrid: React.FC<Props> = React.memo(function PixelGrid({
  width,
  height,
  pixels,
  selected,
  selectedColor,
  cellSize,
  onCellClick,
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  // Roving tabindex anchor. Defaults to (0,0); arrow-key moves it.
  // Clamped on canvas resize so a focus position from a 64×64 canvas
  // doesn't survive into a 32×32 reset.
  const [focusedCell, setFocusedCell] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  useEffect(() => {
    if (focusedCell.x >= width || focusedCell.y >= height) {
      setFocusedCell({ x: 0, y: 0 });
    }
  }, [width, height, focusedCell]);

  // Build the cell list once per (width, height, pixels) change. Avoids
  // recomputing on every selection change — selection is handled per-cell
  // via the `previewColor` prop on the memo'd Cell.
  const cells = useMemo<CellInfo[]>(() => {
    const out: CellInfo[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out.push({ x, y, data: pixels.get(pixelKey(x, y)) });
      }
    }
    return out;
  }, [width, height, pixels]);

  // Event delegation: walk up to the nearest button with data-x/data-y
  // and dispatch onCellClick with parsed coordinates.
  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>(
        "button[data-x][data-y]",
      );
      if (!button) return;
      const x = Number(button.dataset.x);
      const y = Number(button.dataset.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        setFocusedCell({ x, y });
        onCellClick(x, y);
      }
    },
    [onCellClick],
  );

  // Arrow-key navigation. Sets the new focused cell and moves DOM focus
  // there in a microtask so React's tabIndex flip lands first. Wrap in
  // requestAnimationFrame so the focused button has tabIndex=0 by the
  // time we call .focus() (otherwise WebKit refuses to focus a
  // tabIndex=-1 element).
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case "ArrowLeft":
          dx = -1;
          break;
        case "ArrowRight":
          dx = 1;
          break;
        case "ArrowUp":
          dy = -1;
          break;
        case "ArrowDown":
          dy = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const nx = Math.max(0, Math.min(width - 1, focusedCell.x + dx));
      const ny = Math.max(0, Math.min(height - 1, focusedCell.y + dy));
      if (nx === focusedCell.x && ny === focusedCell.y) return;
      setFocusedCell({ x: nx, y: ny });
      requestAnimationFrame(() => {
        const button = gridRef.current?.querySelector<HTMLButtonElement>(
          `button[data-x="${nx}"][data-y="${ny}"]`,
        );
        button?.focus();
      });
    },
    [width, height, focusedCell],
  );

  return (
    <div
      ref={gridRef}
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
      }}
      onClick={handleGridClick}
      onKeyDown={handleGridKeyDown}
      role="group"
      aria-label="Pixel canvas — use arrow keys to move between cells, Enter or Space to select"
    >
      {cells.map(({ x, y, data }) => {
        const isSelected = selected?.x === x && selected?.y === y;
        const isFocused = focusedCell.x === x && focusedCell.y === y;
        return (
          <Cell
            key={pixelKey(x, y)}
            x={x}
            y={y}
            data={data}
            previewColor={isSelected ? selectedColor : undefined}
            isFocused={isFocused}
          />
        );
      })}
    </div>
  );
});
