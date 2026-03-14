---
name: root-canvas-rendering
description: HTML5 Canvas 2D graphics rendering patterns for Root Apps
---

# Canvas 2D Rendering in Root Apps

Use this skill when building Root Apps that need 2D graphics rendering with HTML5 Canvas.

## When to Use

- User wants to render a grid-based display (pixel art, game boards, tile maps)
- User needs interactive graphics with mouse/touch input
- User wants real-time drawing or visualization
- User needs coordinate transformation (screen ↔ grid)

For complex drawing apps with layers, shapes, and transforms, consider using Konva.js (`react-konva`) instead of raw Canvas 2D.

## Architecture

```
React Component (CanvasView)
    │
    ├── useRef<HTMLCanvasElement>  ← DOM reference
    ├── useRef<CanvasRenderer>     ← Renderer instance
    │
    └── CanvasRenderer Class
            ├── ctx: CanvasRenderingContext2D
            ├── render(state)      ← Draw everything
            ├── screenToGrid(x, y) ← Coordinate conversion
            └── gridToScreen(x, y) ← Coordinate conversion
```

## Key Pattern: CanvasRenderer Class

Separate rendering logic from React component state:

```typescript
interface RendererConfig {
  gridWidth: number;
  gridHeight: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridWidth = 64;
  private gridHeight = 64;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  setConfig(config: RendererConfig) {
    this.gridWidth = config.gridWidth;
    this.gridHeight = config.gridHeight;
  }

  /**
   * Calculate pixel size to fit grid in canvas with square cells.
   */
  private getPixelSize(): number {
    const sizeByWidth = this.canvas.width / this.gridWidth;
    const sizeByHeight = this.canvas.height / this.gridHeight;
    return Math.floor(Math.min(sizeByWidth, sizeByHeight));
  }

  /**
   * Calculate offset to center grid in canvas.
   */
  private getOffset(): { x: number; y: number } {
    const pixelSize = this.getPixelSize();
    return {
      x: Math.floor((this.canvas.width - this.gridWidth * pixelSize) / 2),
      y: Math.floor((this.canvas.height - this.gridHeight * pixelSize) / 2),
    };
  }

  /**
   * Convert screen coordinates to grid position.
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const pixelSize = this.getPixelSize();
    const offset = this.getOffset();

    const gridX = Math.floor((canvasX - offset.x) / pixelSize);
    const gridY = Math.floor((canvasY - offset.y) / pixelSize);

    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return null;
    }
    return { x: gridX, y: gridY };
  }

  /**
   * Main render method - call this whenever state changes.
   */
  render(data: Uint8Array, selection?: { x: number; y: number } | null) {
    const pixelSize = this.getPixelSize();
    const offset = this.getOffset();

    // Clear canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid cells
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const index = (y * this.gridWidth + x) * 3; // RGB format
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        const screenX = x * pixelSize + offset.x;
        const screenY = y * pixelSize + offset.y;

        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.fillRect(screenX, screenY, pixelSize, pixelSize);
      }
    }

    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.gridWidth; x++) {
      const sx = x * pixelSize + offset.x;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, offset.y);
      this.ctx.lineTo(sx, offset.y + this.gridHeight * pixelSize);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      const sy = y * pixelSize + offset.y;
      this.ctx.beginPath();
      this.ctx.moveTo(offset.x, sy);
      this.ctx.lineTo(offset.x + this.gridWidth * pixelSize, sy);
      this.ctx.stroke();
    }

    // Draw selection highlight
    if (selection) {
      const sx = selection.x * pixelSize + offset.x;
      const sy = selection.y * pixelSize + offset.y;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(sx, sy, pixelSize, pixelSize);
    }
  }
}
```

## React Component Integration

```tsx
import { useRef, useEffect, useCallback } from 'react';
import { CanvasRenderer } from './CanvasRenderer';

interface CanvasViewProps {
  gridWidth: number;
  gridHeight: number;
  pixelData: Uint8Array;
  onCellClick?: (x: number, y: number) => void;
}

export function CanvasView({ gridWidth, gridHeight, pixelData, onCellClick }: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize renderer when canvas is available
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }

    rendererRef.current.setConfig({ gridWidth, gridHeight });
    rendererRef.current.render(pixelData);
  }, [gridWidth, gridHeight, pixelData]);

  // Handle canvas resize
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return;

      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;

      rendererRef.current?.render(pixelData);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [pixelData]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!rendererRef.current || !onCellClick) return;

    const pos = rendererRef.current.screenToGrid(e.clientX, e.clientY);
    if (pos) {
      onCellClick(pos.x, pos.y);
    }
  }, [onCellClick]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ display: 'block' }}
      />
    </div>
  );
}
```

## Syncing with Server via Protobuf

Define pixel data as binary in your `.proto` file:

```protobuf
message CanvasState {
  int32 gridWidth = 1;
  int32 gridHeight = 2;
  bytes pixelData = 3;  // RGB packed: [r,g,b,r,g,b,...]
}

message PlacePixelRequest {
  int32 x = 1;
  int32 y = 2;
  Color color = 3;
}

message Color {
  int32 r = 1;
  int32 g = 2;
  int32 b = 3;
}

service CanvasService {
  rpc GetCanvas(GetCanvasRequest) returns (CanvasState);
  rpc PlacePixel(PlacePixelRequest) returns (PlacePixelResponse);
  rpc BroadcastPixelPlaced(PixelPlacedEvent) returns (rootsdk.Void);
}
```

## Performance Tips

### Avoid re-rendering unchanged data

```typescript
const lastDataRef = useRef<Uint8Array | null>(null);

useEffect(() => {
  if (pixelData === lastDataRef.current) return; // Same reference, skip
  lastDataRef.current = pixelData;
  rendererRef.current?.render(pixelData);
}, [pixelData]);
```

### Use requestAnimationFrame for animations

```typescript
useEffect(() => {
  let animationId: number;

  const animate = () => {
    rendererRef.current?.render(pixelData, selection);
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationId);
}, [pixelData, selection]);
```

### Batch pixel updates on the server

Instead of broadcasting every pixel change individually, batch updates:

```typescript
// Server-side batching
private pendingUpdates: PixelUpdate[] = [];

placePixel(x: number, y: number, color: Color) {
  this.pendingUpdates.push({ x, y, color });
  this.scheduleBroadcast();
}

private scheduleBroadcast() {
  if (this.broadcastTimer) return;
  this.broadcastTimer = setTimeout(() => {
    this.broadcastPixelBatch({ updates: this.pendingUpdates }, 'all');
    this.pendingUpdates = [];
    this.broadcastTimer = null;
  }, 50); // 50ms batching window
}
```

## Alternative: Konva.js for Complex Drawing

For apps with freehand drawing, shapes, layers, or complex transforms, use `react-konva`:

```tsx
import { Stage, Layer, Line, Rect } from 'react-konva';

function DrawingCanvas({ width, height, lines }) {
  return (
    <Stage width={width} height={height}>
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill="white" />
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.color}
            strokeWidth={line.width}
            lineCap="round"
            lineJoin="round"
          />
        ))}
      </Layer>
    </Stage>
  );
}
```

## Common Patterns

| Pattern | When to Use |
|---------|-------------|
| Raw Canvas 2D | Grid-based displays, pixel art, simple games |
| Konva.js | Freehand drawing, shapes, layered graphics |
| Binary `Uint8Array` | Efficient pixel data transfer over network |
| `screenToGrid()` | Click/touch interaction on grid cells |

## Examples in Codebase

- **PixelCanvas** - Grid-based pixel placement with cooldowns
- **Sketchionary** - Freehand drawing game using Konva.js
- **Whiteboard** - SVG-based collaborative drawing
