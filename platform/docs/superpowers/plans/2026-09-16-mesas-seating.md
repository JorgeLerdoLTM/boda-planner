# Mesas Seating Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a couple-only "Mesas" tab that lets Lorel and Jorge choose the table mix, lay tables out on the real Jardín Mayita plan, seat every confirmed guest down to the chair, trace and revert moves, and download three PDFs.

**Architecture:** Pure geometry/rules in `lib/seating.ts` (unit tested), Postgres tables accessed through `lib/seating-queries.ts`, couple-only server actions that return `{ok, error}` results (never throw to the client), an optimistic client store mirroring `useAdminStore`, and inline-styled React components around an SVG map whose coordinate space is the PDF's own 960×540 plan units.

**Tech Stack:** Next.js 16 (App Router, server actions, route handlers), React 19, postgres.js, Supabase Postgres, pdf-lib 1.17, Vitest 3, PyMuPDF (one-off asset script).

**Spec:** `platform/docs/superpowers/specs/2026-09-16-mesas-seating-design.md`

## Global Constraints

- All paths below are relative to `platform/` (the Next.js app). Run every command from `platform/`.
- Node ≥ 20.9 (`engines.node`); local dev uses `.env.local` with `DATABASE_URL=postgresql://coke@localhost:5432/boda_platform_dev` (274 households already loaded).
- This is Next.js 16: read `node_modules/next/dist/docs/` before using an API you are unsure of. Route handler `params` is a `Promise`. Server actions in production mask thrown `Error` messages, so seating actions return `{ ok: false, error }` objects instead of throwing.
- UI text is Spanish. Styling is inline with tokens from `lib/theme.ts` (`C`, `glassCard`, `TOUCH`); no Tailwind classes in admin components, no new client dependencies.
- Every seating mutation is behind `requireCouple()` and writes its `seating_log` row in the same transaction as the change.
- Capacities are fixed per shape: round 10, square 10, rect 12, head 14. Reserved defaults: 20 round, 10 square, 10 rect (hard cap).
- Confirmed = `rsvp === "Confirmed" && invite_round !== 2`; seats = `confirmed_seats ?? plus_one`.
- Plan units: 960×540, y down. Snap grid 2 units. Numbering: left→right, top→bottom, band threshold 30 units.
- Tests: `npm test` (Vitest). Type check: `npx tsc --noEmit`. Lint: `npm run lint`.
- Commit after each task with a short imperative message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Only `git add` the files the task touched (the repo root has unrelated untracked files).

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/schema.sql` (modify, append) | Idempotent 2026-09 block: 3 settings columns + `venue_tables`, `seating_parties`, `seat_assignments`, `seating_log`. |
| `scripts/venue-map.py` (create) | PyMuPDF script: strips the 40 tables from the venue PDF and renders `public/mesas/mayita.png`. |
| `public/mesas/mayita.png` (create) | Venue background, 2880×1620. |
| `lib/seating.ts` (create) | Types, constants, geometry, seat layouts, numbering, placement validation, seat runs, unit building, min tables, conflicts. Pure. |
| `lib/seating.test.ts` (create) | Vitest for everything in `lib/seating.ts`. |
| `lib/seating-queries.ts` (create) | SQL reads/writes + transactional log writes. Server only. |
| `app/admin/seating-actions.ts` (create) | Server actions (`requireCouple`), validation, log payloads, `ActionResult`. |
| `app/admin/page.tsx` (modify) | Load `getSeatingState()` for the couple; pass `initial.seating`. |
| `components/admin/store.ts` (modify) | `AdminInitial.seating: SeatingState \| null`. |
| `components/admin/seating-store.ts` (create) | `useSeatingStore`: optimistic state, derived data, mutations, notice/saved/error. |
| `components/admin/AdminApp.tsx` (modify) | New tab `mesas` after `forecast`; instantiate the seating store; wider container for the tab; merged saved chip / error banner. |
| `components/admin/mesas/Mesas.tsx` (create) | Tab root: notice, inventory strip, left panel (guests or table), map, history. |
| `components/admin/mesas/InventoryStrip.tsx` (create) | Reserved counters, palette (drag/click), headcount line. |
| `components/admin/mesas/VenueMap.tsx` (create) | SVG map: background, tables, pointer drag, drop targets, selection. |
| `components/admin/mesas/TableShape.tsx` (create) | One table: top, chairs, number, fill count, colours. |
| `components/admin/mesas/GuestPanel.tsx` (create) | Filters + draggable unit cards + "Definir grupos". |
| `components/admin/mesas/SplitHouseholdModal.tsx` (create) | Define/update parties for a household. |
| `components/admin/mesas/TablePanel.tsx` (create) | Selected table: seat diagram with per-seat drops, ordered list, rotate, remove. |
| `components/admin/mesas/HistoryPanel.tsx` (create) | Log sentences + "Regresar" + "Cargar más". |
| `components/admin/mesas/MesasMobile.tsx` (create) | Read-only map + per-table list for phones/tablets. |
| `components/admin/mesas/dnd.ts` (create) | Drag payload helpers shared by panels and map. |
| `lib/seating-pdf.ts` (create) | pdf-lib builders for plano / mesas / alfabetico. |
| `lib/seating-pdf.test.ts` (create) | Each kind yields a `%PDF` buffer with the expected page count. |
| `app/admin/mesas/pdf/[kind]/route.ts` (create) | Couple-only download route. |
| `package.json` (modify) | `pdf-lib` dependency. |

---

### Task 1: Schema, venue asset, pdf-lib

**Files:**
- Modify: `supabase/schema.sql` (append at end)
- Create: `scripts/venue-map.py`
- Create: `public/mesas/mayita.png`
- Modify: `package.json` (via `npm install pdf-lib`)

**Interfaces:**
- Produces: tables `venue_tables`, `seating_parties`, `seat_assignments`, `seating_log`; settings columns `tables_round`, `tables_square`, `tables_rect`; the PNG at `/mesas/mayita.png`.

- [ ] **Step 1: Append the schema block**

Append to the end of `supabase/schema.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09 Mesas (acomodo de invitados). Ver docs/superpowers/specs/2026-09-16-mesas-seating-design.md
-- ─────────────────────────────────────────────────────────────────────────────
-- Inventario reservado con el proveedor (tope duro en el mapa).
alter table if exists settings add column if not exists tables_round  int not null default 20;
alter table if exists settings add column if not exists tables_square int not null default 10;
alter table if exists settings add column if not exists tables_rect   int not null default 10;

-- Mesas colocadas en el plano. x,y en unidades del plano (espacio 960x540 del
-- PDF del jardín). La mesa de honor es una fila locked (no se mueve ni borra).
create table if not exists venue_tables (
  id         uuid primary key default gen_random_uuid(),
  shape      text not null check (shape in ('round','square','rect','head')),
  x          numeric not null,
  y          numeric not null,
  rotation   int not null default 0 check (rotation in (0, 90)),
  capacity   int not null,
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Partes de un hogar con más de 2 pases confirmados ("Juan y Lupita", 2).
-- Los hogares de 1–2 pases no tienen filas aquí: se sientan completos.
create table if not exists seating_parties (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  label        text not null,
  seats        int  not null check (seats > 0),
  sort         int  not null default 0
);
create index if not exists seating_parties_household_idx on seating_parties(household_id);

-- Dónde se sienta cada unidad (hogar completo o parte). seat_index = primer
-- asiento; ocupa `seats` asientos consecutivos (circular salvo 'head').
-- seats y label van congelados al sentar: la ocupación y las listas sobreviven
-- aunque el hogar cambie de confirmación (el conflicto se marca, no se pierde).
create table if not exists seat_assignments (
  id           uuid primary key default gen_random_uuid(),
  table_id     uuid not null references venue_tables(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  party_id     uuid references seating_parties(id) on delete cascade,
  seat_index   int  not null check (seat_index >= 0),
  seats        int  not null check (seats > 0),
  label        text not null default '',
  created_at   timestamptz not null default now()
);
create unique index if not exists seat_assignments_unit_idx
  on seat_assignments (household_id, coalesce(party_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists seat_assignments_table_idx on seat_assignments(table_id);

-- Bitácora de movimientos. Tabla propia (NO audit_log) para no inundar la
-- campana. Nombres y números de mesa denormalizados en payload.
create table if not exists seating_log (
  id         bigserial primary key,
  role       text,
  action     text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists seating_log_created_idx on seating_log (created_at desc);
```

- [ ] **Step 2: Apply it to the local database and verify**

Run:
```bash
psql "postgresql://coke@localhost:5432/boda_platform_dev" -f supabase/schema.sql 2>&1 | tail -3
psql "postgresql://coke@localhost:5432/boda_platform_dev" -tAc "select count(*) from venue_tables; select tables_round, tables_square, tables_rect from settings"
```
Expected: no errors; `0` then `20|10|10`.

- [ ] **Step 3: Write the venue asset script**

Create `scripts/venue-map.py`:

```python
"""Render the Jardín Mayita plan without the 40 pre-placed tables.

Usage (one-off, needs PyMuPDF: `pip install pymupdf`):
    python3 scripts/venue-map.py "/path/to/JARDÍN MAYITA  20MR  20MC  10-OCT-2026.pdf"

Writes public/mesas/mayita.png (2880×1620, page 1 at 216 dpi). The PDF is
pure vector: each table is a cluster of ~230 tiny paths around its number
label, so we redact a 56×56 pt box around every label (1..40) and drop the
paths fully inside it. Table clusters extend ≤27 pt; the nearest neighbour
starts ≥32 pt away, so nothing else is touched.
"""
import sys
from pathlib import Path

import fitz  # PyMuPDF

RADIUS = 28


def decode(word: str) -> str:
    # Labels use a symbol font mapped into the Private Use Area (U+F0xx).
    return "".join(chr(ord(c) - 0xF000) if 0xF000 <= ord(c) < 0xF100 else c for c in word)


def main(pdf_path: str) -> None:
    doc = fitz.open(pdf_path)
    page = doc[0]
    labels = {}
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        text = decode(word)
        if text.isdigit() and 1 <= int(text) <= 40:
            labels[int(text)] = ((x0 + x1) / 2, (y0 + y1) / 2)
    if len(labels) != 40:
        raise SystemExit(f"expected 40 table labels, found {len(labels)}")
    for cx, cy in labels.values():
        page.add_redact_annot(fitz.Rect(cx - RADIUS, cy - RADIUS, cx + RADIUS, cy + RADIUS))
    # graphics=1 → drop vector paths fully inside the box; text=0 → drop the number
    page.apply_redactions(images=0, graphics=1, text=0)
    out = Path(__file__).resolve().parent.parent / "public" / "mesas" / "mayita.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    pix = page.get_pixmap(dpi=216)
    pix.save(str(out))
    print(f"wrote {out} ({pix.width}x{pix.height})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
```

- [ ] **Step 4: Generate the PNG and check it**

Run:
```bash
python3 scripts/venue-map.py "/Users/coke/Downloads/JARDÍN MAYITA  20MR  20MC  10-OCT-2026.pdf"
ls -la public/mesas/mayita.png
```
Expected: `wrote .../public/mesas/mayita.png (2880x1620)`, file under 1.5 MB. Open the PNG (Read tool) and confirm: hedges, Edecanes, Dulces, the head-table oval with its 14 chairs, the dance floor, Cantina, D.J., Cocina and the four red squares are present; no round/square tables or numbers remain.

- [ ] **Step 5: Install pdf-lib**

Run: `npm install pdf-lib@^1.17.1`
Expected: `package.json` dependencies gain `"pdf-lib": "^1.17.1"`; no peer warnings.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql scripts/venue-map.py public/mesas/mayita.png package.json package-lock.json
git commit -m "Add seating schema, venue plan asset and pdf-lib

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Pure seating logic (`lib/seating.ts`)

**Files:**
- Create: `lib/seating.ts`
- Test: `lib/seating.test.ts`

**Interfaces:**
- Consumes: `AdminGuestRow` from `lib/queries.ts` (type only), `Side` from `lib/types.ts`.
- Produces (used by every later task):
  - Types `TableShape`, `Rotation`, `VenueTable`, `SeatingParty`, `SeatAssignment`, `Reserved`, `SeatUnit`, `SeatingLogRow`, `SeatingState`, `Pt`, `Rect`, `PlacementProblem`, `SplitNeed`, `ConflictKind`.
  - Constants `PLAN`, `GRID`, `CAPACITY`, `SHAPE_LABEL`, `HEAD_TABLE_POS`, `SEATING_AREA`, `HEDGE`, `OBSTACLES`, `BAND_THRESHOLD`, `EMPTY_SEATING`.
  - Functions `snap`, `tableTopSize`, `footprint`, `seatPositions`, `isCircular`, `placementProblem`, `firstFreeSpot`, `numberTables`, `runSeats`, `runIsFree`, `firstFreeRun`, `occupiedSeats`, `unitKey`, `isConfirmedL1`, `confirmedSeats`, `buildUnits`, `minTables`, `seatingConflicts`, `seatLabel`.

- [ ] **Step 1: Write the failing tests**

Create `lib/seating.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { AdminGuestRow } from "./queries";
import {
  CAPACITY, SEATING_AREA, OBSTACLES,
  seatPositions, footprint, placementProblem, firstFreeSpot, numberTables,
  runSeats, runIsFree, firstFreeRun, occupiedSeats, buildUnits, minTables,
  seatingConflicts, seatLabel, snap,
  type VenueTable, type SeatAssignment, type SeatingParty,
} from "./seating";

const table = (o: Partial<VenueTable> & { id: string }): VenueTable => ({
  shape: "round", x: 400, y: 200, rotation: 0, capacity: 10, locked: false, ...o,
});
const guest = (o: Partial<AdminGuestRow> & { id: string }): AdminGuestRow => ({
  guestId: "g", side: "Lorel", group: "Familia", first: "Juan", last: "Lerdo", invitation: "Juan Lerdo y Sra.",
  plus_one: 2, confirmed_seats: null, no_viene: false, dudoso: false, invite_round: 1, lang: "es", send_group: null,
  phone: "", rsvp: "Confirmed", inv_sent: "Sent", dietary: "", notes: "", ...o,
});

describe("seatPositions", () => {
  it("returns one point per seat for every shape", () => {
    expect(seatPositions("round", 0)).toHaveLength(CAPACITY.round);
    expect(seatPositions("square", 0)).toHaveLength(CAPACITY.square);
    expect(seatPositions("rect", 0)).toHaveLength(CAPACITY.rect);
    expect(seatPositions("head", 0)).toHaveLength(CAPACITY.head);
  });
  it("puts rect seats 5 per long side plus one at each end", () => {
    const p = seatPositions("rect", 0);
    expect(p.slice(0, 5).every((s) => s.y < 0)).toBe(true);   // side A above
    expect(p[5].x).toBeGreaterThan(20);                        // right end
    expect(p.slice(6, 11).every((s) => s.y > 0)).toBe(true);   // side B below
    expect(p[11].x).toBeLessThan(-20);                         // left end
  });
  it("rotates rect seats by 90°", () => {
    const p = seatPositions("rect", 90);
    expect(p.slice(0, 5).every((s) => s.x > 0)).toBe(true);
  });
  it("puts head seats in one row above the oval", () => {
    const p = seatPositions("head", 0);
    expect(p.every((s) => s.y < 0)).toBe(true);
    expect(p[0].x).toBeLessThan(p[13].x);
  });
});

describe("placementProblem", () => {
  it("accepts a table in open space", () => {
    expect(placementProblem(table({ id: "a", x: 400, y: 200 }), [])).toBeNull();
  });
  it("rejects outside the seating area", () => {
    expect(placementProblem(table({ id: "a", x: SEATING_AREA.x0, y: 200 }), [])).toBe("fuera");
    expect(placementProblem(table({ id: "a", x: 400, y: SEATING_AREA.y1 }), [])).toBe("fuera");
  });
  it("rejects below the hedge line in the bottom-right corner", () => {
    expect(placementProblem(table({ id: "a", x: 735, y: 395 }), [])).toBe("fuera");
  });
  it("rejects each obstacle", () => {
    for (const o of Object.values(OBSTACLES)) {
      expect(placementProblem(table({ id: "a", x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2 }), [])).not.toBeNull();
    }
    expect(placementProblem(table({ id: "a", x: 520, y: 316 }), [])).toBe("obstaculo"); // dance floor
  });
  it("rejects overlap with another table but ignores itself", () => {
    const other = table({ id: "b", x: 410, y: 200 });
    expect(placementProblem(table({ id: "a", x: 400, y: 200 }), [other])).toBe("traslape");
    expect(placementProblem(table({ id: "b", x: 400, y: 200 }), [other])).toBeNull();
  });
  it("uses the rotated footprint for rect tables", () => {
    const other = table({ id: "b", shape: "rect", x: 400, y: 240, capacity: 12 });
    // 30 units above: fits horizontally (half-height 13) but not rotated (half-height 25)
    expect(placementProblem(table({ id: "a", shape: "rect", x: 400, y: 210, capacity: 12 }), [other])).toBeNull();
    expect(placementProblem(table({ id: "a", shape: "rect", x: 400, y: 210, rotation: 90, capacity: 12 }), [other])).toBe("traslape");
  });
});

describe("firstFreeSpot", () => {
  it("returns a snapped, valid position and skips taken spots", () => {
    const first = firstFreeSpot("round", [])!;
    expect(first).not.toBeNull();
    expect(first.x % 2).toBe(0);
    expect(placementProblem(table({ id: "n", ...first }), [])).toBeNull();
    const second = firstFreeSpot("round", [table({ id: "t", ...first })])!;
    expect(second).not.toEqual(first);
    expect(placementProblem(table({ id: "n", ...second }), [table({ id: "t", ...first })])).toBeNull();
  });
});

describe("numberTables", () => {
  it("numbers left to right, top to bottom, keeping staggered neighbours in one row", () => {
    const tables = [
      table({ id: "A", x: 331, y: 206 }), table({ id: "B", x: 331, y: 258 }),
      table({ id: "C", x: 380, y: 175 }), table({ id: "D", x: 380, y: 232 }),
      table({ id: "E", x: 430, y: 110 }), table({ id: "F", x: 430, y: 160 }),
      table({ id: "H", shape: "head", x: 522, y: 82, capacity: 14, locked: true }),
    ];
    const n = numberTables(tables);
    expect(n.get("E")).toBe(1);
    expect(n.get("C")).toBe(2); expect(n.get("F")).toBe(3);
    expect(n.get("A")).toBe(4); expect(n.get("D")).toBe(5);
    expect(n.get("B")).toBe(6);
    expect(n.has("H")).toBe(false);
  });
  it("is stable under tiny jitter", () => {
    const a = numberTables([table({ id: "A", x: 331, y: 206 }), table({ id: "C", x: 380, y: 175 })]);
    const b = numberTables([table({ id: "A", x: 332, y: 207 }), table({ id: "C", x: 380, y: 175 })]);
    expect([...a]).toEqual([...b]);
  });
});

describe("seat runs", () => {
  it("wraps on circular tables and not on the head table", () => {
    expect(runSeats(9, 2, 10, true)).toEqual([9, 0]);
    expect(runSeats(13, 2, 14, false)).toBeNull();
    expect(runSeats(0, 11, 10, true)).toBeNull();
  });
  it("finds the first free run", () => {
    const occ = new Set([0, 1, 3]);
    expect(firstFreeRun(occ, 10, 1, true)).toBe(2);
    expect(firstFreeRun(occ, 10, 2, true)).toBe(4);
    expect(firstFreeRun(new Set([2, 3, 4, 5, 6, 7, 8]), 10, 3, true)).toBe(9); // 9,0,1
    expect(firstFreeRun(new Set([2, 3, 4, 5, 6, 7, 8]), 10, 3, false)).toBeNull();
    expect(runIsFree(occ, 10, 2, 1, true)).toBe(true);
    expect(runIsFree(occ, 10, 2, 2, true)).toBe(false);
  });
  it("collects occupied seats and can exclude one unit", () => {
    const as: SeatAssignment[] = [
      { id: "1", tableId: "t", householdId: "h1", partyId: null, seatIndex: 0, seats: 2, label: "" },
      { id: "2", tableId: "t", householdId: "h2", partyId: "p", seatIndex: 9, seats: 2, label: "" },
    ];
    expect([...occupiedSeats(as, 10, true)].sort()).toEqual([0, 1, 9].sort());
    expect([...occupiedSeats(as, 10, true, "h1:all")]).toEqual([9, 0]);
  });
  it("labels seats for humans (1-based, wrapped)", () => {
    expect(seatLabel(2, 2, 10, true)).toBe("3–4");
    expect(seatLabel(9, 2, 10, true)).toBe("10, 1");
    expect(seatLabel(4, 1, 10, true)).toBe("5");
  });
});

describe("buildUnits", () => {
  const parties: SeatingParty[] = [
    { id: "p1", householdId: "fam", label: "Juan y Lupita", seats: 2, sort: 0 },
    { id: "p2", householdId: "fam", label: "Ana + pareja", seats: 2, sort: 1 },
  ];
  it("makes one unit for 1- and 2-seat confirmed households and skips the rest", () => {
    const { units, needsSplit } = buildUnits([
      guest({ id: "solo", plus_one: 1 }),
      guest({ id: "pair", plus_one: 2 }),
      guest({ id: "pend", rsvp: "Pending" }),
      guest({ id: "l2", invite_round: 2 }),
      guest({ id: "conf1", plus_one: 2, confirmed_seats: 1 }),
    ], []);
    expect(units.map((u) => [u.key, u.seats])).toEqual([["solo:all", 1], ["pair:all", 2], ["conf1:all", 1]]);
    expect(needsSplit.size).toBe(0);
  });
  it("asks to define parties for >2 seats and expands them when present", () => {
    const fam = guest({ id: "fam", plus_one: 6, confirmed_seats: 4 });
    expect(buildUnits([fam], []).needsSplit.get("fam")).toBe("definir");
    const { units, needsSplit } = buildUnits([fam], parties);
    expect(needsSplit.size).toBe(0);
    expect(units.map((u) => u.label)).toEqual(["Juan y Lupita", "Ana + pareja"]);
    expect(units[0].key).toBe("fam:p1");
  });
  it("flags parties that no longer add up", () => {
    const fam = guest({ id: "fam", plus_one: 6, confirmed_seats: 5 });
    const { units, needsSplit } = buildUnits([fam], parties);
    expect(needsSplit.get("fam")).toBe("actualizar");
    expect(units).toHaveLength(2);
  });
});

describe("minTables", () => {
  const reserved = { round: 20, square: 10, rect: 10 };
  it.each([
    [0, 0, 0, 0], [10, 1, 1, 0], [12, 1, 1, 0], [22, 2, 2, 0], [25, 3, 3, 0], [120, 10, 10, 0], [130, 11, 10, 1], [312, 30, 10, 20],
  ])("confirmed %i → %i tables (%i rect, %i tens)", (confirmed, total, rect, tens) => {
    expect(minTables(confirmed, reserved)).toMatchObject({ total, rect, tens, fits: true });
  });
  it("reports when the reserve is not enough", () => {
    expect(minTables(500, reserved).fits).toBe(false);
  });
});

describe("seatingConflicts", () => {
  const t = table({ id: "t" });
  it("flags assignments whose unit is gone and parties out of date", () => {
    const fam = guest({ id: "fam", plus_one: 6, confirmed_seats: 5 });
    const parties: SeatingParty[] = [{ id: "p1", householdId: "fam", label: "A", seats: 2, sort: 0 }];
    const { units, needsSplit } = buildUnits([fam, guest({ id: "gone", rsvp: "Declined" })], parties);
    const as: SeatAssignment[] = [
      { id: "1", tableId: "t", householdId: "gone", partyId: null, seatIndex: 0, seats: 2, label: "" },
      { id: "2", tableId: "t", householdId: "fam", partyId: "p1", seatIndex: 2, seats: 2, label: "" },
    ];
    const c = seatingConflicts(units, needsSplit, as, [t]);
    expect(c.get("gone:all")).toBe("no_confirmado");
    expect(c.get("fam:p1")).toBe("partes_desactualizadas");
  });
  it("flags a unit that grew and no longer fits", () => {
    const { units, needsSplit } = buildUnits([guest({ id: "h", plus_one: 2 }), guest({ id: "n", plus_one: 1 })], []);
    const as: SeatAssignment[] = [
      { id: "1", tableId: "t", householdId: "h", partyId: null, seatIndex: 0, seats: 1, label: "" },
      { id: "2", tableId: "t", householdId: "n", partyId: null, seatIndex: 1, seats: 1, label: "" },
    ];
    expect(seatingConflicts(units, needsSplit, as, [t]).get("h:all")).toBe("exceso");
    const free: SeatAssignment[] = [as[0]];
    expect(seatingConflicts(units, needsSplit, free, [t]).has("h:all")).toBe(false);
  });
});

describe("snap and footprint", () => {
  it("snaps to the 2-unit grid and computes footprints", () => {
    expect(snap(401.4)).toBe(402);
    expect(footprint({ shape: "round", x: 400, y: 200, rotation: 0 })).toEqual({ x0: 383, y0: 183, x1: 417, y1: 217 });
    expect(footprint({ shape: "rect", x: 400, y: 200, rotation: 90 })).toEqual({ x0: 387, y0: 175, x1: 413, y1: 225 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/seating.test.ts`
Expected: FAIL — `Cannot find module './seating'`.

- [ ] **Step 3: Implement `lib/seating.ts`**

```ts
// Pure seating geometry & rules for the Mesas tab. No I/O — unit tested.
// Coordinates are "plan units": the venue PDF's 960×540 space, y down.
// Scale ≈ 13.7 units per metre (a 10-seat round top = 24.6 units ≈ 1.80 m).

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
export const CAPACITY: Record<TableShape, number> = { round: 10, square: 10, rect: 12, head: 14 };
export const SHAPE_LABEL: Record<TableShape, string> = { round: "Redonda", square: "Cuadrada", rect: "Rectangular", head: "Mesa de honor" };
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
  tables: [], parties: [], assignments: [], reserved: { round: 20, square: 10, rect: 10 }, log: [],
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
    pts = Array.from({ length: 10 }, (_, i) => {
      const a = ((-90 + i * 36) * Math.PI) / 180;
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
      { x: -16, y: -12 }, { x: -8, y: -12 }, { x: 0, y: -12 }, { x: 8, y: -12 }, { x: 16, y: -12 }, // side A L→R
      { x: 24.5, y: 0 }, // right end
      { x: 16, y: 12 }, { x: 8, y: 12 }, { x: 0, y: 12 }, { x: -8, y: 12 }, { x: -16, y: 12 }, // side B R→L
      { x: -24.5, y: 0 }, // left end
    ];
  } else {
    pts = Array.from({ length: 14 }, (_, i) => ({ x: -42 + i * (84 / 13), y: -18 }));
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
// Cost depends only on the table count, so biggest-first (12s, then 10s) is optimal.
export function minTables(confirmed: number, reserved: Reserved): { total: number; rect: number; tens: number; fits: boolean } {
  if (confirmed <= 0) return { total: 0, rect: 0, tens: 0, fits: true };
  const rect = Math.min(reserved.rect, Math.ceil(confirmed / 12));
  const tens = Math.ceil(Math.max(0, confirmed - rect * 12) / 10);
  return { total: rect + tens, rect, tens, fits: tens <= reserved.round + reserved.square };
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/seating.test.ts`
Expected: all green. If `placementProblem` for the hedge test does not return "fuera", print `footprint({shape:"round",x:735,y:395,rotation:0})` and `hedgeY` at its corners and adjust the test coordinates, not the constants.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add lib/seating.ts lib/seating.test.ts
git commit -m "Add pure seating geometry, numbering and rules with tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Queries, server actions and page wiring

**Files:**
- Create: `lib/seating-queries.ts`
- Create: `app/admin/seating-actions.ts`
- Modify: `app/admin/page.tsx`
- Modify: `components/admin/store.ts` (the `AdminInitial` interface only)

**Interfaces:**
- Consumes: everything from Task 2; `sql` from `lib/db.ts`; `requireCouple` from `lib/auth.ts`; `getGuestRows` from `lib/queries.ts`.
- Produces:
  - `lib/seating-queries.ts`: `LogEntry`, `PartyRow`, `getSeatingState(): Promise<SeatingState>`, `getLog(limit, beforeId?)`, `getLogRow(id)`, `setReserved`, `addTable`, `moveTable`, `rotateTable`, `removeTable`, `replaceParties`, `upsertAssignment`, `deleteAssignment`.
  - `app/admin/seating-actions.ts`: `ActionResult<T>`, `Mutation<T>`, `UnitRef`, `PartyInput`, and actions `getSeatingStateAction`, `getLogAction`, `setReservedAction`, `addTableAction`, `moveTableAction`, `rotateTableAction`, `removeTableAction`, `definePartiesAction`, `seatUnitAction`, `unseatUnitAction`, `revertAction`. All return `{ ok: true, data } | { ok: false, error }`; every mutation's `data.log` holds the `SeatingLogRow[]` just written (newest last).
  - `AdminInitial.seating: SeatingState | null`.

- [ ] **Step 1: Write `lib/seating-queries.ts`**

```ts
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

type Db = typeof sql; // a transaction handle is assignable to the base client type

const mapTable = (r: postgres.Row): VenueTable => ({
  id: r.id, shape: r.shape as TableShape, x: Number(r.x), y: Number(r.y),
  rotation: Number(r.rotation) === 90 ? 90 : 0, capacity: Number(r.capacity), locked: !!r.locked,
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
```

- [ ] **Step 2: Write `app/admin/seating-actions.ts`**

```ts
"use server";

import { requireCouple } from "@/lib/auth";
import { getGuestRows } from "@/lib/queries";
import * as sq from "@/lib/seating-queries";
import {
  CAPACITY, SHAPE_LABEL, buildUnits, confirmedSeats, firstFreeRun, isCircular, isConfirmedL1, numberTables,
  occupiedSeats, placementProblem, runIsFree, seatLabel, unitKey,
  type PlacementProblem, type Rotation, type SeatAssignment, type SeatingLogRow, type SeatingParty, type SeatingState,
  type TableShape, type VenueTable,
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
const PLURAL: Record<PlacedShape, string> = { round: "redondas", square: "cuadradas", rect: "rectangulares" };
const PROBLEM_MSG: Record<PlacementProblem, string> = {
  fuera: "La mesa queda fuera del área de mesas",
  obstaculo: "La mesa queda sobre la pista, la cantina, el DJ o la mesa de honor",
  traslape: "La mesa se encima con otra mesa",
};

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
    if (n < placed) return fail(`Ya hay ${placed} mesas ${PLURAL[shape]} colocadas; quítalas del mapa primero`);
    const log = await sq.setReserved(shape, n, { role, action: "inventory_changed", payload: { shape, before: state.reserved[shape], after: n } });
    return ok({ log });
  });
}

export async function addTableAction(shape: PlacedShape, x: number, y: number): Promise<Mutation<{ table: VenueTable }>> {
  return guarded(async (role) => {
    const state = await sq.getSeatingState();
    const placed = state.tables.filter((t) => t.shape === shape).length;
    if (placed >= state.reserved[shape]) return fail(`No hay más mesas ${PLURAL[shape]} reservadas (${state.reserved[shape]})`);
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
```

- [ ] **Step 3: Wire the initial data**

In `components/admin/store.ts`, add the import and field:

```ts
import type { SeatingState } from "@/lib/seating";
// …
export interface AdminInitial {
  fixedCosts: FixedCost[];
  varCosts: VariableCost[];
  guests: AdminGuestRow[];
  cancelRate: number;
  contingency: number;
  coupleNames: string;
  seating: SeatingState | null; // couple only; null for the planner
}
```

In `app/admin/page.tsx`:

```ts
import { getSeatingState } from "@/lib/seating-queries";
// …
  const [fixedCosts, varCosts, settings, guests, seating] = await Promise.all([
    isCouple ? getFixedCosts() : Promise.resolve([]),
    isCouple ? getVariableCosts() : Promise.resolve([]),
    getSettings(),
    getGuestRows(),
    isCouple ? getSeatingState() : Promise.resolve(null),
  ]);
  // … and inside `initial={{ … }}` add:
        seating,
```

- [ ] **Step 4: Type-check, lint, and smoke the head-table bootstrap**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (If `sql(RESERVED_COL[shape])` is rejected by the types, replace it with three explicit queries in a `switch`.)

Run the dev server and load the admin as the couple to exercise `getSeatingState()`:
```bash
npm run dev -- -p 3005 > /tmp/dev.log 2>&1 &
sleep 8; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/admin/login
psql "postgresql://coke@localhost:5432/boda_platform_dev" -tAc "select count(*) from venue_tables where shape='head'"
```
Log in at http://localhost:3005/admin/login as Novios (password in `.env.local` `ADMIN_COUPLE_PASSWORD`) and reload `/admin`; the psql count must then be `1`. Stop the dev server afterwards (`kill %1`).

- [ ] **Step 5: Commit**

```bash
git add lib/seating-queries.ts app/admin/seating-actions.ts app/admin/page.tsx components/admin/store.ts
git commit -m "Add seating queries, couple-only server actions and initial data wiring

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Client seating store

**Files:**
- Create: `components/admin/seating-store.ts`
- Modify: `lib/seating.ts` (add two exported message maps)
- Modify: `app/admin/seating-actions.ts` (import those maps instead of its local copies)

**Interfaces:**
- Consumes: Task 2 + Task 3 actions.
- Produces: `useSeatingStore(initial: SeatingState | null, guests: AdminGuestRow[])` and `type SeatingStore`. Fields used by the UI tasks:
  - state: `tables`, `parties`, `assignments`, `reserved`, `log`, `notice`, `saveError`, `savedAt`, `selectedTableId`
  - derived: `units`, `needsSplit`, `unitByKey`, `assignmentByUnit`, `assignmentsByTable`, `numbering`, `conflicts`, `conflictsByTable`, `unseated`, `confirmedTotal`, `seatedTotal`, `placed`, `placedTotal`, `capacityTotal`, `emptySeats`, `minimum`, `tableName(t)`
  - mutations: `setReserved(shape, n)`, `addTable(shape, at?)`, `moveTableLocal(id, x, y)`, `commitTableMove(id, x, y, from)`, `rotateTable(id)`, `removeTable(id)`, `defineParties(householdId, parts): Promise<boolean>`, `seatUnit(key, tableId, seatIndex | null): boolean`, `unseatUnit(key)`, `revert(logId): Promise<void>`, `loadMoreLog()`, `selectTable(id | null)`, `dismissNotice()`, `dismissSaveError()`, `resync()`.

- [ ] **Step 1: Share the message maps**

In `lib/seating.ts`, after `SHAPE_LABEL`, add:

```ts
export const SHAPE_PLURAL: Record<Exclude<TableShape, "head">, string> = { round: "redondas", square: "cuadradas", rect: "rectangulares" };
export const PROBLEM_MSG: Record<PlacementProblem, string> = {
  fuera: "La mesa queda fuera del área de mesas",
  obstaculo: "La mesa queda sobre la pista, la cantina, el DJ o la mesa de honor",
  traslape: "La mesa se encima con otra mesa",
};
```
(`PlacementProblem` is declared later in the file; TypeScript hoists type aliases, so this compiles.)

In `app/admin/seating-actions.ts`, delete the local `PLURAL` and `PROBLEM_MSG` constants, add `SHAPE_PLURAL, PROBLEM_MSG` to the import from `@/lib/seating`, and replace the two `PLURAL[` usages with `SHAPE_PLURAL[`.

- [ ] **Step 2: Write `components/admin/seating-store.ts`**

```ts
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { AdminGuestRow } from "@/lib/queries";
import {
  CAPACITY, EMPTY_SEATING, PROBLEM_MSG, SHAPE_PLURAL, buildUnits, confirmedSeats, firstFreeRun, firstFreeSpot, isCircular,
  isConfirmedL1, minTables, numberTables, occupiedSeats, placementProblem, runIsFree, seatingConflicts, snap, unitKey,
  type Pt, type SeatAssignment, type SeatingLogRow, type SeatingState, type TableShape, type VenueTable,
} from "@/lib/seating";
import {
  addTableAction, definePartiesAction, getLogAction, getSeatingStateAction, moveTableAction, removeTableAction,
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
    revert, loadMoreLog, selectTable: setSelectedTableId, dismissNotice, dismissSaveError, resync,
  };
}

export type SeatingStore = ReturnType<typeof useSeatingStore>;
```

- [ ] **Step 3: Type-check, run all tests, commit**

Run: `npx tsc --noEmit && npm test`
Expected: clean; all tests pass (the store is exercised through the UI in later tasks).

```bash
git add lib/seating.ts app/admin/seating-actions.ts components/admin/seating-store.ts
git commit -m "Add optimistic seating store

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Tab shell, inventory strip and the map (add / move / rotate / remove tables)

**Files:**
- Create: `components/admin/mesas/dnd.ts`
- Create: `components/admin/mesas/TableShape.tsx`
- Create: `components/admin/mesas/VenueMap.tsx`
- Create: `components/admin/mesas/InventoryStrip.tsx`
- Create: `components/admin/mesas/Mesas.tsx`
- Modify: `components/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: `SeatingStore` (Task 4), `C`, `glassCard`, `TOUCH` from `lib/theme.ts`, `useResponsive` from `components/hooks.ts`.
- Produces:
  - `dnd.ts`: `DND_MIME`, `DragPayload`, `setDrag(e, payload)`, `readDrag(e)`, `hasDrag(e)`, `currentDrag()`, `clearDrag()`.
  - `TableShape` props: `{ table, number, seated, selected, invalid, hovered, hoverBad, conflict, onPointerDown, onPointerUp }`.
  - `VenueMap` props: `{ seating: SeatingStore; readOnly?: boolean }`.
  - `InventoryStrip` props: `{ seating: SeatingStore }`.
  - `Mesas` props: `{ store: AdminStore; seating: SeatingStore }`; later tasks replace the left-panel placeholder and add the history panel.

- [ ] **Step 1: Drag payload helpers — `components/admin/mesas/dnd.ts`**

```ts
"use client";
import type { DragEvent } from "react";

// HTML5 drag payloads shared by the guest panel, the table panel, the palette
// and the map. Browsers hide dataTransfer contents during dragover, so the
// current payload is also kept in module state for hover feedback.

export const DND_MIME = "application/x-seating";
export type DragPayload =
  | { kind: "unit"; key: string }
  | { kind: "shape"; shape: "round" | "square" | "rect" };

let current: DragPayload | null = null;

export function setDrag(e: DragEvent, payload: DragPayload): void {
  e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
  current = payload;
}
export function readDrag(e: DragEvent): DragPayload | null {
  try {
    const s = e.dataTransfer.getData(DND_MIME);
    return s ? (JSON.parse(s) as DragPayload) : current;
  } catch { return current; }
}
export function hasDrag(e: DragEvent): boolean { return Array.from(e.dataTransfer.types).includes(DND_MIME); }
export function currentDrag(): DragPayload | null { return current; }
export function clearDrag(): void { current = null; }
```

- [ ] **Step 2: One table on the map — `components/admin/mesas/TableShape.tsx`**

```tsx
"use client";
import type { PointerEvent as RPointerEvent } from "react";
import { C } from "@/lib/theme";
import { seatPositions, tableTopSize, type VenueTable } from "@/lib/seating";

// Draws a table in plan units at its centre: chairs, top, number and fill.
// Colours: stone = empty, amber = partly full, green = full, red = problem.
export function TableShape({ table: t, number, seated, selected, invalid, hovered, hoverBad, conflict, onPointerDown, onPointerUp }: {
  table: VenueTable;
  number: number | null;
  seated: number;
  selected: boolean;
  invalid: boolean;
  hovered: boolean;
  hoverBad: boolean;
  conflict: boolean;
  onPointerDown?: (e: RPointerEvent<SVGGElement>) => void;
  onPointerUp?: (e: RPointerEvent<SVGGElement>) => void;
}) {
  const { w, h } = tableTopSize(t.shape, t.rotation);
  const full = seated >= t.capacity;
  const bad = invalid || hoverBad || conflict;
  const stroke = bad ? C.danger : hovered ? C.blue : full ? C.greenDk : seated > 0 ? C.yellowDk : C.muted;
  const fill = bad ? "#FAE8E5" : hovered ? C.blueLt : full ? C.greenLt : seated > 0 ? C.yellowLt : C.white;
  const sw = selected ? 2 : 1;
  const chairs = t.shape === "head" ? [] : seatPositions(t.shape, t.rotation); // the plan PNG already has the head chairs
  return (
    <g transform={`translate(${t.x} ${t.y})`} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
      style={{ cursor: t.locked ? "pointer" : "grab" }} data-table-id={t.id}>
      {chairs.map((c, i) => (
        <rect key={i} x={c.x - 2} y={c.y - 2} width={4} height={4} fill={C.white} stroke={C.muted} strokeWidth={0.5} />
      ))}
      {t.shape === "round" ? <circle r={w / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
        : t.shape === "head" ? <ellipse rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
        : <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={sw} />}
      <text y={-1} textAnchor="middle" fontSize={t.shape === "head" ? 7 : 8} fontWeight={600} fill={C.ink} fontFamily="'Inter', sans-serif" pointerEvents="none">
        {t.shape === "head" ? "Honor" : number ?? ""}
      </text>
      <text y={6.5} textAnchor="middle" fontSize={5} fill={bad ? C.danger : C.muted} fontFamily="'Inter', sans-serif" pointerEvents="none">
        {seated}/{t.capacity}
      </text>
    </g>
  );
}
```

- [ ] **Step 3: The map — `components/admin/mesas/VenueMap.tsx`**

```tsx
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

  const legend = [
    { c: C.muted, bg: C.white, l: "Vacía" }, { c: C.yellowDk, bg: C.yellowLt, l: "Parcial" },
    { c: C.greenDk, bg: C.greenLt, l: "Llena" }, { c: C.danger, bg: "#FAE8E5", l: "Revisar / no cabe" },
  ];

  return (
    <div style={{ ...glassCard, padding: 8 }}>
      <svg ref={svgRef} viewBox={`0 0 ${PLAN.width} ${PLAN.height}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "none", userSelect: "none" }}
        onPointerMove={onPointerMove} onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setHover(null)}
        onClick={(e) => { const tag = (e.target as Element).tagName; if (tag === "svg" || tag === "image" || tag === "rect" && (e.target as Element).getAttribute("data-area") === "1") seating.selectTable(null); }}>
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
```

- [ ] **Step 4: Inventory strip — `components/admin/mesas/InventoryStrip.tsx`**

```tsx
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
            title="Mesas reservadas con el proveedor" inputMode="numeric"
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
        sub={seating.minimum.fits ? `${seating.minimum.rect} rect. + ${seating.minimum.tens} de 10` : "la reserva no alcanza"} warn={!seating.minimum.fits} />
    </div>
  );
}
```

- [ ] **Step 5: Tab root — `components/admin/mesas/Mesas.tsx`**

```tsx
"use client";
import { C, glassCard } from "@/lib/theme";
import type { AdminStore } from "../store";
import type { SeatingStore } from "../seating-store";
import { InventoryStrip } from "./InventoryStrip";
import { VenueMap } from "./VenueMap";

export function Mesas({ store, seating }: { store: AdminStore; seating: SeatingStore }) {
  void store; // guests come in through the seating store; kept for later panels
  return (
    <div>
      {seating.notice && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.yellowLt, border: `1px solid ${C.yellow}`, color: "#8B6914", padding: "8px 14px", fontSize: 12, marginBottom: 12 }}>
          <span style={{ flex: 1 }}>{seating.notice}</span>
          <button onClick={seating.dismissNotice} style={{ background: "transparent", border: "none", color: "#8B6914", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      )}
      <InventoryStrip seating={seating} />
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ ...glassCard, padding: 16, fontSize: 12, color: C.muted }}>Invitados (siguiente paso)</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <VenueMap seating={seating} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire the tab into `components/admin/AdminApp.tsx`**

Make these edits:

1. Imports: add
```ts
import { Mesas } from "./mesas/Mesas";
import { useSeatingStore } from "./seating-store";
```
2. Tabs: append `{ id: "mesas", label: "Mesas" },` after the `forecast` entry.
3. After `const store = useAdminStore(initial);` add `const seating = useSeatingStore(initial.seating, store.guests);`
4. Saved chip: replace the effect and `showSaved` with
```ts
  const lastSaved = Math.max(store.savedAt, seating.savedAt);
  useEffect(() => {
    if (!lastSaved) return;
    const t = setTimeout(() => setSavedHiddenAt(Date.now()), 1800);
    return () => clearTimeout(t);
  }, [lastSaved]);
  const showSaved = lastSaved > 0 && savedHiddenAt < lastSaved;
  const saveError = store.saveError ?? seating.saveError;
  const dismissSaveError = () => { store.dismissSaveError(); seating.dismissSaveError(); };
```
and in the banner JSX use `saveError` / `dismissSaveError` instead of `store.saveError` / `store.dismissSaveError` (three places: the condition, the message, the ✕ button); in the chip condition use `!saveError`.
5. Content container: change `maxWidth: 1200` to `maxWidth: activeTab === "mesas" ? 1600 : 1200`.
6. Render: after the forecast line add
```tsx
        {activeTab === "mesas" && isCouple && <Mesas store={store} seating={seating} />}
```

- [ ] **Step 7: Verify in the browser**

Run: `npx tsc --noEmit && npm run lint`, then `npm run dev -- -p 3005`. Log in as Novios, open **Mesas** and check:
- The map shows the venue with the "Honor" oval at the top and a dashed seating area.
- Click "+ Redonda": a round table appears at the top-left of the area, becomes selected (thicker outline), the counter reads `1 / 20`.
- Drag a "+ Cuadrada" button onto the map: a square appears where dropped. Drop one on the dance floor: it is not added and the amber notice explains why.
- Drag a table onto another: it turns red while overlapping and snaps back on release with a notice. Drag it to a free spot: it stays, and after reload it is still there (persisted).
- Numbers follow left→right, top→bottom as you move tables.
- Set "reservadas" for rectangulares to 0 with none placed: the "+ Rectangular" button greys out. Set it to 10 again.
- `psql … -c "select action, payload->'table'->>'number' from seating_log order by id desc limit 5"` lists the moves with numbers.

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add components/admin/mesas/dnd.ts components/admin/mesas/TableShape.tsx components/admin/mesas/VenueMap.tsx components/admin/mesas/InventoryStrip.tsx components/admin/mesas/Mesas.tsx components/admin/AdminApp.tsx
git commit -m "Add Mesas tab with inventory strip and draggable venue map

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Guest panel, household split modal, seating by drop on the map

**Files:**
- Create: `components/admin/mesas/GuestPanel.tsx`
- Create: `components/admin/mesas/SplitHouseholdModal.tsx`
- Modify: `components/admin/mesas/Mesas.tsx` (replace the placeholder)

**Interfaces:**
- Consumes: `SeatingStore` (`units`, `unseated`, `needsSplit`, `assignmentByUnit`, `numbering`, `tables`, `conflicts`, `seatUnit`, `defineParties`), `AdminStore.guests`, `setDrag`/`clearDrag` from `dnd.ts`, `confirmedSeats`/`isConfirmedL1` from `lib/seating.ts`, `PartyInput` from the actions.
- Produces: `GuestPanel({ store, seating })`, `SplitHouseholdModal({ guest, parties, onSave, onClose })`, and a shared `UnitCard` export used by Task 7.

- [ ] **Step 1: Split modal — `components/admin/mesas/SplitHouseholdModal.tsx`**

```tsx
"use client";
import { useState } from "react";
import { C, glassCard, TOUCH } from "@/lib/theme";
import type { AdminGuestRow } from "@/lib/queries";
import { confirmedSeats, type SeatingParty } from "@/lib/seating";
import type { PartyInput } from "@/app/admin/seating-actions";

// Define the parts of a household with > 2 confirmed seats. Parts must add up
// to the confirmed count. Existing parties keep their id so their seats survive.
export function SplitHouseholdModal({ guest, parties, onSave, onClose }: {
  guest: AdminGuestRow;
  parties: SeatingParty[];
  onSave: (parts: PartyInput[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const total = confirmedSeats(guest);
  const name = guest.invitation || `${guest.first} ${guest.last}`.trim();
  const [rows, setRows] = useState<PartyInput[]>(() =>
    parties.length > 0
      ? parties.slice().sort((a, b) => a.sort - b.sort).map((p) => ({ id: p.id, label: p.label, seats: p.seats }))
      : [{ label: name, seats: total }],
  );
  const [saving, setSaving] = useState(false);
  const sum = rows.reduce((s, r) => s + (Number(r.seats) || 0), 0);
  const valid = rows.length > 0 && sum === total && rows.every((r) => r.label.trim() && Number(r.seats) >= 1);
  const update = (i: number, patch: Partial<PartyInput>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const inputStyle = { height: 36, padding: "0 10px", border: `1px solid ${C.stone}`, background: C.white, color: C.ink, fontSize: 13, fontFamily: "'Inter', sans-serif" } as const;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const ok = await onSave(rows.map((r) => ({ id: r.id, label: r.label.trim(), seats: Number(r.seats) })));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,74,61,0.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...glassCard, background: C.white, width: 460, maxWidth: "100%", padding: 22 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: C.greenDk, marginBottom: 4 }}>Definir grupos</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          <b style={{ color: C.ink }}>{name}</b> confirmó <b style={{ color: C.ink }}>{total}</b> pases. Divide en personas o parejas que se sentarán juntas; cada parte será su propia tarjeta.
        </div>
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={r.label} placeholder="Nombre(s)" onChange={(e) => update(i, { label: e.target.value })} style={{ ...inputStyle, flex: 1 }} autoFocus={i === rows.length - 1 && !r.id} />
            <input value={r.seats} type="number" min={1} max={total} onChange={(e) => update(i, { seats: Number(e.target.value) })} style={{ ...inputStyle, width: 64 }} />
            <button onClick={() => setRows((p) => p.filter((_, j) => j !== i))} disabled={rows.length === 1} title="Quitar parte"
              style={{ width: 32, height: 36, border: "none", background: "transparent", color: rows.length === 1 ? C.stone : C.danger, cursor: rows.length === 1 ? "default" : "pointer", fontSize: 18 }}>×</button>
          </div>
        ))}
        <button onClick={() => setRows((p) => [...p, { label: "", seats: Math.max(1, total - sum) }])}
          style={{ background: "transparent", border: `1px dashed ${C.stone}`, color: C.greenDk, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 14 }}>+ Agregar parte</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: sum === total ? C.success : C.danger, flex: 1 }}>Suma {sum} de {total}{sum !== total ? " — deben coincidir" : " ✓"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.stone}`, color: C.muted, padding: "8px 14px", fontSize: 12, cursor: "pointer", minHeight: TOUCH.minTarget, fontFamily: "'Inter', sans-serif" }}>Cancelar</button>
          <button onClick={save} disabled={!valid || saving}
            style={{ background: valid ? C.greenDk : C.stone, border: "none", color: C.white, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: valid ? "pointer" : "not-allowed", minHeight: TOUCH.minTarget, fontFamily: "'Inter', sans-serif" }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Guest panel — `components/admin/mesas/GuestPanel.tsx`**

```tsx
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
    <div draggable onDragStart={onDragStart} onDragEnd={clearDrag} title={conflict ? CONFLICT_TEXT[conflict] : `${u.householdName} · ${u.group}`}
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
        <select value={group} onChange={(e) => setGroup(e.target.value)} style={{ marginLeft: "auto", fontSize: 11, border: `1px solid ${C.stone}`, background: C.white, color: C.ink, padding: "4px 6px", maxWidth: 130, fontFamily: "'Inter', sans-serif" }}>
          <option value="All">Todos los grupos</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre…"
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
```

- [ ] **Step 3: Put the panel in `Mesas.tsx`**

Replace the placeholder `<div style={{ ...glassCard, … }}>Invitados (siguiente paso)</div>` with `<GuestPanel store={store} seating={seating} />`, add `import { GuestPanel } from "./GuestPanel";`, delete the `void store;` line, and change the theme import to `import { C } from "@/lib/theme";` (`glassCard` is no longer used here).

- [ ] **Step 4: Verify in the browser**

`npx tsc --noEmit && npm run lint`, then `npm run dev -- -p 3005`, log in as Novios, Mesas tab:
- The panel lists only confirmed Lista 1 households; "Sin mesa" count equals the strip's "Sin mesa" seats only when every unit is 1 seat (otherwise the strip counts seats, the panel counts cards — both are fine).
- Filter by Lorel / Coke, pick a group, type a name: the list narrows.
- A household with more than 2 confirmed seats shows the amber "Definir grupos" row. Click it, split into 2 + 2 + 1 (adjust to its count), save: three cards replace it. Re-open via "Con mesa"/"Todos" and check `psql … -c "select label, seats from seating_parties"`.
- Drag a card onto a table: the table turns amber with `2/10`, the card moves to "Con mesa" with "Mesa N". Hovering a full table shows it red and the drop is refused with a notice.
- Reload: everything persists.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add components/admin/mesas/GuestPanel.tsx components/admin/mesas/SplitHouseholdModal.tsx components/admin/mesas/Mesas.tsx
git commit -m "Add guest panel with filters, household split modal and seating by drop

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Table panel with seat-level drops, unseat, rotate, remove

**Files:**
- Create: `components/admin/mesas/TablePanel.tsx`
- Modify: `components/admin/mesas/Mesas.tsx` (swap the left panel when a table is selected)

**Interfaces:**
- Consumes: `SeatingStore`, `UnitCard` from `GuestPanel.tsx`, `dnd.ts`, `seatPositions`/`tableTopSize`/`runSeats`/`runIsFree`/`occupiedSeats`/`seatLabel`/`isCircular`/`SHAPE_LABEL`/`unitKey` from `lib/seating.ts`, `CAT_COLORS` from `lib/theme.ts`.
- Produces: `TablePanel({ seating })`.

- [ ] **Step 1: Write `components/admin/mesas/TablePanel.tsx`**

```tsx
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
        <div style={{ fontSize: 11, color: C.muted }}>{SHAPE_LABEL[t.shape]} · {seated}/{t.capacity}</div>
      </div>
      {!t.locked && (
        <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
          {t.shape === "rect" && <button onClick={() => seating.rotateTable(t.id)} style={smallBtn}>Girar 90°</button>}
          {!confirmRemove
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
            <g key={i} transform={`translate(${p.x} ${p.y})`} onDragOver={onSeatDragOver(i)} onDrop={onSeatDrop(i)} style={{ cursor: "default" }}>
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
              <button onClick={() => seating.unseatUnit(key)} title="Quitar de la mesa" style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 18, marginBottom: 6 }}>×</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>Suelta una tarjeta sobre un asiento para acomodarla ahí; arrastra una de aquí a otra mesa del plano para cambiarla.</div>
    </div>
  );
}
```

- [ ] **Step 2: Swap panels in `Mesas.tsx`**

Import `TablePanel` and change the left column to:
```tsx
        <div style={{ width: 300, flexShrink: 0 }}>
          {seating.selectedTableId ? <TablePanel seating={seating} /> : <GuestPanel store={store} seating={seating} />}
        </div>
```

Esc also deselects (spec §7). Add `import { useEffect } from "react";` and, as the first lines inside the `Mesas` component (all hooks stay above any early `return` added later):
```tsx
  const { selectTable } = seating;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") selectTable(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectTable]);
```

- [ ] **Step 3: Verify in the browser**

`npx tsc --noEmit && npm run lint`, then dev server, Mesas tab:
- Click a table: the left panel shows its diagram with numbered free chairs; "← Invitados" returns.
- Drag a 2-seat card onto chair 5: the pill occupies 5–6 with initials; the list reads "Asientos 5–6". Drop a 2-seat card onto chair 6 when 7 is taken: chairs go red and the drop is refused.
- On a round table, drop a 2-seat card on chair 10: it wraps to 10, 1 and the list reads "Asientos 10, 1". On the head table the same drop on chair 14 is refused.
- "×" unseats; the card reappears under "Sin mesa".
- Drag a card from this list onto another table on the map: it moves there.
- "Girar 90°" on a rectangle rotates it on the map and in the diagram; "Quitar mesa" on a seated table asks first and then unseats its groups (they reappear under "Sin mesa").

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add components/admin/mesas/TablePanel.tsx components/admin/mesas/Mesas.tsx
git commit -m "Add table panel with seat-level placement, unseat, rotate and remove

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: History panel with revert

**Files:**
- Create: `components/admin/mesas/HistoryPanel.tsx`
- Modify: `components/admin/mesas/Mesas.tsx`

**Interfaces:**
- Consumes: `SeatingStore.log`, `revert`, `loadMoreLog`; `SHAPE_LABEL`, `SeatingLogRow`, `TableShape` from `lib/seating.ts`.
- Produces: `HistoryPanel({ seating })` and `describeLog(row): string` (also used by the mobile view and tests).

- [ ] **Step 1: Write `components/admin/mesas/HistoryPanel.tsx`**

```tsx
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
                <button onClick={() => revert(row.id)} disabled={busy != null}
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
```

- [ ] **Step 2: Mount it in `Mesas.tsx`**

Import `HistoryPanel` and render `<HistoryPanel seating={seating} />` after the two-column `div`.

- [ ] **Step 3: Verify in the browser**

Dev server, Mesas tab: open "Historial". Seat a card, move it to another table, unseat it: three sentences appear on top, newest first, with correct table numbers and seat labels. Click "Regresar" on the unseat: the card is back on its table and a "Regresó: Quitó a …" entry appears; "Regresar" on that entry unseats again. Reverting a seat whose chairs are now taken shows the notice "Ya no se puede regresar ese movimiento: …". Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add components/admin/mesas/HistoryPanel.tsx components/admin/mesas/Mesas.tsx
git commit -m "Add seating history panel with revert

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: PDF exports (plano, lista por mesa, lista alfabética)

**Files:**
- Create: `lib/seating-pdf.ts`
- Test: `lib/seating-pdf.test.ts`
- Create: `app/admin/mesas/pdf/[kind]/route.ts`
- Modify: `components/admin/mesas/Mesas.tsx` (export buttons)

**Interfaces:**
- Consumes: `pdf-lib`, `lib/seating.ts`, `getSeatingState` (Task 3), `getGuestRows`/`getSettings` from `lib/queries.ts`, `getSession` from `lib/auth.ts`.
- Produces: `buildSeatingPdf(kind, input): Promise<Uint8Array>`, `PdfKind`, `PdfInput`, `PDF_FILENAMES`; route `GET /admin/mesas/pdf/{plano|mesas|alfabetico}`.

- [ ] **Step 1: Write the failing test — `lib/seating-pdf.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import type { AdminGuestRow } from "./queries";
import { buildSeatingPdf, type PdfInput } from "./seating-pdf";

const guest = (o: Partial<AdminGuestRow> & { id: string }): AdminGuestRow => ({
  guestId: "g", side: "Lorel", group: "Familia", first: "Juan", last: "Lerdo", invitation: "Juan Lerdo y Sra.",
  plus_one: 2, confirmed_seats: null, no_viene: false, dudoso: false, invite_round: 1, lang: "es", send_group: null,
  phone: "", rsvp: "Confirmed", inv_sent: "Sent", dietary: "", notes: "", ...o,
});

async function fixture(): Promise<PdfInput> {
  return {
    tables: [
      { id: "head", shape: "head", x: 522, y: 82, rotation: 0, capacity: 14, locked: true },
      { id: "t1", shape: "round", x: 400, y: 200, rotation: 0, capacity: 10, locked: false },
      { id: "t2", shape: "rect", x: 600, y: 200, rotation: 90, capacity: 12, locked: false },
    ],
    parties: [],
    assignments: [{ id: "a1", tableId: "t1", householdId: "h1", partyId: null, seatIndex: 8, seats: 2, label: "Juan Lerdo y Sra." }],
    guests: [guest({ id: "h1" }), guest({ id: "h2", first: "Ana", last: "Ávila", invitation: "Ana Ávila", plus_one: 1, side: "Coke" })],
    coupleNames: "Lorel & Coke",
    venuePng: await readFile("public/mesas/mayita.png"),
  };
}

describe("buildSeatingPdf", () => {
  it.each(["plano", "mesas", "alfabetico"] as const)("%s is a one-page PDF", async (kind) => {
    const bytes = await buildSeatingPdf(kind, await fixture());
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toContain(kind === "plano" ? "Plano" : "Lista");
  });
  it("paginates long lists", async () => {
    const f = await fixture();
    f.guests = Array.from({ length: 140 }, (_, i) => guest({ id: `h${i}`, first: `Nombre${i}`, last: `Apellido${i}`, invitation: `Persona ${i}`, plus_one: 1 }));
    const doc = await PDFDocument.load(await buildSeatingPdf("alfabetico", f));
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/seating-pdf.test.ts`
Expected: FAIL — `Cannot find module './seating-pdf'`.

- [ ] **Step 3: Write `lib/seating-pdf.ts`**

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AdminGuestRow } from "./queries";
import {
  PLAN, SHAPE_LABEL, buildUnits, isCircular, numberTables, runSeats, seatLabel, tableTopSize, unitKey,
  type SeatAssignment, type SeatingParty, type VenueTable,
} from "./seating";

// The three downloads for the day. Deliberately NOT "server-only": it is only
// imported by the route handler, and Vitest runs it in plain Node where that
// marker package throws.

export type PdfKind = "plano" | "mesas" | "alfabetico";
export interface PdfInput {
  tables: VenueTable[];
  assignments: SeatAssignment[];
  parties: SeatingParty[];
  guests: AdminGuestRow[];
  coupleNames: string;
  venuePng?: Uint8Array; // tests pass it; the route lets us read public/mesas/mayita.png
}

export const PDF_TITLES: Record<PdfKind, string> = { plano: "Plano de mesas", mesas: "Lista por mesa", alfabetico: "Lista alfabética" };
export const PDF_FILENAMES: Record<PdfKind, string> = {
  plano: "Plano de mesas 10-Oct-2026.pdf", mesas: "Lista por mesa 10-Oct-2026.pdf", alfabetico: "Lista alfabetica 10-Oct-2026.pdf",
};
const SUBTITLE = "Jardín Mayita · 10/Oct/2026";

const INK = rgb(0.24, 0.29, 0.24), MUTED = rgb(0.54, 0.58, 0.53), GREEN = rgb(0.24, 0.35, 0.25), RED = rgb(0.76, 0.36, 0.31);
const STONE = rgb(0.87, 0.85, 0.82), AMBER = rgb(0.65, 0.52, 0.13), GREEN_LT = rgb(0.91, 0.94, 0.91), AMBER_LT = rgb(0.98, 0.96, 0.89), WHITE = rgb(1, 1, 1);

// Standard fonts are WinAnsi: anything outside it becomes "?" instead of throwing.
const clean = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, "?");
const cmp = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

interface Ctx { doc: PDFDocument; font: PDFFont; bold: PDFFont; title: string; couple: string }
interface Cursor { page: PDFPage; y: number }

function fit(font: PDFFont, text: string, size: number, maxW: number): string {
  let s = clean(text);
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

function newPage(ctx: Ctx, landscape = false): Cursor {
  const page = ctx.doc.addPage(landscape ? [792, 612] : [612, 792]);
  const { width, height } = page.getSize();
  page.drawText(clean(ctx.title), { x: 36, y: height - 40, size: 16, font: ctx.bold, color: GREEN });
  page.drawText(clean(`${ctx.couple} · ${SUBTITLE}`), { x: 36, y: height - 56, size: 9, font: ctx.font, color: MUTED });
  const stamp = clean(`Generado ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" })}`);
  page.drawText(stamp, { x: width - 36 - ctx.font.widthOfTextAtSize(stamp, 8), y: height - 56, size: 8, font: ctx.font, color: MUTED });
  page.drawLine({ start: { x: 36, y: height - 64 }, end: { x: width - 36, y: height - 64 }, thickness: 0.5, color: STONE });
  return { page, y: height - 84 };
}

function ordered(tables: VenueTable[]) {
  const numbering = numberTables(tables);
  const rest = tables.filter((t) => t.shape !== "head").sort((a, b) => (numbering.get(a.id) ?? 0) - (numbering.get(b.id) ?? 0));
  const head = tables.find((t) => t.shape === "head");
  return { numbering, list: head ? [head, ...rest] : rest };
}
const tableTitle = (t: VenueTable, numbering: Map<string, number>) => (t.shape === "head" ? "Mesa de honor" : `Mesa ${numbering.get(t.id) ?? "?"}`);
const tableShort = (t: VenueTable, numbering: Map<string, number>) => (t.shape === "head" ? "Honor" : String(numbering.get(t.id) ?? "?"));

async function plano(ctx: Ctx, input: PdfInput) {
  const { page } = newPage(ctx, true);
  const png = input.venuePng ?? new Uint8Array(await readFile(path.join(process.cwd(), "public", "mesas", "mayita.png")));
  const img = await ctx.doc.embedPng(png);
  const s = (792 - 72) / PLAN.width;
  const x0 = 36, h = PLAN.height * s, y0 = 612 - 84 - h;
  page.drawImage(img, { x: x0, y: y0, width: PLAN.width * s, height: h });
  const px = (x: number) => x0 + x * s;
  const py = (y: number) => y0 + (PLAN.height - y) * s;
  const { numbering } = ordered(input.tables);
  const seatedBy = new Map<string, number>();
  for (const a of input.assignments) seatedBy.set(a.tableId, (seatedBy.get(a.tableId) ?? 0) + a.seats);
  for (const t of input.tables) {
    const { w, h: th } = tableTopSize(t.shape, t.rotation);
    const seated = seatedBy.get(t.id) ?? 0;
    const full = seated >= t.capacity;
    const color = full ? GREEN_LT : seated > 0 ? AMBER_LT : WHITE;
    const borderColor = full ? GREEN : seated > 0 ? AMBER : MUTED;
    if (t.shape === "round") page.drawCircle({ x: px(t.x), y: py(t.y), size: (w / 2) * s, color, borderColor, borderWidth: 0.8 });
    else if (t.shape === "head") page.drawEllipse({ x: px(t.x), y: py(t.y), xScale: (w / 2) * s, yScale: (th / 2) * s, color, borderColor, borderWidth: 0.8 });
    else page.drawRectangle({ x: px(t.x - w / 2), y: py(t.y + th / 2), width: w * s, height: th * s, color, borderColor, borderWidth: 0.8 });
    const label = tableShort(t, numbering);
    page.drawText(label, { x: px(t.x) - ctx.bold.widthOfTextAtSize(label, 7) / 2, y: py(t.y) - 1, size: 7, font: ctx.bold, color: INK });
    const cnt = `${seated}/${t.capacity}`;
    page.drawText(cnt, { x: px(t.x) - ctx.font.widthOfTextAtSize(cnt, 4.5) / 2, y: py(t.y) - 7, size: 4.5, font: ctx.font, color: MUTED });
  }
  const n = (shape: string) => input.tables.filter((t) => t.shape === shape).length;
  const seatedTotal = input.assignments.reduce((a, b) => a + b.seats, 0);
  const capacity = input.tables.reduce((a, t) => a + t.capacity, 0);
  page.drawText(clean(`${n("round") + n("square") + n("rect")} mesas: ${n("round")} redondas · ${n("square")} cuadradas · ${n("rect")} rectangulares · ${seatedTotal} sentados de ${capacity} lugares`),
    { x: 36, y: y0 - 14, size: 9, font: ctx.font, color: MUTED });
}

function mesas(ctx: Ctx, input: PdfInput) {
  let cur = newPage(ctx);
  const { numbering, list } = ordered(input.tables);
  const { units } = buildUnits(input.guests, input.parties);
  const unitBy = new Map(units.map((u) => [u.key, u]));
  const byTable = new Map<string, SeatAssignment[]>();
  for (const a of input.assignments) byTable.set(a.tableId, [...(byTable.get(a.tableId) ?? []), a]);
  const line = (text: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    const size = o.size ?? 10;
    if (cur.y < 60) cur = newPage(ctx);
    cur.page.drawText(fit(o.font ?? ctx.font, text, size, 612 - 36 - (o.x ?? 36)), { x: o.x ?? 36, y: cur.y, size, font: o.font ?? ctx.font, color: o.color ?? INK });
    cur.y -= size + 4;
  };
  for (const t of list) {
    const as = (byTable.get(t.id) ?? []).slice().sort((a, b) => a.seatIndex - b.seatIndex);
    const circular = isCircular(t.shape);
    const seated = as.reduce((s, a) => s + a.seats, 0);
    if (cur.y < 110) cur = newPage(ctx);
    cur.y -= 6;
    line(`${tableTitle(t, numbering)} · ${SHAPE_LABEL[t.shape]} · ${seated}/${t.capacity}`, { size: 12, font: ctx.bold, color: GREEN });
    const taken = new Set<number>();
    for (const a of as) {
      const u = unitBy.get(unitKey(a));
      const extra = !u ? " · REVISAR: ya no está confirmado" : a.partyId && u.householdName !== a.label ? ` (${u.householdName})` : "";
      line(`Asientos ${seatLabel(a.seatIndex, a.seats, t.capacity, circular)} · ${a.label}${extra}`, { x: 48, color: u ? INK : RED });
      for (const i of runSeats(a.seatIndex, a.seats, t.capacity, circular) ?? []) taken.add(i);
    }
    const free = t.capacity - taken.size;
    if (free > 0) line(`— ${free} asiento(s) libre(s)`, { x: 48, color: MUTED });
  }
  if (list.length === 0) line("No hay mesas colocadas.", { color: MUTED });
}

function alfabetico(ctx: Ctx, input: PdfInput) {
  const { numbering } = ordered(input.tables);
  const { units } = buildUnits(input.guests, input.parties);
  const byUnit = new Map(input.assignments.map((a) => [unitKey(a), a]));
  const tableBy = new Map(input.tables.map((t) => [t.id, t]));
  const rows = units
    .map((u) => { const a = byUnit.get(u.key); const t = a ? tableBy.get(a.tableId) : undefined; return { u, mesa: t ? tableShort(t, numbering) : null }; })
    .sort((a, b) => cmp(a.u.last, b.u.last) || cmp(a.u.first, b.u.first) || cmp(a.u.label, b.u.label));
  let cur = newPage(ctx);
  let col = 0;
  const colX = [36, 316], colW = 260;
  const advance = () => {
    cur.y -= 14;
    if (cur.y < 60) {
      if (col === 0) { col = 1; cur.y = 792 - 84; } else { cur = newPage(ctx); col = 0; }
    }
  };
  const heading = (text: string, color = GREEN) => {
    if (cur.y < 90 && col === 1) { cur = newPage(ctx); col = 0; }
    cur.page.drawText(clean(text), { x: colX[col], y: cur.y, size: 11, font: ctx.bold, color });
    advance();
  };
  const row = (r: { u: (typeof units)[number]; mesa: string | null }) => {
    const x = colX[col];
    const right = r.mesa ? `Mesa ${r.mesa}` : "Sin mesa";
    const rw = ctx.bold.widthOfTextAtSize(right, 9);
    const name = r.u.partyId ? `${r.u.label} · ${r.u.householdName}` : r.u.label;
    cur.page.drawText(fit(ctx.font, name, 9, colW - rw - 8), { x, y: cur.y, size: 9, font: ctx.font, color: INK });
    cur.page.drawText(right, { x: x + colW - rw, y: cur.y, size: 9, font: ctx.bold, color: r.mesa ? GREEN : RED });
    advance();
  };
  const seated = rows.filter((r) => r.mesa), unseated = rows.filter((r) => !r.mesa);
  heading(`Con mesa · ${seated.length}`);
  for (const r of seated) row(r);
  if (unseated.length > 0) {
    cur.y -= 6;
    heading(`Sin mesa · ${unseated.length}`, RED);
    for (const r of unseated) row(r);
  }
}

export async function buildSeatingPdf(kind: PdfKind, input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, font, bold, title: PDF_TITLES[kind], couple: input.coupleNames };
  doc.setTitle(`${PDF_TITLES[kind]} · ${SUBTITLE}`);
  if (kind === "plano") await plano(ctx, input);
  else if (kind === "mesas") mesas(ctx, input);
  else alfabetico(ctx, input);
  return doc.save();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/seating-pdf.test.ts`
Expected: PASS (4 tests). If pdf-lib complains about a character, extend the `clean` regex rather than removing text.

- [ ] **Step 5: Write the route — `app/admin/mesas/pdf/[kind]/route.ts`**

```ts
import { getSession } from "@/lib/auth";
import { getGuestRows, getSettings } from "@/lib/queries";
import { getSeatingState } from "@/lib/seating-queries";
import { buildSeatingPdf, PDF_FILENAMES, type PdfKind } from "@/lib/seating-pdf";

export const dynamic = "force-dynamic";

// Descargas del acomodo (solo novios): plano numerado, lista por mesa y lista
// alfabética "encuentra tu mesa". Se generan al momento con pdf-lib.
const KINDS: PdfKind[] = ["plano", "mesas", "alfabetico"];

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const session = await getSession();
  if (session?.role !== "couple") return new Response("Forbidden", { status: 403 });
  const { kind } = await ctx.params;
  if (!KINDS.includes(kind as PdfKind)) return new Response("Not found", { status: 404 });
  const [state, guests, settings] = await Promise.all([getSeatingState(), getGuestRows(), getSettings()]);
  const bytes = await buildSeatingPdf(kind as PdfKind, { ...state, guests, coupleNames: settings.couple_names });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${PDF_FILENAMES[kind as PdfKind]}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 6: Export buttons in `Mesas.tsx`**

Between the two-column `div` and `<HistoryPanel …/>` add:

```tsx
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
        {([["plano", "PDF · Plano numerado"], ["mesas", "PDF · Lista por mesa"], ["alfabetico", "PDF · Lista alfabética"]] as const).map(([k, l]) => (
          <a key={k} href={`/admin/mesas/pdf/${k}`} download
            style={{ fontSize: 11, color: C.greenDk, textDecoration: "none", border: `1px solid ${C.greenDk}`, padding: "7px 12px", fontFamily: "'Inter', sans-serif" }}>{l}</a>
        ))}
      </div>
```

- [ ] **Step 7: Verify, then commit**

`npx tsc --noEmit && npm run lint && npm test`. Dev server: click each PDF button as Novios; open the files: the plano shows the venue with numbered tables in the same spots as the map; the per-table list starts with "Mesa de honor"; the alphabetical list is sorted by last name and ends with "Sin mesa" in red. Logged out, `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/admin/mesas/pdf/plano` prints `403`.

```bash
git add lib/seating-pdf.ts lib/seating-pdf.test.ts "app/admin/mesas/pdf/[kind]/route.ts" components/admin/mesas/Mesas.tsx
git commit -m "Add seating PDF exports: plano, lista por mesa, lista alfabética

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Read-only mobile / tablet view

**Files:**
- Create: `components/admin/mesas/MesasMobile.tsx`
- Modify: `components/admin/mesas/Mesas.tsx`

**Interfaces:**
- Consumes: `SeatingStore`, `VenueMap` with `readOnly`, `useResponsive`.
- Produces: `MesasMobile({ seating })`.

- [ ] **Step 1: Write `components/admin/mesas/MesasMobile.tsx`**

```tsx
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
    <div key={l}><div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div><div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.greenDk }}>{v}</div></div>
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
              <div style={{ fontSize: 11, color: C.muted }}>{SHAPE_LABEL[t.shape]} · {seated}/{t.capacity}</div>
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
```

- [ ] **Step 2: Branch in `Mesas.tsx`**

Add `const { isMobile, isTablet } = useResponsive();` (import from `../../hooks`) next to the other hooks at the top of the component and, after every hook call and before the desktop `return`, `if (isMobile || isTablet) return <MesasMobile seating={seating} />;` (import `MesasMobile`). Hooks must not follow the early return.

- [ ] **Step 3: Verify and commit**

`npx tsc --noEmit && npm run lint`. In the dev server, narrow the window under 1024px: the read-only view appears with a scrollable map and the table list; tables cannot be dragged. Widen it: the editor returns with state intact.

```bash
git add components/admin/mesas/MesasMobile.tsx components/admin/mesas/Mesas.tsx
git commit -m "Add read-only Mesas view for phones and tablets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Production migration and deploy

**Files:**
- Modify: `DEPLOY.md` (one note)

- [ ] **Step 1: Full local check**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all green; the build lists `/admin/mesas/pdf/[kind]` as a dynamic route.

- [ ] **Step 2: Apply the schema block to Supabase**

The Supabase connection string is on a commented line in `.env.local` (search `supabase`), or `railway variables --json` → `DATABASE_URL`. The schema file is idempotent, so applying the whole file is safe:
```bash
SUPA="$(grep -o 'postgresql://[^ "]*supabase[^ "]*' .env.local | head -1)"
psql "$SUPA" -f supabase/schema.sql 2>&1 | grep -iv "already exists" | tail -5
psql "$SUPA" -tAc "select count(*) from venue_tables; select tables_round, tables_square, tables_rect from settings"
```
Expected: no errors; `0` then `20|10|10`.

- [ ] **Step 3: Deploy**

Run: `railway up -s boda-app --ci` (streams the build; exits when deployed). Then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.lorelyjorge.com/admin/login          # 200
curl -s -o /dev/null -w "%{http_code}\n" https://www.lorelyjorge.com/admin/mesas/pdf/plano # 403 = route live, auth enforced
```
Then log in at https://www.lorelyjorge.com/admin/login as Novios in a browser and open **Mesas**: the map renders, "+ Redonda" adds a table, the head-table row was created (`psql "$SUPA" -tAc "select count(*) from venue_tables where shape='head'"` → `1`).

- [ ] **Step 4: Note it in DEPLOY.md and commit**

Under section 1 (Supabase), after the "Schema + seed were already applied" paragraph, add:
```
> 2026-09-17: the Mesas block (settings.tables_*, venue_tables, seating_parties, seat_assignments, seating_log) was applied with `psql … -f supabase/schema.sql`. Re-running the file is safe.
```
```bash
git add DEPLOY.md
git commit -m "Note seating schema migration in deploy runbook

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
```
