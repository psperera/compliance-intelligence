// Pure inline-SVG charts (render in server components — no client JS needed).
import React from "react";

export function LineChart({ values, color = "var(--blue)", height = 170 }: { values: number[]; color?: string; height?: number }) {
  const w = 600, h = height;
  const max = Math.max(...values), min = Math.min(...values) - 2;
  const pts = values.map((v, i) => [20 + i * ((w - 30) / (values.length - 1)), h - 22 - ((v - min) / (max - min || 1)) * (h - 44)] as const);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${path} L ${pts[pts.length - 1][0].toFixed(1)} ${h - 22} L 20 ${h - 22} Z`;
  const grid = [0, 1, 2, 3].map((i) => 22 + i * ((h - 44) / 3));
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend line">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((y, i) => <line key={i} x1="20" x2={w - 10} y1={y} y2={y} stroke="var(--line2)" />)}
      <path d={area} fill="url(#lg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="2.8" fill="#fff" stroke={color} strokeWidth="2" />)}
    </svg>
  );
}

export function Donut({ segments, size = 132, center }: { segments: { v: number; c: string }[]; size?: number; center?: React.ReactNode }) {
  const r = 45, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut">
        {segments.map((s, i) => {
          const len = (s.v / 100) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          off += len; return el;
        })}
      </svg>
      {center && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{center}</div>}
    </div>
  );
}
