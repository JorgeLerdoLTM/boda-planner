"use server";

import { requireCouple } from "@/lib/auth";
import { getGuestRows } from "@/lib/queries";
import * as sq from "@/lib/seating-queries";
import {
  CAPACITY, PROBLEM_MSG, SHAPE_PLURAL, buildUnits, confirmedSeats, firstFreeRun, isCircular, isConfirmedL1, numberTables,
  occupiedSeats, placementProblem, runIsFree, seatLabel, unitKey,
  type Rotation, type SeatAssignment, type SeatingLogRow, type SeatingParty, type SeatingState, type TableShape, type VenueTable,
} from "@/lib/seating";

// Server actions for the Mesas tab. Couple only. The server is authoritative:
// every mutation reloads state, re-validates with lib/seating and writes its
// log row(s) in the same transaction. Nothing here throws to the client — in
// production Next masks thrown messages, so we return {ok:false,error}.

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type Mutation<T = object> = ActionResult<T & { log: SeatingLogRow[] }>;
export type UnitRef = { householdId: string; partyId: string | null };
export type PartyInput = { id?: string; label: string; seats: number };
type PlacedShape = Exclude<TableShape, "head">;

const GENERIC = "No se pudo guardar el cambio. Recarga la página e inténtalo de nuevo.";
const CANNOT_REVERT = "Ya no se puede regresar ese movimiento";

const fail = (error: string) => ({ ok: false as const, error });
const ok = <T>(data: T) => ({ ok: true as const, data });

async function guarded<T>(fn: (role: string) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const s = await requireCouple();
    return await fn(s.role);
  } catch (e) {
    console.error("[seating]", e);
    return fail(GENERIC);
  }
}

const tableInfo = (t: VenueTable, numbering: Map<string, number>) => ({
  tableId: t.id, shape: t.shape, number: numbering.get(t.id) ?? null, x: t.x, y: t.y, rotation: t.rotation,
});
const seatInfo = (t: VenueTable, numbering: Map<string, number>, seatIndex: number, seats: number) => ({
  tableId: t.id, tableNumber: numbering.get(t.id) ?? null, seatIndex, seats,
  seatLabel: seatLabel(seatIndex, seats, t.capacity, isCircular(t.shape)),
});
const tableName = (t: VenueTable, numbering: Map<string, number>) =>
  t.shape === "head" ? "la Mesa de honor" : `la Mesa ${numbering.get(t.id) ?? "?"}`;

export async function getSeatingStateAction(): Promise<ActionResult<SeatingState>> {
  return guarded(async () => ok(await sq.getSeatingState()));
}

export async function getLogAction(beforeId: number): Promise<ActionResult<SeatingLogRow[]>> {
  return guarded(async () => ok(await sq.getLog(100, beforeId)));
}

export async function setReservedAction(shape: PlacedShape, n: number): Promise<Mutation> {
  return guarded(async (role) => {
    if (!Number.isInteger(n) || n < 0 || n > 60) return fail("Captura un número entre 0 y 60");
    const state = await sq.getSeatingState();
    const placed = state.tables.filter((t) => t.shape === shape).length;
    if (n < placed) return fail(`Ya hay ${placed} mesas ${SHAPE_PLURAL[shape]} colocadas; quítalas del mapa primero`);
    const log = await sq.setReserved(shape, n, { role, action: "inventory_changed", payload: { shape, before: state.reserved[shape], after: n } });
    return ok({ log });
  });
}

export async function addTableAction(shape: PlacedShape, x: number, y: number): Promise<Mutation<{ table: VenueTable }>> {
  return guarded(async (role) => {
    const state = await sq.getSeatingState();
    const placed = state.tables.filter((t) => t.shape === shape).length;
    if (placed >= state.reserved[shape]) return fail(`No hay más mesas ${SHAPE_PLURAL[shape]} reservadas (${state.reserved[shape]})`);
    const draft: VenueTable = { id: "new", shape, x, y, rotation: 0, capacity: CAPACITY[shape], locked: false };
    const problem = placementProblem(draft, state.tables);
    if (problem) return fail(PROBLEM_MSG[problem]);
    const numbering = numberTables([...state.tables, draft]);
    return ok(await sq.addTable(
      { shape, x, y, rotation: 0, capacity: CAPACITY[shape] },
      { role, action: "table_added", payload: { table: tableInfo(draft, numbering) } },
    ));
  });
}

export async function moveTableAction(id: string, x: number, y: number): Promise<Mutation> {
  return guarded(async (role) => {
    const state = await sq.getSeatingState();
    const t = state.tables.find((tb) => tb.id === id);
    if (!t) return fail("Esa mesa ya no existe");
    if (t.locked) return fail("La mesa de honor no se mueve");
    const moved = { ...t, x, y };
    const problem = placementProblem(moved, state.tables);
    if (problem) return fail(PROBLEM_MSG[problem]);
    const before = numberTables(state.tables);
    const after = numberTables(state.tables.map((tb) => (tb.id === id ? moved : tb)));
    const log = await sq.moveTable(id, x, y, {
      role, action: "table_moved",
      payload: { table: tableInfo(moved, after), before: { x: t.x, y: t.y, number: before.get(id) ?? null } },
    });
    return ok({ log });
  });
}

export async function rotateTableAction(id: string): Promise<Mutation<{ rotation: Rotation }>> {
  return guarded(async (role) => {
    const state = await sq.getSeatingState();
    const t = state.tables.find((tb) => tb.id === id);
    if (!t) return fail("Esa mesa ya no existe");
    if (t.shape !== "rect") return fail("Solo giran las mesas rectangulares");
    const rotation: Rotation = t.rotation === 90 ? 0 : 90;
    const rotated = { ...t, rotation };
    const problem = placementProblem(rotated, state.tables);
    if (problem) return fail(`Girada no cabe ahí: ${PROBLEM_MSG[problem].toLowerCase()}`);
    const log = await sq.rotateTable(id, rotation, { role, action: "table_rotated", payload: { table: tableInfo(rotated, numberTables(state.tables)) } });
    return ok({ rotation, log });
  });
}

export async function removeTableAction(id: string): Promise<Mutation> {
  return guarded(async (role) => {
    const state = await sq.getSeatingState();
    const t = state.tables.find((tb) => tb.id === id);
    if (!t) return fail("Esa mesa ya no existe");
    if (t.locked) return fail("La mesa de honor no se quita");
    const numbering = numberTables(state.tables);
    const seated = state.assignments.filter((a) => a.tableId === id);
    const logs: sq.LogEntry[] = [
      { role, action: "table_removed", payload: { table: tableInfo(t, numbering), seated: seated.length } },
      ...seated.map((a) => ({
        role, action: "unit_unseated",
        payload: { unit: { householdId: a.householdId, partyId: a.partyId, label: a.label, seats: a.seats }, from: seatInfo(t, numbering, a.seatIndex, a.seats), to: null, reason: "table_removed" },
      })),
    ];
    return ok({ log: await sq.removeTable(id, logs) });
  });
}

export async function definePartiesAction(householdId: string, parts: PartyInput[]): Promise<Mutation<{ parties: SeatingParty[]; removedUnitKeys: string[] }>> {
  return guarded(async (role) => {
    const [state, guests] = await Promise.all([sq.getSeatingState(), getGuestRows()]);
    const g = guests.find((x) => x.id === householdId);
    if (!g || !isConfirmedL1(g)) return fail("Ese hogar no está confirmado");
    const seats = confirmedSeats(g);
    if (seats <= 2) return fail("Solo se dividen hogares con más de 2 pases confirmados");
    const clean = parts.map((p) => ({ id: p.id, label: p.label.trim(), seats: Math.trunc(Number(p.seats)) }));
    if (clean.length === 0 || clean.some((p) => !p.label || !Number.isFinite(p.seats) || p.seats < 1)) return fail("Cada parte necesita nombre y al menos 1 asiento");
    const sum = clean.reduce((s, p) => s + p.seats, 0);
    if (sum !== seats) return fail(`Las partes suman ${sum} y el hogar confirmó ${seats}`);
    const existing = state.parties.filter((p) => p.householdId === householdId);
    const keptIds = new Set(clean.flatMap((p) => (p.id ? [p.id] : [])));
    if ([...keptIds].some((id) => !existing.some((p) => p.id === id))) return fail("Alguna parte ya no existe; recarga la página");
    const removed = existing.filter((p) => !keptIds.has(p.id));
    const removedAssignments = state.assignments.filter((a) => a.partyId && removed.some((p) => p.id === a.partyId));
    const numbering = numberTables(state.tables);
    const householdName = g.invitation || `${g.first} ${g.last}`.trim();
    const logs: sq.LogEntry[] = [
      { role, action: "parties_defined", payload: { householdId, householdName, parts: clean.map((p) => ({ label: p.label, seats: p.seats })) } },
      ...removedAssignments.flatMap((a) => {
        const t = state.tables.find((tb) => tb.id === a.tableId);
        return t ? [{ role, action: "unit_unseated", payload: { unit: { householdId, partyId: a.partyId, label: a.label, seats: a.seats }, from: seatInfo(t, numbering, a.seatIndex, a.seats), to: null, reason: "parties_defined" } }] : [];
      }),
    ];
    const res = await sq.replaceParties(householdId, clean, logs);
    return ok({ ...res, removedUnitKeys: removedAssignments.map(unitKey) });
  });
}

type Extra = { revertsLogId: number } | undefined;

async function doSeat(role: string, unit: UnitRef, tableId: string, seatIndex: number | null, extra?: Extra): Promise<Mutation<{ assignment: SeatAssignment }>> {
  const [state, guests] = await Promise.all([sq.getSeatingState(), getGuestRows()]);
  const key = unitKey(unit);
  const u = buildUnits(guests, state.parties).units.find((x) => x.key === key);
  if (!u) return fail("Ese invitado ya no está confirmado o su grupo cambió");
  const t = state.tables.find((tb) => tb.id === tableId);
  if (!t) return fail("Esa mesa ya no existe");
  const circular = isCircular(t.shape);
  const occ = occupiedSeats(state.assignments.filter((a) => a.tableId === t.id), t.capacity, circular, key);
  const idx = seatIndex ?? firstFreeRun(occ, t.capacity, u.seats, circular);
  const numbering = numberTables(state.tables);
  if (idx == null || !runIsFree(occ, t.capacity, idx, u.seats, circular)) return fail(`No caben ${u.seats} asiento(s) juntos en ${tableName(t, numbering)}`);
  const existing = state.assignments.find((a) => unitKey(a) === key);
  const fromTable = existing ? state.tables.find((tb) => tb.id === existing.tableId) : undefined;
  const applied = existing ? "unit_moved" : "unit_seated";
  const payload: Record<string, unknown> = {
    unit: { householdId: unit.householdId, partyId: unit.partyId, label: u.label, seats: u.seats, householdName: u.householdName },
    from: existing && fromTable ? seatInfo(fromTable, numbering, existing.seatIndex, existing.seats) : null,
    to: seatInfo(t, numbering, idx, u.seats),
    ...(extra ? { revertsLogId: extra.revertsLogId, applied } : {}),
  };
  return ok(await sq.upsertAssignment(
    { tableId: t.id, householdId: unit.householdId, partyId: unit.partyId, seatIndex: idx, seats: u.seats, label: u.label },
    { role, action: extra ? "revert" : applied, payload },
  ));
}

async function doUnseat(role: string, unit: UnitRef, extra?: Extra): Promise<Mutation> {
  const state = await sq.getSeatingState();
  const existing = state.assignments.find((a) => unitKey(a) === unitKey(unit));
  if (!existing) return fail("Ese invitado no tiene mesa");
  const t = state.tables.find((tb) => tb.id === existing.tableId);
  const numbering = numberTables(state.tables);
  const payload: Record<string, unknown> = {
    unit: { householdId: unit.householdId, partyId: unit.partyId, label: existing.label, seats: existing.seats },
    from: t ? seatInfo(t, numbering, existing.seatIndex, existing.seats) : null,
    to: null,
    ...(extra ? { revertsLogId: extra.revertsLogId, applied: "unit_unseated" } : {}),
  };
  const log = await sq.deleteAssignment(unit.householdId, unit.partyId, { role, action: extra ? "revert" : "unit_unseated", payload });
  return ok({ log });
}

// "Juntar lugares libres": close the gaps at a table so free seats sit together.
export async function compactTableAction(tableId: string): Promise<Mutation<{ moves: { id: string; seatIndex: number }[] }>> {
  return guarded(async (role) => {
    const state = await sq.getSeatingState();
    const t = state.tables.find((tb) => tb.id === tableId);
    if (!t) return fail("Esa mesa ya no existe");
    const numbering = numberTables(state.tables);
    const as = state.assignments.filter((a) => a.tableId === tableId).sort((a, b) => a.seatIndex - b.seatIndex);
    let next = 0;
    const moves: { id: string; seatIndex: number }[] = [];
    const logs: sq.LogEntry[] = [];
    for (const a of as) {
      if (a.seatIndex !== next) {
        moves.push({ id: a.id, seatIndex: next });
        logs.push({ role, action: "unit_moved", payload: {
          unit: { householdId: a.householdId, partyId: a.partyId, label: a.label, seats: a.seats },
          from: seatInfo(t, numbering, a.seatIndex, a.seats), to: seatInfo(t, numbering, next, a.seats), reason: "compact",
        } });
      }
      next += a.seats;
    }
    if (moves.length === 0) return ok({ moves, log: [] });
    return ok({ moves, log: await sq.compactTable(tableId, moves, logs) });
  });
}

export async function seatUnitAction(unit: UnitRef, tableId: string, seatIndex: number | null): Promise<Mutation<{ assignment: SeatAssignment }>> {
  return guarded((role) => doSeat(role, unit, tableId, seatIndex));
}

export async function unseatUnitAction(unit: UnitRef): Promise<Mutation> {
  return guarded((role) => doUnseat(role, unit));
}

// Inverse of a unit move, run through the same validation. Revert rows carry
// `applied` (what the inverse did) so they can be reverted again.
export async function revertAction(logId: number): Promise<Mutation> {
  return guarded(async (role) => {
    const row = await sq.getLogRow(logId);
    if (!row) return fail("No existe ese movimiento");
    const p = row.payload as { unit?: UnitRef; from?: { tableId: string; seatIndex: number } | null; applied?: string };
    const effective = row.action === "revert" ? p.applied : row.action;
    if (!p.unit || !effective || !["unit_seated", "unit_moved", "unit_unseated"].includes(effective)) return fail("Ese movimiento no se puede regresar");
    const unit: UnitRef = { householdId: p.unit.householdId, partyId: p.unit.partyId ?? null };
    if (effective === "unit_seated") {
      const r = await doUnseat(role, unit, { revertsLogId: logId });
      return r.ok ? r : fail(`${CANNOT_REVERT}: ${r.error}`);
    }
    if (!p.from) return fail(CANNOT_REVERT);
    const r = await doSeat(role, unit, p.from.tableId, p.from.seatIndex, { revertsLogId: logId });
    return r.ok ? ok({ log: r.data.log }) : fail(`${CANNOT_REVERT}: ${r.error}`);
  });
}
