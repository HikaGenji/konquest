import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FACTION_BY_ID, HEX_SIZE, hexPolygon, TERRAIN, tileTotal } from '../engine';
import type { GameState } from '../engine';

const TAP_THRESHOLD = 6;

interface Props {
  game: GameState;
  selectedId: string | null;
  validTargets: Set<string>;
  strikeTargets: Set<string>;
  visibleIds: Set<string>;
  onTap: (id: string) => void;
  /** Overlay HUD rendered on top of the map (positioned on the edges). */
  children?: ReactNode;
}

export function HexMap({ game, selectedId, validTargets, strikeTargets, visibleIds, onTap, children }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const box = useMemo(() => {
    const xs = game.map.map((t) => t.x);
    const ys = game.map.map((t) => t.y);
    const pad = HEX_SIZE * 1.4;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
    const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    return { minX, minY, w, h, cx: minX + w / 2, cy: minY + h / 2 };
  }, [game.map]);

  const [view, setView] = useState({ cx: box.cx, cy: box.cy, z: 1 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const moved = useRef(false);
  const pinch = useRef<{ dist: number; z: number } | null>(null);

  const vw = box.w / view.z;
  const vh = box.h / view.z;
  const vx = view.cx - vw / 2;
  const vy = view.cy - vh / 2;

  function unitsPerPx(): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 1;
    return Math.max(vw / rect.width, vh / rect.height);
  }
  function setZoom(z: number) {
    setView((v) => ({ ...v, z: Math.min(8, Math.max(1, z)) }));
  }
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), z: view.z };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(pinch.current.z * (dist / pinch.current.dist));
      moved.current = true;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) moved.current = true;
    const upp = unitsPerPx();
    setView((v) => ({ ...v, cx: v.cx - dx * upp, cy: v.cy - dy * upp }));
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    setZoom(view.z * (e.deltaY < 0 ? 1.15 : 0.87));
  }
  function handleClick(id: string) {
    if (moved.current) return;
    onTap(id);
  }

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {game.map.map((t) => {
          const ts = game.tiles[t.id];
          const owner = ts.owner ? FACTION_BY_ID[ts.owner] : null;
          const terrain = TERRAIN[t.type];
          const isSelected = selectedId === t.id;
          const isTarget = validTargets.has(t.id);
          const isStrike = strikeTargets.has(t.id);
          const known = visibleIds.has(t.id);
          const stroke = isSelected ? '#ffffff' : isStrike ? '#fb7185' : isTarget ? '#38bdf8' : '#0b1220';
          const sw = isSelected || isStrike || isTarget ? 1.4 : 0.5;
          return (
            <g key={t.id} onClick={() => handleClick(t.id)} style={{ cursor: 'pointer' }}>
              <polygon
                points={hexPolygon(t.x, t.y, HEX_SIZE * 0.94)}
                fill={owner ? owner.color : terrain.color}
                fillOpacity={owner ? 0.92 : 0.85}
                stroke={stroke}
                strokeWidth={sw}
                strokeDasharray={isStrike ? '1.5 1.2' : isTarget ? '2 1.4' : undefined}
              />
              <text className="hex-glyph" x={t.x} y={t.y - HEX_SIZE * 0.34}>
                {terrain.glyph}
              </text>
              <text className="hex-count" x={t.x} y={t.y + HEX_SIZE * 0.18}>
                {known ? tileTotal(ts) : '?'}
              </text>
            </g>
          );
        })}
      </svg>

      {children}

      <div className="zoom-controls">
        <button onClick={() => setZoom(view.z * 1.3)} aria-label="Zoom in">+</button>
        <button onClick={() => setZoom(view.z / 1.3)} aria-label="Zoom out">−</button>
      </div>
    </div>
  );
}
