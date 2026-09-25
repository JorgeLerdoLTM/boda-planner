import "server-only";
import type postgres from "postgres";
import { sql } from "./db";
import {
  CAPACITY, HEAD_TABLE_POS,
  type Rotation, type SeatAssignment, type SeatingLogRow, type SeatingParty, type SeatingState, type TableShape, type VenueTable,
} from "./seating";

// SQL for the Mesas tab. Every mutation writes its seating_log rows in the same
// transaction and returns them so the client can prepend them to its history.

export interface LogEntry { role: string; action: string; payload: Record<string, unknown> }
export interface PartyRow { id?: string; label: string; seats: number }

type Db = postgres.TransactionSql; // every log row is written inside sql.begin()

// Capacity always follows the current rule per shape (lib/seating CAPACITY),
// so a rule change applies to tables placed before it without a data fix.
const mapTable = (r: postgres.Row): VenueTable => ({
  id: r.id, shape: r.shape as TableShape, x: Number(r.x), y: Number(r.y),
  rotation: Number(r.rotation) === 90 ? 90 : 0, capacity: CAPACITY[r.shape as TableShape] ?? Number(r.capacity), locked: !!r.locked,
});
const mapParty = (r: postgres.Row): SeatingParty => ({
  id: r.id, householdId: r.household_id, label: r.label ?? "", seats: Number(r.seats), sort: Number(r.sort),
});
const mapAssignment = (r: postgres.Row): SeatAssignment => ({
  id: r.id, tableId: r.table_id, householdId: r.household_id, partyId: r.party_id ?? null,
  seatIndex: Number(r.seat_index), seats: Number(r.seats), label: r.label ?? "",
});
const mapLog = (r: postgres.Row): SeatingLogRow => ({
  id: Number(r.id), role: r.role ?? "", action: r.action,
  payload: typeof r.payload === "object" && r.payload !== null ? (r.payload as Record<string, unknown>) : {},
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
});

const TABLE_COLS = sql`id, shape, x::float8, y::float8, rotation, capacity, locked`;
const ASSIGN_COLS = sql`id, table_id, household_id, party_id, seat_index, seats, label`;
const LOG_COLS = sql`id, role, action, payload, created_at`; // timestamptz arrives as a Date

async function writeLog(db: Db, e: LogEntry): Promise<SeatingLogRow> {
  // sql.json, NO `${x}::jsonb` (the driver would double-encode the payload).
  const [row] = await db`insert into seating_log (role, action, payload)
    values (${e.role}, ${e.action}, ${sql.json(e.payload as postgres.JSONValue)}) returning ${LOG_COLS}`;
  return mapLog(row);
}

export async function ensureHeadTable(): Promise<void> {
  await sql`insert into venue_tables (shape, x, y, rotation, capacity, locked)
    select 'head', ${HEAD_TABLE_POS.x}, ${HEAD_TABLE_POS.y}, 0, ${CAPACITY.head}, true
    where not exists (select 1 from venue_tables where shape = 'head')`;
}

export async function getSeatingState(): Promise<SeatingState> {
  await ensureHeadTable();
  const [tables, parties, assignments, settings, log] = await Promise.all([
    sql`select ${TABLE_COLS} from venue_tables order by created_at`,
    sql`select id, household_id, label, seats, sort from seating_parties order by household_id, sort`,
    sql`select ${ASSIGN_COLS} from seat_assignments`,
    sql`select tables_round, tables_square, tables_rect from settings where id = 1`,
    sql`select ${LOG_COLS} from seating_log order by id desc limit 100`,
  ]);
  const s = settings[0];
  return {
    tables: tables.map(mapTable),
    parties: parties.map(mapParty),
    assignments: assignments.map(mapAssignment),
    reserved: { round: Number(s?.tables_round ?? 20), square: Number(s?.tables_square ?? 10), rect: Number(s?.tables_rect ?? 10) },
    log: log.map(mapLog),
  };
}

export async function getLog(limit = 100, beforeId?: number): Promise<SeatingLogRow[]> {
  const rows = beforeId != null
    ? await sql`select ${LOG_COLS} from seating_log where id < ${beforeId} order by id desc limit ${limit}`
    : await sql`select ${LOG_COLS} from seating_log order by id desc limit ${limit}`;
  return rows.map(mapLog);
}

export async function getLogRow(id: number): Promise<SeatingLogRow | null> {
  const [row] = await sql`select ${LOG_COLS} from seating_log where id = ${id}`;
  return row ? mapLog(row) : null;
}

const RESERVED_COL: Record<Exclude<TableShape, "head">, string> = { round: "tables_round", square: "tables_square", rect: "tables_rect" };

export async function setReserved(shape: Exclude<TableShape, "head">, n: number, log: LogEntry): Promise<SeatingLogRow[]> {
  return sql.begin(async (tx) => {
    await tx`update settings set ${sql(RESERVED_COL[shape])} = ${n} where id = 1`;
    return [await writeLog(tx, log)];
  });
}

export async function addTable(
  t: { shape: TableShape; x: number; y: number; rotation: Rotation; capacity: number },
  log: LogEntry,
): Promise<{ table: VenueTable; log: SeatingLogRow[] }> {
  return sql.begin(async (tx) => {
    const [row] = await tx`insert into venue_tables (shape, x, y, rotation, capacity, locked)
      values (${t.shape}, ${t.x}, ${t.y}, ${t.rotation}, ${t.capacity}, false) returning ${TABLE_COLS}`;
    const table = mapTable(row);
    const prev = (log.payload.table ?? {}) as Record<string, unknown>;
    const entry = await writeLog(tx, { ...log, payload: { ...log.payload, table: { ...prev, tableId: table.id } } });
    return { table, log: [entry] };
  });
}

export async function moveTable(id: string, x: number, y: number, log: LogEntry): Promise<SeatingLogRow[]> {
  return sql.begin(async (tx) => {
    await tx`update venue_tables set x = ${x}, y = ${y} where id = ${id} and not locked`;
    return [await writeLog(tx, log)];
  });
}

export async function rotateTable(id: string, rotation: Rotation, log: LogEntry): Promise<SeatingLogRow[]> {
  return sql.begin(async (tx) => {
    await tx`update venue_tables set rotation = ${rotation} where id = ${id} and not locked`;
    return [await writeLog(tx, log)];
  });
}

// Assignments cascade away with the table; one unit_unseated entry per seated unit
// is passed in `logs` (after the table_removed entry) so History can restore them.
export async function removeTable(id: string, logs: LogEntry[]): Promise<SeatingLogRow[]> {
  return sql.begin(async (tx) => {
    await tx`delete from venue_tables where id = ${id} and not locked`;
    const out: SeatingLogRow[] = [];
    for (const l of logs) out.push(await writeLog(tx, l));
    return out;
  });
}

// Keeps rows whose id is passed back (their assignments survive), updates their
// label/seats/sort, inserts the rest, deletes the ones left out (assignments cascade).
export async function replaceParties(householdId: string, parts: PartyRow[], logs: LogEntry[]): Promise<{ parties: SeatingParty[]; log: SeatingLogRow[] }> {
  return sql.begin(async (tx) => {
    const keep = parts.flatMap((p) => (p.id ? [p.id] : []));
    if (keep.length > 0) await tx`delete from seating_parties where household_id = ${householdId} and id not in ${sql(keep)}`;
    else await tx`delete from seating_parties where household_id = ${householdId}`;
    for (const [i, p] of parts.entries()) {
      if (p.id) await tx`update seating_parties set label = ${p.label}, seats = ${p.seats}, sort = ${i} where id = ${p.id} and household_id = ${householdId}`;
      else await tx`insert into seating_parties (household_id, label, seats, sort) values (${householdId}, ${p.label}, ${p.seats}, ${i})`;
    }
    const rows = await tx`select id, household_id, label, seats, sort from seating_parties where household_id = ${householdId} order by sort`;
    const out: SeatingLogRow[] = [];
    for (const l of logs) out.push(await writeLog(tx, l));
    return { parties: rows.map(mapParty), log: out };
  });
}

export async function upsertAssignment(
  a: { tableId: string; householdId: string; partyId: string | null; seatIndex: number; seats: number; label: string },
  log: LogEntry,
): Promise<{ assignment: SeatAssignment; log: SeatingLogRow[] }> {
  return sql.begin(async (tx) => {
    await tx`delete from seat_assignments where household_id = ${a.householdId} and party_id is not distinct from ${a.partyId}`;
    const [row] = await tx`insert into seat_assignments (table_id, household_id, party_id, seat_index, seats, label)
      values (${a.tableId}, ${a.householdId}, ${a.partyId}, ${a.seatIndex}, ${a.seats}, ${a.label}) returning ${ASSIGN_COLS}`;
    return { assignment: mapAssignment(row), log: [await writeLog(tx, log)] };
  });
}

export async function deleteAssignment(householdId: string, partyId: string | null, log: LogEntry): Promise<SeatingLogRow[]> {
  return sql.begin(async (tx) => {
    await tx`delete from seat_assignments where household_id = ${householdId} and party_id is not distinct from ${partyId}`;
    return [await writeLog(tx, log)];
  });
}
