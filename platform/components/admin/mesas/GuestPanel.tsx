"use client";
import { useMemo, useState, type DragEvent as RDragEvent } from "react";
import { C, glassCard } from "@/lib/theme";
import type { AdminGuestRow } from "@/lib/queries";
import { confirmedSeats, isConfirmedL1, type ConflictKind, type SeatUnit } from "@/lib/seating";
import type { AdminStore } from "../store";
import type { SeatingStore } from "../seating-store";
import { clearDrag, setDrag } from "./dnd";
import { SplitHouseholdModal } from "./SplitHouseholdModal";

const SIDE_BAR = { Lorel: C.yellow, Coke: C.blue } as const;
const CONFLICT_TEXT: Record<ConflictKind, string> = {
  no_confirmado: "Ya no está confirmado",
  exceso: "Ahora necesita más asientos y no caben",
  partes_desactualizadas: "Sus grupos ya no suman los pases confirmados",
};

// One draggable seating unit (a whole 1–2 seat household, or one party).
export function UnitCard({ u, tableLabel, conflict, onDragStartExtra }: { u: SeatUnit; tableLabel?: string; conflict?: ConflictKind; onDragStartExtra?: () => void }) {
  const onDragStart = (e: RDragEvent<HTMLDivElement>) => { setDrag(e, { kind: "unit", key: u.key }); onDragStartExtra?.(); };
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={clearDrag} title={conflict ? CONFLICT_TEXT[conflict] : `${u.householdName} · ${u.group}`} data-unit-key={u.key}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: C.white, border: `1px solid ${conflict ? C.danger : C.stone}`, borderLeft: `4px solid ${SIDE_BAR[u.side]}`, cursor: "grab", fontSize: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.label}</div>
        <div style={{ color: C.muted, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {u.partyId ? `${u.householdName} · ` : ""}{u.group || "—"}{tableLabel ? ` · ${tableLabel}` : ""}
        </div>
      </div>
      {conflict && <span style={{ fontSize: 9, fontWeight: 600, color: C.danger, background: "#FAE8E5", padding: "2px 6px" }}>REVISAR</span>}
      <span style={{ fontSize: 11, fontWeight: 600, color: C.greenDk, background: C.greenLt, padding: "2px 7px" }}>{u.seats}</span>
    </div>
  );
}

const btn = (active: boolean) => ({
  padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  border: active ? "none" : `1px solid ${C.stone}`, background: active ? C.greenDk : "transparent", color: active ? C.white : C.muted,
}) as const;

export function GuestPanel({ store, seating }: { store: AdminStore; seating: SeatingStore }) {
  const [side, setSide] = useState<"All" | "Lorel" | "Coke">("All");
  const [group, setGroup] = useState("All");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"unseated" | "seated" | "all">("unseated");
  const [splitting, setSplitting] = useState<AdminGuestRow | null>(null);

  const confirmed = useMemo(() => store.guests.filter(isConfirmedL1), [store.guests]);
  const groups = useMemo(() => Array.from(new Set(confirmed.map((g) => g.group).filter(Boolean))).sort(), [confirmed]);
  const needle = q.trim().toLowerCase();
  const matches = (u: SeatUnit) =>
    (side === "All" || u.side === side) && (group === "All" || u.group === group) &&
    (!needle || `${u.label} ${u.householdName} ${u.first} ${u.last}`.toLowerCase().includes(needle));

  const units = seating.units.filter((u) => {
    const seated = seating.assignmentByUnit.has(u.key);
    return matches(u) && (status === "all" || (status === "seated") === seated);
  });
  // Households that still need their parties defined/updated (shown on top, not draggable).
  const pendingSplit = confirmed.filter((g) => {
    const need = seating.needsSplit.get(g.id);
    if (!need) return false;
    if (side !== "All" && g.side !== side) return false;
    if (group !== "All" && g.group !== group) return false;
    const name = g.invitation || `${g.first} ${g.last}`;
    return !needle || `${name} ${g.first} ${g.last}`.toLowerCase().includes(needle);
  });
  const tableLabel = (u: SeatUnit) => {
    const a = seating.assignmentByUnit.get(u.key);
    const t = a && seating.tables.find((tb) => tb.id === a.tableId);
    return t ? (t.shape === "head" ? "Mesa de honor" : `Mesa ${seating.numbering.get(t.id) ?? "?"}`) : undefined;
  };

  return (
    <div style={{ ...glassCard, padding: 12, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 260px)", minHeight: 420 }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Invitados confirmados · {seating.units.length + pendingSplit.length}</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {(["All", "Lorel", "Coke"] as const).map((s) => <button key={s} onClick={() => setSide(s)} style={btn(side === s)}>{s === "All" ? "Todos" : s}</button>)}
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Grupo" style={{ marginLeft: "auto", fontSize: 11, border: `1px solid ${C.stone}`, background: C.white, color: C.ink, padding: "4px 6px", maxWidth: 130, fontFamily: "'Inter', sans-serif" }}>
          <option value="All">Todos los grupos</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre…" aria-label="Buscar nombre"
        style={{ height: 34, padding: "0 10px", border: `1px solid ${C.stone}`, background: C.white, color: C.ink, fontSize: 12, marginBottom: 6, fontFamily: "'Inter', sans-serif" }} />
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {([["unseated", `Sin mesa (${seating.unseated.length})`], ["seated", "Con mesa"], ["all", "Todos"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} style={btn(status === k)}>{l}</button>
        ))}
      </div>
      <div style={{ overflowY: "auto", flex: 1, paddingRight: 2 }}>
        {pendingSplit.map((g) => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, background: C.yellowLt, border: `1px solid ${C.yellow}`, fontSize: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.invitation || `${g.first} ${g.last}`}</div>
              <div style={{ color: "#8B6914", fontSize: 10 }}>{confirmedSeats(g)} pases · {seating.needsSplit.get(g.id) === "actualizar" ? "los grupos ya no suman" : "define personas o parejas"}</div>
            </div>
            <button onClick={() => setSplitting(g)} style={{ ...btn(true), background: C.yellowDk }}>{seating.needsSplit.get(g.id) === "actualizar" ? "Actualizar grupos" : "Definir grupos"}</button>
          </div>
        ))}
        {units.map((u) => <UnitCard key={u.key} u={u} tableLabel={tableLabel(u)} conflict={seating.conflicts.get(u.key)} />)}
        {units.length === 0 && pendingSplit.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted, padding: 12, textAlign: "center" }}>{status === "unseated" ? "Todos los confirmados tienen mesa 🎉" : "Sin resultados"}</div>
        )}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>Arrastra una tarjeta a una mesa del plano.</div>
      {splitting && (
        <SplitHouseholdModal guest={splitting} parties={seating.parties.filter((p) => p.householdId === splitting.id)}
          onSave={(parts) => seating.defineParties(splitting.id, parts)} onClose={() => setSplitting(null)} />
      )}
    </div>
  );
}
