// Pure seating geometry & rules for the Mesas tab. No I/O — unit tested.
// Coordinates are "plan units": the venue PDF's 960×540 space, y down.
// Scale ≈ 13.7 units per metre (a round top = 24.6 units ≈ 1.80 m).

import type { AdminGuestRow } from "./queries";
import type { Side } from "./types";

export type TableShape = "round" | "square" | "rect" | "head";
export type Rotation = 0 | 90;

export interface VenueTable {
  id: string;
  shape: TableShape;
  x: number;
  y: number;
  rotation: Rotation;
  capacity: number;
  locked: boolean;
}

export interface SeatingParty {
  id: string;
  householdId: string;
  label: string;
  seats: number;
  sort: number;
}

export interface SeatAssignment {
  id: string;
  tableId: string;
  householdId: string;
  partyId: string | null;
  seatIndex: number;
  seats: number; // frozen at seating time
  label: string; // frozen at seating time
}

export interface Reserved { round: number; square: number; rect: number }

export interface SeatUnit {
  key: string; // `${householdId}:${partyId ?? "all"}`
  householdId: string;
  partyId: string | null;
  label: string; // party label, or the household's invitation name
  householdName: string;
  first: string;
  last: string;
  seats: number;
  side: Side;
  group: string;
}

export interface SeatingLogRow {
  id: number;
  role: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string; // ISO
}

export interface SeatingState {
  tables: VenueTable[];
  parties: SeatingParty[];
  assignments: SeatAssignment[];
  reserved: Reserved;
  log: SeatingLogRow[];
}

export interface Pt { x: number; y: number }
export interface Rect { x0: number; y0: number; x1: number; y1: number }

export const PLAN = { width: 960, height: 540 } as const;
export const GRID = 2;
export const CAPACITY: Record<TableShape, number> = { round: 12, square: 10, rect: 10, head: 13 };
export const SHAPE_LABEL: Record<TableShape, string> = { round: "Redonda", square: "Cuadrada", rect: "Rectangular", head: "Mesa de honor" };
export const SHAPE_PLURAL: Record<Exclude<TableShape, "head">, string> = { round: "redondas", square: "cuadradas", rect: "rectangulares" };
export const PROBLEM_MSG: Record<PlacementProblem, string> = {
  fuera: "La mesa queda fuera del área de mesas",
  obstaculo: "La mesa queda sobre la pista, la cantina, el DJ o la mesa de honor",
  traslape: "La mesa se encima con otra mesa",
};
export const HEAD_TABLE_POS: Pt = { x: 522, y: 82 };
export const SEATING_AREA: Rect = { x0: 305, y0: 92, x1: 745, y1: 400 };
// Bottom-right hedge: tables must stay above y = 500 − 0.2016·(x − 215).
export const HEDGE = { x0: 215, y0: 500, slope: -0.2016 } as const;
export const OBSTACLES: Record<string, Rect> = {
  honor: { x0: 457, y0: 47, x1: 587, y1: 115 },
  pista: { x0: 460, y0: 275, x1: 582, y1: 358 },
  cantina: { x0: 485, y0: 361, x1: 557, y1: 388 },
  dj: { x0: 497, y0: 390, x1: 545, y1: 422 },
};
export const BAND_THRESHOLD = 30; // numbering: rows closer than this share a band
export const EMPTY_SEATING: SeatingState = {
  tables: [], parties: [], assignments: [], reserved: { round: 20, square: 8, rect: 12 }, log: [],
};

// ── geometry ──────────────────────────────────────────────────────────────────
export function snap(v: number): number { return Math.round(v / GRID) * GRID; }

export function tableTopSize(shape: TableShape, rotation: Rotation): { w: number; h: number } {
  const s = shape === "round" || shape === "square" ? { w: 24.6, h: 24.6 }
    : shape === "rect" ? { w: 41, h: 16.5 }
    : { w: 94, h: 28 };
  return rotation === 90 ? { w: s.h, h: s.w } : s;
}

function halfFootprint(shape: TableShape, rotation: Rotation): { hw: number; hh: number } {
  const f = shape === "round" ? { hw: 17, hh: 17 }
    : shape === "square" ? { hw: 16.5, hh: 16.5 }
    : shape === "rect" ? { hw: 25, hh: 13 }
    : { hw: 50, hh: 22 };
  return rotation === 90 ? { hw: f.hh, hh: f.hw } : f;
}

export function footprint(t: Pick<VenueTable, "shape" | "x" | "y" | "rotation">): Rect {
  const { hw, hh } = halfFootprint(t.shape, t.rotation);
  return { x0: t.x - hw, y0: t.y - hh, x1: t.x + hw, y1: t.y + hh };
}

const rotatePt = (p: Pt, rotation: Rotation): Pt => (rotation === 90 ? { x: -p.y, y: p.x } : p);

// Seat i's chair centre relative to the table centre. Index order = the order
// used for "consecutive seats" (see runSeats).
export function seatPositions(shape: TableShape, rotation: Rotation): Pt[] {
  let pts: Pt[];
  if (shape === "round") {
    pts = Array.from({ length: 12 }, (_, i) => {
      const a = ((-90 + i * 30) * Math.PI) / 180;
      return { x: 16 * Math.cos(a), y: 16 * Math.sin(a) };
    });
  } else if (shape === "square") {
    pts = [
      { x: -8, y: -16 }, { x: 0, y: -16 }, { x: 8, y: -16 }, // top L→R
      { x: 16, y: -5 }, { x: 16, y: 5 }, // right T→B
      { x: 8, y: 16 }, { x: 0, y: 16 }, { x: -8, y: 16 }, // bottom R→L
      { x: -16, y: 5 }, { x: -16, y: -5 }, // left B→T
    ];
  } else if (shape === "rect") {
    pts = [
      { x: -13.5, y: -12 }, { x: -4.5, y: -12 }, { x: 4.5, y: -12 }, { x: 13.5, y: -12 }, // side A L→R
      { x: 24.5, y: 0 }, // right end
      { x: 13.5, y: 12 }, { x: 4.5, y: 12 }, { x: -4.5, y: 12 }, { x: -13.5, y: 12 }, // side B R→L
      { x: -24.5, y: 0 }, // left end
    ];
  } else {
    pts = Array.from({ length: 13 }, (_, i) => ({ x: -42 + i * (84 / 12), y: -18 }));
  }
  return pts.map((p) => rotatePt(p, rotation));
}

export function isCircular(shape: TableShape): boolean { return shape !== "head"; }

// ── placement ─────────────────────────────────────────────────────────────────
const intersects = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const hedgeY = (x: number) => HEDGE.y0 + HEDGE.slope * (x - HEDGE.x0);

export type PlacementProblem = "fuera" | "obstaculo" | "traslape";

export function placementProblem(
  t: Pick<VenueTable, "id" | "shape" | "x" | "y" | "rotation">,
  others: VenueTable[],
): PlacementProblem | null {
  const f = footprint(t);
  if (f.x0 < SEATING_AREA.x0 || f.y0 < SEATING_AREA.y0 || f.x1 > SEATING_AREA.x1 || f.y1 > SEATING_AREA.y1) return "fuera";
  if (f.y1 > hedgeY(f.x1) || f.y1 > hedgeY(f.x0)) return "fuera";
  for (const o of Object.values(OBSTACLES)) if (intersects(f, o)) return "obstaculo";
  for (const o of others) {
    if (o.id === t.id) continue;
    if (intersects(f, footprint(o))) return "traslape";
  }
  return null;
}

// First valid grid spot scanning rows top→bottom, left→right.
export function firstFreeSpot(shape: TableShape, tables: VenueTable[]): Pt | null {
  const step = 4;
  for (let y = SEATING_AREA.y0; y <= SEATING_AREA.y1; y += step) {
    for (let x = SEATING_AREA.x0; x <= SEATING_AREA.x1; x += step) {
      const p = { x: snap(x), y: snap(y) };
      if (placementProblem({ id: "", shape, rotation: 0, ...p }, tables) === null) return p;
    }
  }
  return null;
}

// ── numbering: left→right, top→bottom; staggered neighbours share a row ───────
export function numberTables(tables: VenueTable[]): Map<string, number> {
  const sorted = tables.filter((t) => t.shape !== "head").slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const bands: VenueTable[][] = [];
  for (const t of sorted) {
    const band = bands[bands.length - 1];
    if (band && t.y - band[0].y <= BAND_THRESHOLD) band.push(t);
    else bands.push([t]);
  }
  const out = new Map<string, number>();
  let n = 1;
  for (const band of bands) {
    for (const t of band.slice().sort((a, b) => a.x - b.x || a.y - b.y)) out.set(t.id, n++);
  }
  return out;
}

// ── seats ─────────────────────────────────────────────────────────────────────
export function runSeats(seatIndex: number, n: number, capacity: number, circular: boolean): number[] | null {
  if (seatIndex < 0 || seatIndex >= capacity || n <= 0 || n > capacity) return null;
  if (!circular && seatIndex + n > capacity) return null;
  return Array.from({ length: n }, (_, i) => (seatIndex + i) % capacity);
}

export function runIsFree(occupied: ReadonlySet<number>, capacity: number, seatIndex: number, n: number, circular: boolean): boolean {
  const run = runSeats(seatIndex, n, capacity, circular);
  return !!run && run.every((s) => !occupied.has(s));
}

export function firstFreeRun(occupied: ReadonlySet<number>, capacity: number, n: number, circular: boolean): number | null {
  for (let i = 0; i < capacity; i++) if (runIsFree(occupied, capacity, i, n, circular)) return i;
  return null;
}

export const unitKey = (u: { householdId: string; partyId: string | null }) => `${u.householdId}:${u.partyId ?? "all"}`;

export function occupiedSeats(assignments: SeatAssignment[], capacity: number, circular: boolean, excludeKey?: string): Set<number> {
  const s = new Set<number>();
  for (const a of assignments) {
    if (excludeKey && unitKey(a) === excludeKey) continue;
    for (const i of runSeats(a.seatIndex, a.seats, capacity, circular) ?? []) s.add(i);
  }
  return s;
}

// "3–4", "10, 1" (wrapped) or "5": 1-based, for lists, logs and PDFs.
export function seatLabel(seatIndex: number, n: number, capacity: number, circular: boolean): string {
  const run = runSeats(seatIndex, n, capacity, circular) ?? [seatIndex];
  const nums = run.map((i) => i + 1);
  if (nums.length === 1) return String(nums[0]);
  const contiguous = nums.every((v, i) => i === 0 || v === nums[i - 1] + 1);
  return contiguous ? `${nums[0]}–${nums[nums.length - 1]}` : nums.join(", ");
}

// ── units (who can be seated) ─────────────────────────────────────────────────
export function isConfirmedL1(g: AdminGuestRow): boolean {
  return g.rsvp === "Confirmed" && g.invite_round !== 2;
}
export function confirmedSeats(g: AdminGuestRow): number {
  return g.confirmed_seats ?? (Number(g.plus_one) || 1);
}

export type SplitNeed = "definir" | "actualizar";

export function buildUnits(guests: AdminGuestRow[], parties: SeatingParty[]): { units: SeatUnit[]; needsSplit: Map<string, SplitNeed> } {
  const units: SeatUnit[] = [];
  const needsSplit = new Map<string, SplitNeed>();
  const byHousehold = new Map<string, SeatingParty[]>();
  for (const p of parties) byHousehold.set(p.householdId, [...(byHousehold.get(p.householdId) ?? []), p]);
  for (const g of guests) {
    if (!isConfirmedL1(g)) continue;
    const seats = confirmedSeats(g);
    if (seats <= 0) continue;
    const householdName = g.invitation || `${g.first} ${g.last}`.trim();
    const base = { householdId: g.id, householdName, first: g.first, last: g.last, side: g.side, group: g.group };
    if (seats <= 2) {
      units.push({ ...base, key: unitKey({ householdId: g.id, partyId: null }), partyId: null, label: householdName, seats });
      continue;
    }
    const parts = (byHousehold.get(g.id) ?? []).slice().sort((a, b) => a.sort - b.sort);
    if (parts.length === 0) { needsSplit.set(g.id, "definir"); continue; }
    if (parts.reduce((s, p) => s + p.seats, 0) !== seats) needsSplit.set(g.id, "actualizar");
    for (const p of parts) {
      units.push({ ...base, key: unitKey({ householdId: g.id, partyId: p.id }), partyId: p.id, label: p.label, seats: p.seats });
    }
  }
  return { units, needsSplit };
}

// ── inventory ─────────────────────────────────────────────────────────────────
// Cost depends only on the table count, so biggest-first is optimal:
// 12-seat rounds before the 10-seat squares and rectangles.
export function minTables(confirmed: number, reserved: Reserved): { total: number; twelves: number; tens: number; fits: boolean } {
  if (confirmed <= 0) return { total: 0, twelves: 0, tens: 0, fits: true };
  const twelves = Math.min(reserved.round, Math.ceil(confirmed / CAPACITY.round));
  const tens = Math.ceil(Math.max(0, confirmed - twelves * CAPACITY.round) / CAPACITY.square);
  return { total: twelves + tens, twelves, tens, fits: tens <= reserved.square + reserved.rect };
}

// ── conflicts (never mutate; shown as "Revisar") ──────────────────────────────
export type ConflictKind = "no_confirmado" | "exceso" | "partes_desactualizadas";

export function seatingConflicts(
  units: SeatUnit[],
  needsSplit: Map<string, SplitNeed>,
  assignments: SeatAssignment[],
  tables: VenueTable[],
): Map<string, ConflictKind> {
  const out = new Map<string, ConflictKind>();
  const unitBy = new Map(units.map((u) => [u.key, u]));
  const tableBy = new Map(tables.map((t) => [t.id, t]));
  for (const a of assignments) {
    const key = unitKey(a);
    const u = unitBy.get(key);
    if (!u) { out.set(key, "no_confirmado"); continue; }
    if (needsSplit.get(a.householdId) === "actualizar") { out.set(key, "partes_desactualizadas"); continue; }
    if (u.seats > a.seats) {
      const t = tableBy.get(a.tableId);
      if (!t) continue;
      const circular = isCircular(t.shape);
      const occ = occupiedSeats(assignments.filter((x) => x.tableId === a.tableId), t.capacity, circular, key);
      if (!runIsFree(occ, t.capacity, a.seatIndex, u.seats, circular)) out.set(key, "exceso");
    }
  }
  return out;
}
