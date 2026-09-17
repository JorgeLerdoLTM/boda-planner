"use client";
import type { PointerEvent as RPointerEvent } from "react";
import { C } from "@/lib/theme";
import { seatPositions, tableTopSize, type VenueTable } from "@/lib/seating";

// Draws a table in plan units at its centre: chairs, top, number and fill.
// Colours: stone = empty, amber = partly full, green = full, red = problem.
export function TableShape({ table: t, number, seated, selected, invalid, hovered, hoverBad, conflict, onPointerDown, onPointerUp }: {
  table: VenueTable;
  number: number | null;
  seated: number;
  selected: boolean;
  invalid: boolean;
  hovered: boolean;
  hoverBad: boolean;
  conflict: boolean;
  onPointerDown?: (e: RPointerEvent<SVGGElement>) => void;
  onPointerUp?: (e: RPointerEvent<SVGGElement>) => void;
}) {
  const { w, h } = tableTopSize(t.shape, t.rotation);
  const full = seated >= t.capacity;
  const bad = invalid || hoverBad || conflict;
  const stroke = bad ? C.danger : hovered ? C.blue : full ? C.greenDk : seated > 0 ? C.yellowDk : C.muted;
  const fill = bad ? "#FAE8E5" : hovered ? C.blueLt : full ? C.greenLt : seated > 0 ? C.yellowLt : C.white;
  const sw = selected ? 2 : 1;
  const chairs = t.shape === "head" ? [] : seatPositions(t.shape, t.rotation); // the plan PNG already has the head chairs
  return (
    <g transform={`translate(${t.x} ${t.y})`} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
      style={{ cursor: t.locked ? "pointer" : "grab" }} data-table-id={t.id}>
      {chairs.map((c, i) => (
        <rect key={i} x={c.x - 2} y={c.y - 2} width={4} height={4} fill={C.white} stroke={C.muted} strokeWidth={0.5} />
      ))}
      {t.shape === "round" ? <circle r={w / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
        : t.shape === "head" ? <ellipse rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
        : <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={sw} />}
      <text y={-1} textAnchor="middle" fontSize={t.shape === "head" ? 7 : 8} fontWeight={600} fill={C.ink} fontFamily="'Inter', sans-serif" pointerEvents="none">
        {t.shape === "head" ? "Honor" : number ?? ""}
      </text>
      <text y={6.5} textAnchor="middle" fontSize={5} fill={bad ? C.danger : C.muted} fontFamily="'Inter', sans-serif" pointerEvents="none">
        {seated}/{t.capacity}
      </text>
    </g>
  );
}
