"use client";
import { C, glassCard } from "@/lib/theme";
import { SHAPE_LABEL, isCircular, seatLabel } from "@/lib/seating";
import type { SeatingStore } from "../seating-store";
import { VenueMap } from "./VenueMap";

// Phones and tablets: look, don't touch. Map (scrollable) + list by table.
export function MesasMobile({ seating }: { seating: SeatingStore }) {
  const head = seating.tables.find((t) => t.shape === "head");
  const rest = seating.tables.filter((t) => t.shape !== "head").sort((a, b) => (seating.numbering.get(a.id) ?? 0) - (seating.numbering.get(b.id) ?? 0));
  const list = head ? [head, ...rest] : rest;
  const stat = (l: string, v: number | string) => (
    <div key={l}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.greenDk }}>{v}</div>
    </div>
  );
  return (
    <div>
      <div style={{ ...glassCard, padding: 12, marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
        {stat("Confirmados", seating.confirmedTotal)}{stat("Sentados", seating.seatedTotal)}
        {stat("Sin mesa", Math.max(0, seating.confirmedTotal - seating.seatedTotal))}{stat("Mesas", seating.placedTotal)}
      </div>
      <div style={{ overflowX: "auto", marginBottom: 12, WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: 900 }}><VenueMap seating={seating} readOnly /></div>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Para mover mesas o invitados abre esta pestaña en una computadora.</div>
      {list.map((t) => {
        const as = (seating.assignmentsByTable.get(t.id) ?? []).slice().sort((a, b) => a.seatIndex - b.seatIndex);
        const seated = as.reduce((s, a) => s + a.seats, 0);
        return (
          <div key={t.id} style={{ ...glassCard, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: C.greenDk }}>{t.shape === "head" ? "Mesa de honor" : `Mesa ${seating.numbering.get(t.id)}`}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{t.shape === "head" ? "" : `${SHAPE_LABEL[t.shape]} · `}{seated}/{t.capacity}</div>
            </div>
            {as.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 8, fontSize: 12, padding: "4px 0", borderTop: `1px solid ${C.stone}` }}>
                <span style={{ color: C.muted, width: 70, flexShrink: 0 }}>{seatLabel(a.seatIndex, a.seats, t.capacity, isCircular(t.shape))}</span>
                <span style={{ color: C.ink, flex: 1 }}>{a.label}</span>
                <span style={{ color: C.muted }}>{a.seats}</span>
              </div>
            ))}
            {as.length === 0 && <div style={{ fontSize: 11, color: C.muted, paddingTop: 4 }}>Vacía</div>}
          </div>
        );
      })}
    </div>
  );
}
