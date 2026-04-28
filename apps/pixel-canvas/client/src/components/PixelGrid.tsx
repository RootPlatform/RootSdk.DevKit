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
// (0,0)), all others have tabIndex=-1. Arrow keys move by one cell;
// Home/End jump to the start/end of the current row; Ctrl+Home /
// Ctrl+End jump to the grid corners. Enter/Space activate via the
// native button click. Without this, Tabbing into the grid would cycle
// through all 4096 cells linearly — a usability dead-end at large
// canvas sizes. Tab in/out leaves the grid as a single focus stop.
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
// A11y: cells use the WAI-ARIA grid pattern. The outer wrapper is
// `role="grid"` with `aria-rowcount` / `aria-colcount`; cells are
// rendered inside `role="row"` wrappers (with `display: contents` so
// the CSS grid layout still flows children directly into the parent's
// track grid) and each cell is `role="gridcell"` with `aria-rowindex`
// / `aria-colindex` (1-based, per spec). AT users get structured
// position announcements ("row 5 of 32, column 3 of 32") instead of a
// flat button list. Our roving tabindex + arrow-key handler matches
// what AT expects from a grid; Enter/Space activate via the native
// button click.
//
// `aria-pressed` (not aria-selected) communicates the preview state —
// buttons that toggle a "this is my current target" state map to
// pressed/unpressed in WAI-ARIA. `aria-label` includes the cell
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

// `display: contents` on the row wrapper removes it from the layout
// tree (its children become direct children of the CSS grid for
// positioning purposes) while keeping the ARIA role="row" structure
// for assistive tech. Without this, the role="row" div would itself
// become a grid item and break the cell layout.
const ROW_STYLE: React.CSSProperties = { display: "contents" };

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
      role="gridcell"
      aria-rowindex={y + 1}
      aria-colindex={x + 1}
      data-x={x}
      data-y={y}
      tabIndex={isFocused ? 0 : -1}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      className={[styles.cell, isSelected ? styles.selected : undefined]
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
  // Functional setter + width/height-only deps so the effect doesn't
  // re-run on every focus move. The conditional already prevents an
  // infinite loop, but a future tweak to the condition that briefly
  // returned a fresh object every time would silently regress to one.
  useEffect(() => {
    setFocusedCell((curr) =>
      curr.x >= width || curr.y >= height ? { x: 0, y: 0 } : curr,
    );
  }, [width, height]);

  // Build cells grouped by row so we can wrap each row in role="row".
  // Recomputed when (width, height, pixels) change — selection-only
  // changes are handled per-cell via the `previewColor` prop on the
  // memo'd Cell, no array rebuild needed.
  //
  // Cost: O(W·H) in time AND allocation per change. Since `pixels` gets
  // a new Map reference on every PixelPlaced broadcast (CanvasContext
  // clones to trigger React reference-equality reconciliation), this
  // useMemo invalidates on every event. At max canvas (64×64 = 4,096
  // entries) and a flooded broadcast rate (1000 active painters at
  // default cooldown ≈ 33 events/sec), that's ~135K {x,y,data} object
  // allocations + 4096 cell prop-shallow-equality compares per second.
  // Cell-level React.memo keeps actual re-renders to the changed cell,
  // but the array build is unavoidable with this data shape. A fork
  // that wants to scale past community-size traffic should swap
  // PixelGrid for an HTML5 `<canvas>` (no per-cell DOM, single
  // per-frame paint) — see DESIGN.md "Why CSS grid (not HTML5
  // <canvas>)" for the upgrade path.
  const cellRows = useMemo<CellInfo[][]>(() => {
    const rows: CellInfo[][] = [];
    for (let y = 0; y < height; y++) {
      const row: CellInfo[] = [];
      for (let x = 0; x < width; x++) {
        row.push({ x, y, data: pixels.get(pixelKey(x, y)) });
      }
      rows.push(row);
    }
    return rows;
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

  // Keyboard navigation per the WAI-ARIA grid pattern. Arrow keys move
  // by one cell; Home/End jump to row start/end; Ctrl+Home / Ctrl+End
  // jump to grid start/end. Sets the new focused cell and moves DOM
  // focus in a microtask so React's tabIndex flip lands first — the
  // requestAnimationFrame wrapper waits for that commit because WebKit
  // refuses to focus a tabIndex=-1 element.
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let nx = focusedCell.x;
      let ny = focusedCell.y;
      switch (e.key) {
        case "ArrowLeft":
          nx = Math.max(0, focusedCell.x - 1);
          break;
        case "ArrowRight":
          nx = Math.min(width - 1, focusedCell.x + 1);
          break;
        case "ArrowUp":
          ny = Math.max(0, focusedCell.y - 1);
          break;
        case "ArrowDown":
          ny = Math.min(height - 1, focusedCell.y + 1);
          break;
        case "Home":
          // Ctrl+Home jumps to the grid's first cell; plain Home
          // jumps to the start of the current row.
          nx = 0;
          if (e.ctrlKey) ny = 0;
          break;
        case "End":
          nx = width - 1;
          if (e.ctrlKey) ny = height - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
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
      role="grid"
      aria-rowcount={height}
      aria-colcount={width}
      aria-label="Pixel canvas — arrow keys move between cells; Home and End jump to row start and end; Ctrl+Home and Ctrl+End jump to grid start and end; Enter or Space selects"
    >
      {cellRows.map((row, y) => (
        <div
          key={y}
          role="row"
          aria-rowindex={y + 1}
          style={ROW_STYLE}
        >
          {row.map(({ x, y: cy, data }) => {
            const isSelected = selected?.x === x && selected?.y === cy;
            const isFocused = focusedCell.x === x && focusedCell.y === cy;
            return (
              <Cell
                key={pixelKey(x, cy)}
                x={x}
                y={cy}
                data={data}
                previewColor={isSelected ? selectedColor : undefined}
                isFocused={isFocused}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
});
