import { useRef, useState } from 'react';
import {
  EDGES,
  POWER_BY_ID,
  TERRITORIES,
  TERRITORY_BY_ID,
} from '../engine';
import type { GameState } from '../engine';

const VW0 = 1000;
const VH0 = 520;
const TAP_THRESHOLD = 6; // px of movement still counts as a tap

interface Props {
  game: GameState;
  selectedId: string | null;
  validTargets: Set<string>;
  onTap: (id: string) => void;
}

function nodeRadius(value: number): number {
  return 9 + value * 1.5;
}

function fillFor(game: GameState, id: string): string {
  const owner = game.territories[id].owner;
  return owner ? POWER_BY_ID[owner].color : '#5b6b82';
}

export function WorldMap({ game, selectedId, validTargets, onTap }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ cx: 500, cy: 250, z: 1 });

  // Pointer bookkeeping for pan / pinch / tap discrimination.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const moved = useRef(false);
  const pinch = useRef<{ dist: number; z: number } | null>(null);

  const vw = VW0 / view.z;
  const vh = VH0 / view.z;
  const vx = view.cx - vw / 2;
  const vy = view.cy - vh / 2;

  function unitsPerPx(): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 1;
    return Math.max(vw / rect.width, vh / rect.height);
  }

  function clampCenter(cx: number, cy: number) {
    return {
      cx: Math.min(VW0, Math.max(0, cx)),
      cy: Math.min(VH0, Math.max(0, cy)),
    };
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
    setView((v) => {
      const { cx, cy } = clampCenter(v.cx - dx * upp, v.cy - dy * upp);
      return { ...v, cx, cy };
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    setZoom(view.z * (e.deltaY < 0 ? 1.15 : 0.87));
  }

  function handleNodeClick(id: string) {
    if (moved.current) return; // was a drag, not a tap
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
        {/* Connections */}
        <g>
          {EDGES.map((e, i) => {
            const a = TERRITORY_BY_ID[e.a];
            const b = TERRITORY_BY_ID[e.b];
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.type === 'sea' ? '#2a6f97' : '#3a4a63'}
                strokeWidth={0.8}
                strokeDasharray={e.type === 'sea' ? '4 3' : undefined}
                opacity={0.7}
              />
            );
          })}
        </g>

        {/* Territories */}
        <g>
          {TERRITORIES.map((t) => {
            const ts = game.territories[t.id];
            const r = nodeRadius(t.value);
            const isSelected = selectedId === t.id;
            const isTarget = validTargets.has(t.id);
            return (
              <g
                key={t.id}
                onClick={() => handleNodeClick(t.id)}
                style={{ cursor: 'pointer' }}
              >
                {isTarget && (
                  <circle cx={t.x} cy={t.y} r={r + 4} fill="none" stroke="#38bdf8" strokeWidth={1.6} strokeDasharray="3 2" />
                )}
                {isSelected && (
                  <circle cx={t.x} cy={t.y} r={r + 4} fill="none" stroke="#fff" strokeWidth={1.8} />
                )}
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={r}
                  fill={fillFor(game, t.id)}
                  stroke="#0b1220"
                  strokeWidth={1}
                />
                <text className="terr-count" x={t.x} y={t.y}>
                  {ts.armies}
                </text>
                {ts.navies > 0 && (
                  <text className="terr-count" x={t.x} y={t.y + r + 7} style={{ fontSize: 8 }}>
                    ⚓{ts.navies}
                  </text>
                )}
                <text className="terr-label" x={t.x} y={t.y - r - 3}>
                  {t.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="zoom-controls">
        <button onClick={() => setZoom(view.z * 1.3)} aria-label="Zoom in">+</button>
        <button onClick={() => setZoom(view.z / 1.3)} aria-label="Zoom out">−</button>
      </div>
    </div>
  );
}
