"use client";
import { useState } from "react";
import { C, glassCard } from "@/lib/theme";
import { SHAPE_LABEL, type SeatingLogRow, type TableShape } from "@/lib/seating";
import type { SeatingStore } from "../seating-store";

type SeatInfo = { tableId: string; tableNumber: number | null; seatLabel: string } | null;
type Payload = {
  unit?: { label: string; seats: number };
  from?: SeatInfo; to?: SeatInfo;
  table?: { shape: TableShape; number: number | null };
  shape?: TableShape; before?: unknown; after?: unknown;
  householdName?: string; parts?: { label: string; seats: number }[];
  applied?: string; reason?: string; seated?: number;
};

const mesa = (s: SeatInfo | undefined) => (!s ? "sin mesa" : s.tableNumber == null ? "la Mesa de honor" : `la Mesa ${s.tableNumber}`);
const asientos = (s: SeatInfo | undefined) => (s ? ` (asientos ${s.seatLabel})` : "");

// Human sentence for a log row — every name/number comes from the payload.
export function describeLog(row: SeatingLogRow): string {
  const p = row.payload as Payload;
  const tbl = p.table ? (p.table.shape === "head" ? "la Mesa de honor" : `la Mesa ${p.table.number ?? "?"} (${SHAPE_LABEL[p.table.shape].toLowerCase()})`) : "una mesa";
  const who = p.unit ? `${p.unit.label} (${p.unit.seats})` : "alguien";
  switch (row.action) {
    case "inventory_changed": return `Reserva de mesas ${SHAPE_LABEL[p.shape ?? "round"].toLowerCase()}s: ${String(p.before)} → ${String(p.after)}`;
    case "table_added": return `Agregó ${tbl}`;
    case "table_moved": return `Movió ${tbl}`;
    case "table_rotated": return `Giró ${tbl}`;
    case "table_removed": return `Quitó ${tbl}${p.seated ? ` con ${p.seated} grupo(s) sentados` : ""}`;
    case "parties_defined": return `Definió grupos de ${p.householdName ?? ""}: ${(p.parts ?? []).map((x) => `${x.label} (${x.seats})`).join(", ")}`;
    case "unit_seated": return `Sentó a ${who} en ${mesa(p.to)}${asientos(p.to)}`;
    case "unit_moved": return `Movió a ${who} de ${mesa(p.from)} a ${mesa(p.to)}${asientos(p.to)}`;
    case "unit_unseated": return `Quitó a ${who} de ${mesa(p.from)}${p.reason === "table_removed" ? " (mesa quitada)" : p.reason === "parties_defined" ? " (grupos redefinidos)" : ""}`;
    case "revert": return `Regresó: ${describeLog({ ...row, action: p.applied ?? "" })}`;
    default: return row.action;
  }
}

const REVERTIBLE = new Set(["unit_seated", "unit_moved", "unit_unseated", "revert"]);
const fmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function HistoryPanel({ seating }: { seating: SeatingStore }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const revert = async (id: number) => { setBusy(id); await seating.revert(id); setBusy(null); };
  return (
    <div style={{ ...glassCard, marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 16px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
        {open ? "▾" : "▸"} Historial de movimientos · {seating.log.length}
      </button>
      {open && (
        <div style={{ padding: "0 16px 12px", maxHeight: 320, overflowY: "auto" }}>
          {seating.log.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Todavía no hay movimientos.</div>}
          {seating.log.map((row) => (
            <div key={row.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.stone}`, fontSize: 12 }}>
              <span style={{ color: C.muted, fontSize: 10, width: 88, flexShrink: 0 }}>{fmt(row.createdAt)}</span>
              <span style={{ flex: 1, color: C.ink }}>{describeLog(row)}</span>
              {REVERTIBLE.has(row.action) && (
                <button onClick={() => revert(row.id)} disabled={busy != null} aria-label={`Regresar movimiento ${row.id}`}
                  style={{ background: "transparent", border: `1px solid ${C.stone}`, color: C.greenDk, padding: "3px 8px", fontSize: 10, cursor: busy != null ? "wait" : "pointer", fontFamily: "'Inter', sans-serif" }}>
                  {busy === row.id ? "…" : "Regresar"}
                </button>
              )}
            </div>
          ))}
          {seating.log.length >= 100 && (
            <button onClick={seating.loadMoreLog} style={{ marginTop: 8, background: "transparent", border: `1px solid ${C.stone}`, color: C.muted, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cargar más</button>
          )}
        </div>
      )}
    </div>
  );
}
