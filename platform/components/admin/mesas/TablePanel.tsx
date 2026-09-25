"use client";
import { useState, type DragEvent as RDragEvent } from "react";
import { C, CAT_COLORS, glassCard } from "@/lib/theme";
import { SHAPE_LABEL, isCircular, occupiedSeats, runIsFree, runSeats, seatLabel, seatPositions, tableTopSize, unitKey, type SeatAssignment } from "@/lib/seating";
import type { SeatingStore } from "../seating-store";
import { UnitCard } from "./GuestPanel";
import { clearDrag, currentDrag, hasDrag, readDrag } from "./dnd";

const initials = (label: string) => label.split(/\s+/).filter((w) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w)).slice(0, 3).map((w) => w[0].toUpperCase()).join("");

// Selected table: seat diagram (drop a card on a chair to place it there),
// ordered list with unseat, rotate for rectangles, remove.
export function TablePanel({ seating }: { seating: SeatingStore }) {
  const [hoverSeat, setHoverSeat] = useState<{ i: number; bad: boolean; n: number } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const t = seating.tables.find((tb) => tb.id === seating.selectedTableId);
  if (!t) return null;

  const circular = isCircular(t.shape);
  const as = (seating.assignmentsByTable.get(t.id) ?? []).slice().sort((a, b) => a.seatIndex - b.seatIndex);
  const owner = new Map<number, { a: SeatAssignment; color: string }>();
  as.forEach((a, idx) => { for (const i of runSeats(a.seatIndex, a.seats, t.capacity, circular) ?? []) owner.set(i, { a, color: CAT_COLORS[idx % CAT_COLORS.length] }); });
  const seated = as.reduce((s, a) => s + a.seats, 0);
  const hasGaps = as.some((a, i) => a.seatIndex !== as.slice(0, i).reduce((s, x) => s + x.seats, 0));
  const title = t.shape === "head" ? "Mesa de honor" : `Mesa ${seating.numbering.get(t.id) ?? "?"}`;

  const positions = seatPositions(t.shape, t.rotation);
  const { w, h } = tableTopSize(t.shape, t.rotation);
  const xs = [...positions.map((p) => p.x), -w / 2, w / 2];
  const ys = [...positions.map((p) => p.y), -h / 2, h / 2];
  const pad = 9;
  const vb = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
  const hoverRun = hoverSeat ? new Set(runSeats(hoverSeat.i, hoverSeat.n, t.capacity, circular) ?? []) : new Set<number>();

  const dragUnit = () => { const p = currentDrag(); return p?.kind === "unit" ? seating.unitByKey.get(p.key) : undefined; };
  const onSeatDragOver = (i: number) => (e: RDragEvent<SVGGElement>) => {
    if (!hasDrag(e)) return;
    e.preventDefault(); e.stopPropagation();
    const p = currentDrag(); const u = dragUnit();
    if (p?.kind !== "unit") return;
    const occ = occupiedSeats(as, t.capacity, circular, p.key);
    const bad = !u || !runIsFree(occ, t.capacity, i, u.seats, circular);
    if (hoverSeat?.i !== i || hoverSeat.bad !== bad) setHoverSeat({ i, bad, n: u?.seats ?? 1 });
  };
  const onSeatDrop = (i: number) => (e: RDragEvent<SVGGElement>) => {
    e.preventDefault(); e.stopPropagation();
    const p = readDrag(e); clearDrag(); setHoverSeat(null);
    if (p?.kind === "unit") seating.seatUnit(p.key, t.id, i);
  };
  const onTableDrop = (e: RDragEvent<SVGSVGElement>) => { // anywhere else on the diagram = first free run
    e.preventDefault();
    const p = readDrag(e); clearDrag(); setHoverSeat(null);
    if (p?.kind === "unit") seating.seatUnit(p.key, t.id, null);
  };

  const smallBtn = { background: "transparent", border: `1px solid ${C.stone}`, color: C.muted, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" } as const;

  return (
    <div style={{ ...glassCard, padding: 12, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 260px)", minHeight: 420 }}>
      <button onClick={() => seating.selectTable(null)} style={{ ...smallBtn, alignSelf: "flex-start", marginBottom: 8 }}>← Invitados</button>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: C.greenDk }}>{title}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{t.shape === "head" ? "" : `${SHAPE_LABEL[t.shape]} · `}{seated}/{t.capacity}</div>
      </div>
      {(!t.locked || hasGaps) && (
        <div style={{ display: "flex", gap: 6, margin: "8px 0", flexWrap: "wrap" }}>
          {hasGaps && <button onClick={() => seating.compactTable(t.id)} title="Recorre a todos hacia el asiento 1 para que los lugares libres queden juntos" style={smallBtn}>Juntar lugares libres</button>}
          {!t.locked && t.shape === "rect" && <button onClick={() => seating.rotateTable(t.id)} style={smallBtn}>Girar 90°</button>}
          {t.locked ? null : !confirmRemove
            ? <button onClick={() => (seated > 0 ? setConfirmRemove(true) : seating.removeTable(t.id))} style={{ ...smallBtn, color: C.danger, borderColor: C.danger }}>Quitar mesa</button>
            : <>
                <span style={{ fontSize: 11, color: C.danger, alignSelf: "center" }}>¿Quitar la mesa y dejar a {as.length} grupo(s) sin mesa?</span>
                <button onClick={() => { setConfirmRemove(false); seating.removeTable(t.id); }} style={{ ...smallBtn, background: C.danger, color: C.white, border: "none" }}>Sí, quitar</button>
                <button onClick={() => setConfirmRemove(false)} style={smallBtn}>No</button>
              </>}
        </div>
      )}
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ width: "100%", height: "auto", display: "block", margin: "6px 0 10px", maxHeight: 220 }}
        onDragOver={(e) => { if (hasDrag(e)) e.preventDefault(); }} onDrop={onTableDrop} onDragLeave={() => setHoverSeat(null)}>
        {t.shape === "round" ? <circle r={w / 2} fill={C.cream} stroke={C.stone} />
          : t.shape === "head" ? <ellipse rx={w / 2} ry={h / 2} fill={C.cream} stroke={C.stone} />
          : <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={C.cream} stroke={C.stone} />}
        {positions.map((p, i) => {
          const o = owner.get(i);
          const inHover = hoverRun.has(i);
          const fill = inHover ? (hoverSeat?.bad ? "#FAE8E5" : C.blueLt) : o ? o.color : C.white;
          const stroke = inHover ? (hoverSeat?.bad ? C.danger : C.blue) : o ? o.color : C.muted;
          return (
            <g key={i} transform={`translate(${p.x} ${p.y})`} onDragOver={onSeatDragOver(i)} onDrop={onSeatDrop(i)} style={{ cursor: "default" }} data-seat={i}>
              <title>{`Asiento ${i + 1}${o ? ` · ${o.a.label}` : " · libre"}`}</title>
              <circle r={3.6} fill={fill} stroke={stroke} strokeWidth={0.6} />
              <text y={1.1} textAnchor="middle" fontSize={o ? 2.6 : 2.4} fontWeight={600} fill={o ? C.white : C.muted} fontFamily="'Inter', sans-serif" pointerEvents="none">
                {o ? initials(o.a.label) : i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {as.length === 0 && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 10 }}>Mesa vacía. Arrastra tarjetas aquí o a un asiento.</div>}
        {as.map((a, idx) => {
          const key = unitKey(a);
          const u = seating.unitByKey.get(key);
          const conflict = seating.conflicts.get(key);
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, alignSelf: "stretch", background: CAT_COLORS[idx % CAT_COLORS.length], marginBottom: 6 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Asientos {seatLabel(a.seatIndex, a.seats, t.capacity, circular)}</div>
                {u ? <UnitCard u={u} conflict={conflict} />
                  : <div style={{ padding: "8px 10px", marginBottom: 6, background: C.white, border: `1px solid ${C.danger}`, fontSize: 12, color: C.danger }}>{a.label || "(sin nombre)"} · REVISAR: ya no está confirmado</div>}
              </div>
              <button onClick={() => seating.unseatUnit(key)} title="Quitar de la mesa" aria-label={`Quitar a ${a.label} de la mesa`} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 18, marginBottom: 6 }}>×</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>Suelta una tarjeta sobre un asiento para acomodarla ahí; arrastra una de aquí a otra mesa del plano para cambiarla.</div>
    </div>
  );
}
