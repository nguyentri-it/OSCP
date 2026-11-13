import { useState } from 'react';
import SimHow from './SimHow';
// @ts-ignore: module JS dùng chung với scripts/check-diagrams.mjs
import { nodeSize, edgeGeom, zoneLabelRect } from '../../lib/diagram-layout.js';

export interface MapNode {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  detail: string;
  tone?: 'accent' | 'warn' | 'muted' | 'bad' | 'good';
}

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface MapZone {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  title?: string;
  width?: number;
  height?: number;
  nodes: MapNode[];
  edges?: MapEdge[];
  zones?: MapZone[];
  hint?: string;
}

// Sơ đồ khái niệm: bấm vào từng ô để xem giải thích.
export default function ConceptMap({
  title,
  width = 640,
  height = 360,
  nodes,
  edges = [],
  zones = [],
  hint = "Chưa chọn ô nào.",
}: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const selected = sel ? byId[sel] : null;

  return (
    <div className="sim cmap">
      {title && <p className="sim-title">{title}</p>}
      <SimHow steps={["Bấm vào một ô trong sơ đồ, phần giải thích hiện ngay bên dưới. Bấm lại lần nữa để bỏ chọn."]} />
      <div className="sim-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={title ?? 'Sơ đồ'}>
          <defs>
            <marker id="cmap-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="cmap-head" />
            </marker>
          </defs>
          {zones.map((z) => (
            <g key={z.label}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={12} className="cmap-zone" />
              <text x={zoneLabelRect(z).x1} y={z.y + 20} className="cmap-zone-text">
                {z.label}
              </text>
            </g>
          ))}
          {edges.map((e, i) => {
            const a = byId[e.from];
            const b = byId[e.to];
            if (!a || !b) return null;
            const { p1, p2, lx, ly, lw } = edgeGeom(a, b, e.label);
            const on = sel === e.from || sel === e.to;
            return (
              <g key={i} className={`cmap-edge ${on ? 'on' : ''}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  strokeDasharray={e.dashed ? '5 5' : undefined}
                  markerEnd="url(#cmap-arrow)"
                />
                {e.label && (
                  <g className="cmap-edge-pill">
                    <rect x={lx - lw / 2} y={ly - 10} width={lw} height={20} rx={5} className="cmap-edge-bg" />
                    <text x={lx} y={ly + 4} textAnchor="middle" className="cmap-edge-text">
                      {e.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {nodes.map((n) => {
            const { w, h, lines } = nodeSize(n);
            const active = sel === n.id;
            const baseY = n.sub ? (lines.length > 1 ? n.y - 12 : n.y - 3) : (lines.length > 1 ? n.y - 4 : n.y + 5);
            return (
              <g
                key={n.id}
                className={`cmap-node ${n.tone ?? ''} ${active ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={n.label}
                onClick={() => setSel(active ? null : n.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setSel(active ? null : n.id);
                  }
                }}
              >
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={8} />
                <text x={n.x} y={baseY} textAnchor="middle" className="cmap-label">
                  {lines.map((line, idx) => (
                    <tspan key={idx} x={n.x} dy={idx === 0 ? 0 : 15}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {n.sub && (
                  <text x={n.x} y={lines.length > 1 ? n.y + 19 : n.y + 14} textAnchor="middle" className="cmap-sub">
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="sim-note" aria-live="polite">
        {selected ? (
          <>
            <strong>{selected.label}.</strong> {selected.detail}
          </>
        ) : (
          <span className="muted">{hint}</span>
        )}
      </div>
    </div>
  );
}
