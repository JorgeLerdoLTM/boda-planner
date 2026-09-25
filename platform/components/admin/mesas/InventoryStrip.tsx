"use client";
import { useState, type DragEvent as RDragEvent } from "react";
import { C, glassCard } from "@/lib/theme";
import { SHAPE_LABEL, type TableShape as Shape } from "@/lib/seating";
import type { SeatingStore } from "../seating-store";
import { clearDrag, setDrag } from "./dnd";

type PlacedShape = Exclude<Shape, "head">;
const SHAPES: PlacedShape[] = ["round", "square", "rect"];

function ShapeIcon({ shape }: { shape: PlacedShape }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {shape === "round" ? <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        : shape === "square" ? <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
        : <rect x="1" y="5" width="14" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}

// Editable reserved count (hard cap) + placed/remaining + a palette button that
// can be clicked (adds at the first free spot) or dragged onto the map.
function ReservedCounter({ shape, reserved, placed, onChange, onAdd }: { shape: PlacedShape; reserved: number; placed: number; onChange: (n: number) => void; onAdd: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const exhausted = placed >= reserved;
  const commit = () => {
    if (draft == null) return;
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n !== reserved) onChange(n);
    setDraft(null);
  };
  const onDragStart = (e: RDragEvent<HTMLButtonElement>) => { if (exhausted) { e.preventDefault(); return; } setDrag(e, { kind: "shape", shape }); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{SHAPE_LABEL[shape]}s</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: exhausted ? C.danger : C.greenDk }}>{placed}</span>
          <span style={{ fontSize: 11, color: C.muted }}>/</span>
          <input value={draft ?? String(reserved)} onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))} onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setDraft(null); }}
            title="Mesas reservadas con el proveedor" inputMode="numeric" aria-label={`${SHAPE_LABEL[shape]}s reservadas`}
            style={{ width: 34, fontSize: 12, padding: "2px 4px", border: `1px solid ${C.stone}`, background: C.white, color: C.ink, fontFamily: "'Inter', sans-serif" }} />
          <span style={{ fontSize: 10, color: C.muted }}>reservadas</span>
        </div>
      </div>
      <button draggable={!exhausted} onDragStart={onDragStart} onDragEnd={clearDrag} onClick={onAdd} disabled={exhausted}
        title={exhausted ? `Ya colocaste las ${reserved} ${SHAPE_LABEL[shape].toLowerCase()}s reservadas` : "Clic: agregar en el primer hueco · Arrastrar: soltar en el plano"}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", border: `1px solid ${exhausted ? C.stone : C.greenDk}`, background: exhausted ? "#F0EFED" : C.white, color: exhausted ? C.stone : C.greenDk, cursor: exhausted ? "not-allowed" : "grab", fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
        <ShapeIcon shape={shape} /> + {SHAPE_LABEL[shape]}
      </button>
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div style={{ minWidth: 70 }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: warn ? C.yellowDk : C.greenDk, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>}
    </div>
  );
}

export function InventoryStrip({ seating }: { seating: SeatingStore }) {
  const unseated = Math.max(0, seating.confirmedTotal - seating.seatedTotal);
  return (
    <div style={{ ...glassCard, padding: "12px 16px", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center" }}>
      {SHAPES.map((s) => (
        <ReservedCounter key={s} shape={s} reserved={seating.reserved[s]} placed={seating.placed[s]}
          onChange={(n) => seating.setReserved(s, n)} onAdd={() => seating.addTable(s)} />
      ))}
      <div style={{ flex: 1 }} />
      <Stat label="Confirmados" value={seating.confirmedTotal} />
      <Stat label="Sentados" value={seating.seatedTotal} />
      <Stat label="Sin mesa" value={unseated} warn={unseated > 0} />
      <Stat label="Vacíos" value={seating.emptySeats} sub="asientos en mesas colocadas" />
      <Stat label="Mesas" value={`${seating.placedTotal} · mín. ${seating.minimum.total}`}
        sub={seating.minimum.fits ? `${seating.minimum.twelves} de 12 + ${seating.minimum.tens} de 10` : "la reserva no alcanza"} warn={!seating.minimum.fits} />
    </div>
  );
}
