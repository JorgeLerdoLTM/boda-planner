"use client";
import { useRef, useState, type DragEvent as RDragEvent, type PointerEvent as RPointerEvent } from "react";
import { C, glassCard } from "@/lib/theme";
import { PLAN, SEATING_AREA, firstFreeRun, footprint, isCircular, occupiedSeats, placementProblem, snap, type Pt, type VenueTable } from "@/lib/seating";
import type { SeatingStore } from "../seating-store";
import { TableShape } from "./TableShape";
import { clearDrag, currentDrag, hasDrag, readDrag } from "./dnd";

// SVG map in plan units (viewBox 960×540) over the venue PNG. Tables move with
// pointer events (persisted on release); guest cards and palette shapes arrive
// through HTML5 drag & drop.
export function VenueMap({ seating, readOnly = false }: { seating: SeatingStore; readOnly?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; start: Pt; origin: Pt; moved: boolean } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; bad: boolean } | null>(null);

  const toPlan = (clientX: number, clientY: number): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const tableAt = (p: Pt): VenueTable | undefined =>
    seating.tables.find((t) => { const f = footprint(t); return p.x >= f.x0 && p.x <= f.x1 && p.y >= f.y0 && p.y <= f.y1; });

  // ── table dragging ──
  const onPointerDown = (t: VenueTable) => (e: RPointerEvent<SVGGElement>) => {
    if (e.button !== 0) return;
    if (readOnly || t.locked) { seating.selectTable(t.id); return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: t.id, start: toPlan(e.clientX, e.clientY), origin: { x: t.x, y: t.y }, moved: false };
  };
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toPlan(e.clientX, e.clientY);
    if (!d.moved) {
      if (Math.hypot(p.x - d.start.x, p.y - d.start.y) < 1.5) return;
      d.moved = true; setDraggingId(d.id);
    }
    seating.moveTableLocal(d.id, snap(d.origin.x + p.x - d.start.x), snap(d.origin.y + p.y - d.start.y));
  };
  const onPointerUp = (t: VenueTable) => (e: RPointerEvent<SVGGElement>) => {
    const d = drag.current;
    drag.current = null; setDraggingId(null);
    if (!d) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d.moved) { seating.selectTable(t.id); return; }
    const p = toPlan(e.clientX, e.clientY);
    seating.commitTableMove(d.id, snap(d.origin.x + p.x - d.start.x), snap(d.origin.y + p.y - d.start.y), d.origin);
  };

  // ── drops from the palette / guest cards ──
  const onDragOver = (e: RDragEvent<SVGSVGElement>) => {
    if (readOnly || !hasDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const payload = currentDrag();
    if (payload?.kind !== "unit") { if (hover) setHover(null); return; }
    const t = tableAt(toPlan(e.clientX, e.clientY));
    if (!t) { if (hover) setHover(null); return; }
    const u = seating.unitByKey.get(payload.key);
    const circular = isCircular(t.shape);
    const occ = occupiedSeats(seating.assignmentsByTable.get(t.id) ?? [], t.capacity, circular, payload.key);
    const bad = !u || firstFreeRun(occ, t.capacity, u.seats, circular) == null;
    if (hover?.id !== t.id || hover.bad !== bad) setHover({ id: t.id, bad });
  };
  const onDrop = (e: RDragEvent<SVGSVGElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const payload = readDrag(e);
    clearDrag(); setHover(null);
    if (!payload) return;
    const p = toPlan(e.clientX, e.clientY);
    if (payload.kind === "shape") { seating.addTable(payload.shape, p); return; }
    const t = tableAt(p);
    if (t && seating.seatUnit(payload.key, t.id, null)) seating.selectTable(t.id);
  };

  const onBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = e.target as Element;
    const isBackground = el.tagName === "svg" || el.tagName === "image" || el.getAttribute("data-area") === "1";
    if (isBackground) seating.selectTable(null);
  };

  const legend = [
    { c: C.muted, bg: C.white, l: "Vacía" }, { c: C.yellowDk, bg: C.yellowLt, l: "Parcial" },
    { c: C.greenDk, bg: C.greenLt, l: "Llena" }, { c: C.danger, bg: "#FAE8E5", l: "Revisar / no cabe" },
  ];

  return (
    <div style={{ ...glassCard, padding: 8 }}>
      <svg ref={svgRef} viewBox={`0 0 ${PLAN.width} ${PLAN.height}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "none", userSelect: "none" }}
        onPointerMove={onPointerMove} onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setHover(null)}
        onClick={onBackgroundClick}>
        <image href="/mesas/mayita.png" x={0} y={0} width={PLAN.width} height={PLAN.height} preserveAspectRatio="none" />
        {!readOnly && (
          <rect data-area="1" x={SEATING_AREA.x0} y={SEATING_AREA.y0} width={SEATING_AREA.x1 - SEATING_AREA.x0} height={SEATING_AREA.y1 - SEATING_AREA.y0}
            fill="transparent" stroke={C.stone} strokeDasharray="4 3" />
        )}
        {seating.tables.map((t) => (
          <TableShape key={t.id} table={t} number={seating.numbering.get(t.id) ?? null}
            seated={(seating.assignmentsByTable.get(t.id) ?? []).reduce((s, a) => s + a.seats, 0)}
            selected={seating.selectedTableId === t.id}
            invalid={draggingId === t.id && placementProblem(t, seating.tables) !== null}
            hovered={hover?.id === t.id} hoverBad={hover?.id === t.id && hover.bad}
            conflict={(seating.conflictsByTable.get(t.id) ?? 0) > 0}
            onPointerDown={onPointerDown(t)} onPointerUp={onPointerUp(t)} />
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, padding: "8px 6px 2px", fontSize: 10, color: C.muted, flexWrap: "wrap" }}>
        {legend.map((l) => (
          <span key={l.l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: l.bg, border: `1px solid ${l.c}`, display: "inline-block" }} />{l.l}
          </span>
        ))}
        {!readOnly && <span style={{ marginLeft: "auto" }}>Arrastra mesas para moverlas · clic para ver sus asientos · área punteada = zona de mesas</span>}
      </div>
    </div>
  );
}
