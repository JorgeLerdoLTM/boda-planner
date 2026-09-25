"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { AdminGuestRow } from "@/lib/queries";
import {
  CAPACITY, EMPTY_SEATING, PROBLEM_MSG, SHAPE_PLURAL, buildUnits, confirmedSeats, firstFreeRun, firstFreeSpot, isCircular,
  isConfirmedL1, minTables, numberTables, occupiedSeats, placementProblem, runIsFree, seatingConflicts, snap, unitKey,
  type Pt, type SeatAssignment, type SeatingLogRow, type SeatingState, type TableShape, type VenueTable,
} from "@/lib/seating";
import {
  addTableAction, compactTableAction, definePartiesAction, getLogAction, getSeatingStateAction, moveTableAction, removeTableAction,
  revertAction, rotateTableAction, seatUnitAction, setReservedAction, unseatUnitAction,
  type ActionResult, type PartyInput,
} from "@/app/admin/seating-actions";

// Optimistic state for the Mesas tab, mirroring useAdminStore's conventions:
// apply locally, persist, and on a server "no" show the message and take the
// server's state back (resync). Lives in AdminApp so tab switches keep it.

type PlacedShape = Exclude<TableShape, "head">;

const SAVE_ERROR_MSG =
  "El último cambio de mesas NO se guardó. Esto pasa cuando la página quedó abierta durante una actualización — recarga la página y vuelve a hacerlo.";

export function useSeatingStore(initial: SeatingState | null, guests: AdminGuestRow[]) {
  const base = initial ?? EMPTY_SEATING;
  const [tables, setTables] = useState(base.tables);
  const [parties, setParties] = useState(base.parties);
  const [assignments, setAssignments] = useState(base.assignments);
  const [reserved, setReservedState] = useState(base.reserved);
  const [log, setLog] = useState(base.log);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // ── derived ──
  const { units, needsSplit } = useMemo(() => buildUnits(guests, parties), [guests, parties]);
  const unitByKey = useMemo(() => new Map(units.map((u) => [u.key, u])), [units]);
  const assignmentByUnit = useMemo(() => new Map(assignments.map((a) => [unitKey(a), a])), [assignments]);
  const assignmentsByTable = useMemo(() => {
    const m = new Map<string, SeatAssignment[]>();
    for (const a of assignments) m.set(a.tableId, [...(m.get(a.tableId) ?? []), a]);
    return m;
  }, [assignments]);
  const numbering = useMemo(() => numberTables(tables), [tables]);
  const conflicts = useMemo(() => seatingConflicts(units, needsSplit, assignments, tables), [units, needsSplit, assignments, tables]);
  const conflictsByTable = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) if (conflicts.has(unitKey(a))) m.set(a.tableId, (m.get(a.tableId) ?? 0) + 1);
    return m;
  }, [assignments, conflicts]);
  const unseated = useMemo(() => units.filter((u) => !assignmentByUnit.has(u.key)), [units, assignmentByUnit]);
  const confirmedTotal = useMemo(() => guests.filter(isConfirmedL1).reduce((s, g) => s + confirmedSeats(g), 0), [guests]);
  const seatedTotal = useMemo(() => assignments.reduce((s, a) => s + a.seats, 0), [assignments]);
  const placed = useMemo(() => ({
    round: tables.filter((t) => t.shape === "round").length,
    square: tables.filter((t) => t.shape === "square").length,
    rect: tables.filter((t) => t.shape === "rect").length,
  }), [tables]);
  const placedTotal = placed.round + placed.square + placed.rect;
  const capacityTotal = useMemo(() => tables.reduce((s, t) => s + t.capacity, 0), [tables]);
  const emptySeats = capacityTotal - seatedTotal;
  const minimum = useMemo(() => minTables(confirmedTotal, reserved), [confirmedTotal, reserved]);
  const tableName = useCallback((t: VenueTable) => (t.shape === "head" ? "la Mesa de honor" : `la Mesa ${numbering.get(t.id) ?? "?"}`), [numbering]);

  // Always-current snapshot for handlers that fire from pointer/drag events.
  const latest = useRef({ tables, assignments, unitByKey, numbering, placed, reserved });
  useEffect(() => { latest.current = { tables, assignments, unitByKey, numbering, placed, reserved }; });

  // ── persistence ──
  const applyState = useCallback((s: SeatingState) => {
    setTables(s.tables); setParties(s.parties); setAssignments(s.assignments); setReservedState(s.reserved); setLog(s.log);
  }, []);
  const resync = useCallback(async () => {
    try {
      const r = await getSeatingStateAction();
      if (r.ok) applyState(r.data);
    } catch (e) { console.error("[seating resync]", e); }
  }, [applyState]);

  // Caller already applied the optimistic change. {ok:false} → notice + resync
  // (server wins). Thrown (network/deploy) → red banner + resync.
  const run = useCallback(async <T extends { log: SeatingLogRow[] }>(p: Promise<ActionResult<T>>): Promise<T | undefined> => {
    try {
      const r = await p;
      if (!r.ok) { setNotice(r.error); void resync(); return undefined; }
      setSaveError(null); setSavedAt(Date.now());
      setLog((prev) => [...r.data.log.slice().reverse(), ...prev]);
      return r.data;
    } catch (e) {
      console.error("[seating persist]", e);
      setSaveError(SAVE_ERROR_MSG); void resync();
      return undefined;
    }
  }, [resync]);

  // ── mutations ──
  const setReserved = useCallback((shape: PlacedShape, n: number) => {
    const { placed } = latest.current;
    if (n < placed[shape]) { setNotice(`Ya hay ${placed[shape]} mesas ${SHAPE_PLURAL[shape]} colocadas; quítalas del mapa primero`); return; }
    setReservedState((r) => ({ ...r, [shape]: n }));
    void run(setReservedAction(shape, n));
  }, [run]);

  const addTable = useCallback((shape: PlacedShape, at?: Pt) => {
    const { tables, placed, reserved } = latest.current;
    if (placed[shape] >= reserved[shape]) { setNotice(`No hay más mesas ${SHAPE_PLURAL[shape]} reservadas (${reserved[shape]})`); return; }
    const pos = at ? { x: snap(at.x), y: snap(at.y) } : firstFreeSpot(shape, tables);
    if (!pos) { setNotice("No hay espacio libre en el plano"); return; }
    const draft: VenueTable = { id: `tmp-${Date.now()}`, shape, x: pos.x, y: pos.y, rotation: 0, capacity: CAPACITY[shape], locked: false };
    const problem = placementProblem(draft, tables);
    if (problem) { setNotice(PROBLEM_MSG[problem]); return; }
    setTables((p) => [...p, draft]);
    void run(addTableAction(shape, pos.x, pos.y)).then((d) => {
      if (d) { setTables((p) => p.map((t) => (t.id === draft.id ? d.table : t))); setSelectedTableId(d.table.id); }
    });
  }, [run]);

  const moveTableLocal = useCallback((id: string, x: number, y: number) => {
    setTables((p) => p.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  const commitTableMove = useCallback((id: string, x: number, y: number, from: Pt) => {
    const { tables } = latest.current;
    const t = tables.find((tb) => tb.id === id);
    if (!t) return;
    const moved = { ...t, x, y };
    const problem = placementProblem(moved, tables);
    if (problem) {
      setNotice(PROBLEM_MSG[problem]);
      setTables((p) => p.map((tb) => (tb.id === id ? { ...tb, x: from.x, y: from.y } : tb)));
      return;
    }
    setTables((p) => p.map((tb) => (tb.id === id ? moved : tb)));
    void run(moveTableAction(id, x, y));
  }, [run]);

  const rotateTable = useCallback((id: string) => {
    const { tables } = latest.current;
    const t = tables.find((tb) => tb.id === id);
    if (!t || t.shape !== "rect") return;
    const rotated: VenueTable = { ...t, rotation: t.rotation === 90 ? 0 : 90 };
    const problem = placementProblem(rotated, tables);
    if (problem) { setNotice(`Girada no cabe ahí: ${PROBLEM_MSG[problem].toLowerCase()}`); return; }
    setTables((p) => p.map((tb) => (tb.id === id ? rotated : tb)));
    void run(rotateTableAction(id));
  }, [run]);

  const removeTable = useCallback((id: string) => {
    setTables((p) => p.filter((t) => t.id !== id));
    setAssignments((p) => p.filter((a) => a.tableId !== id));
    setSelectedTableId((s) => (s === id ? null : s));
    void run(removeTableAction(id));
  }, [run]);

  const defineParties = useCallback(async (householdId: string, parts: PartyInput[]): Promise<boolean> => {
    const d = await run(definePartiesAction(householdId, parts));
    if (!d) return false;
    setParties((p) => [...p.filter((x) => x.householdId !== householdId), ...d.parties]);
    if (d.removedUnitKeys.length > 0) setAssignments((p) => p.filter((a) => !d.removedUnitKeys.includes(unitKey(a))));
    return true;
  }, [run]);

  // seatIndex null = first free run. Returns false (with a notice) when it does not fit.
  const seatUnit = useCallback((key: string, tableId: string, seatIndex: number | null): boolean => {
    const { tables, assignments, unitByKey, numbering } = latest.current;
    const u = unitByKey.get(key);
    const t = tables.find((tb) => tb.id === tableId);
    if (!u || !t) return false;
    const circular = isCircular(t.shape);
    const occ = occupiedSeats(assignments.filter((a) => a.tableId === tableId), t.capacity, circular, key);
    const idx = seatIndex ?? firstFreeRun(occ, t.capacity, u.seats, circular);
    if (idx == null || !runIsFree(occ, t.capacity, idx, u.seats, circular)) {
      setNotice(`No caben ${u.seats} asiento(s) juntos en ${t.shape === "head" ? "la Mesa de honor" : `la Mesa ${numbering.get(t.id) ?? "?"}`}`);
      return false;
    }
    const draft: SeatAssignment = { id: `tmp-${key}`, tableId, householdId: u.householdId, partyId: u.partyId, seatIndex: idx, seats: u.seats, label: u.label };
    setAssignments((p) => [...p.filter((a) => unitKey(a) !== key), draft]);
    void run(seatUnitAction({ householdId: u.householdId, partyId: u.partyId }, tableId, idx)).then((d) => {
      if (d) setAssignments((p) => p.map((a) => (a.id === draft.id ? d.assignment : a)));
    });
    return true;
  }, [run]);

  const unseatUnit = useCallback((key: string) => {
    const a = latest.current.assignments.find((x) => unitKey(x) === key);
    if (!a) return;
    setAssignments((p) => p.filter((x) => unitKey(x) !== key));
    void run(unseatUnitAction({ householdId: a.householdId, partyId: a.partyId }));
  }, [run]);

  const compactTable = useCallback((tableId: string) => {
    const as = latest.current.assignments.filter((a) => a.tableId === tableId).sort((a, b) => a.seatIndex - b.seatIndex);
    let next = 0;
    const moves = new Map<string, number>();
    for (const a of as) { if (a.seatIndex !== next) moves.set(a.id, next); next += a.seats; }
    if (moves.size === 0) return;
    setAssignments((p) => p.map((a) => (moves.has(a.id) ? { ...a, seatIndex: moves.get(a.id)! } : a)));
    void run(compactTableAction(tableId));
  }, [run]);

  const revert = useCallback(async (logId: number) => {
    const d = await run(revertAction(logId));
    if (d) await resync(); // the inverse may have touched anything: take the server's truth
  }, [run, resync]);

  const loadMoreLog = useCallback(async () => {
    const last = log[log.length - 1];
    if (!last) return;
    try {
      const r = await getLogAction(last.id);
      if (r.ok) setLog((p) => [...p, ...r.data]);
    } catch (e) { console.error("[seating log]", e); }
  }, [log]);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    tables, parties, assignments, reserved, log, notice, saveError, savedAt, selectedTableId,
    units, needsSplit, unitByKey, assignmentByUnit, assignmentsByTable, numbering, conflicts, conflictsByTable, unseated,
    confirmedTotal, seatedTotal, placed, placedTotal, capacityTotal, emptySeats, minimum, tableName,
    setReserved, addTable, moveTableLocal, commitTableMove, rotateTable, removeTable, defineParties, seatUnit, unseatUnit,
    compactTable, revert, loadMoreLog, selectTable: setSelectedTableId, dismissNotice, dismissSaveError, resync,
  };
}

export type SeatingStore = ReturnType<typeof useSeatingStore>;
