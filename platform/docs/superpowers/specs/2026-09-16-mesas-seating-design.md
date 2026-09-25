# Mesas — seating planner design

Date: 2026-09-16
Status: approved by Jorge (design discussion in chat), pending spec review
Scope: new "Mesas" tab in the admin app, after Pronóstico

## 1. Goal

Let the couple decide the table mix for Jardín Mayita, lay the tables out on the
real venue plan, and seat every confirmed guest, choosing who sits next to whom.
Produce three printable PDFs for the day: the numbered plan, the list by table,
and the alphabetical "find your table" list. Keep a movement log so any move can
be traced and reverted.

Decisions already taken with Jorge:

- Confirmed guests only (RSVP Confirmed, Lista 1, same rule as `store.confirmed`).
- Seat counts: round 12, square 10, rectangular 12, head table 13 (changed by Jorge on 2026-09-24 from 10/10/12/14).
- Reserved with the vendor as of 2026-09-24: 20 round, 8 square, 12 rectangular.
- Reserved with the vendor: 20 round, 10 square, 10 rectangular. Hard cap on the
  map. Cost depends only on the total number of tables, not the shape, so the
  planner optimises for the fewest tables.
- Households with 1 or 2 confirmed seats are one card. Households with more than
  2 confirmed seats must be split into parties (individuals or couples) before
  they can be seated; each party is its own card and can sit at a different
  table.
- Table numbers are derived from position: left to right, top to bottom. The head
  table is "Mesa de honor" and has no number.
- Rectangular tables seat 5 per long side plus 1 at each end. They can rotate 90°.
- Head table: fixed oval at the top of the plan, 14 seats in one row facing the
  room, assignable like any other table, not counted against the inventory.
- DJ, Cantina, Dulces, Edecanes and the hedges are fixed. The structures marked
  with an X are no-go zones. Tables live only in the area the PDF's tables cover.
- Venue plan: Jorge's PDF with the 40 pre-placed tables removed, nothing else
  changed.
- Couple role only. Editable on desktop; phones get a read-only view.
- No simultaneous editing guard. Instead, a full movement log with revert.
- PDFs are downloadable files generated on the server.

## 2. Architecture

New pieces, all inside `platform/`:

| Layer | File | Responsibility |
|---|---|---|
| Pure logic | `lib/seating.ts` | Geometry, seat layouts, numbering, placement validation, first-free-seat search, minimum-table maths, conflict detection. No I/O. Unit tested. |
| Queries | `lib/seating-queries.ts` | SQL for the four new tables and the settings columns. Server only. |
| Actions | `app/admin/seating-actions.ts` | Server actions, all behind `requireCouple()`. Validate, persist, write the log. |
| PDF | `lib/seating-pdf.ts`, `app/admin/mesas/pdf/[kind]/route.ts` | pdf-lib documents for the three exports. |
| UI store | `components/admin/seating-store.ts` | `useSeatingStore(initial, track)`: optimistic state + persistence, mirrors `useAdminStore` conventions. |
| UI | `components/admin/mesas/*` | `Mesas.tsx` (tab root), `InventoryStrip.tsx`, `VenueMap.tsx`, `TableShape.tsx`, `GuestPanel.tsx`, `TablePanel.tsx`, `SplitHouseholdModal.tsx`, `HistoryPanel.tsx`, `MesasMobile.tsx`. |
| Assets | `public/mesas/mayita.png`, `scripts/venue-map.py` | Venue background rendered from the PDF with tables removed, and the script that produced it. |
| Schema | `supabase/schema.sql` | Idempotent migration block appended (section 3). |
| Wiring | `components/admin/AdminApp.tsx`, `app/admin/page.tsx`, `components/admin/store.ts` | New tab after Pronostico; initial seating data loaded for the couple role; `track` exposed from the admin store. |

No new client dependencies. One new server dependency: `pdf-lib`.

## 3. Data model

Appended to `supabase/schema.sql` as a dated, idempotent block (`create table if
not exists`, `add column if not exists`), matching the existing style.

```sql
-- 2026-09 Mesas: inventario reservado con el proveedor (tope duro en el mapa)
alter table if exists settings add column if not exists tables_round  int not null default 20;
alter table if exists settings add column if not exists tables_square int not null default 10;
alter table if exists settings add column if not exists tables_rect   int not null default 10;

-- Mesas colocadas en el plano. x,y en unidades del plano (espacio 960x540 del
-- PDF, ver sección 4). La mesa de honor es una fila locked (no se mueve ni borra).
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
-- asiento; la unidad ocupa `seats` asientos consecutivos (circular salvo 'head').
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

Notes:

- `importGuests` truncates `households ... cascade`. Parties and assignments
  cascade away with it, which is the right outcome for a re-import. The log
  survives because it carries names, not foreign keys.
- A "unit" is `{ householdId, partyId | null }`. Whole-household units have
  `partyId = null`. Its seat count is the party's `seats`, or for whole
  households the confirmed seats (`confirmed_seats ?? plus_one`).
- Capacity is stored per row but always set from the shape (10, 10, 12, 14).
  Not editable in v1.

### Log payloads

`action` is one of: `inventory_changed`, `table_added`, `table_moved`,
`table_rotated`, `table_removed`, `parties_defined`, `unit_seated`,
`unit_moved`, `unit_unseated`, `revert`.

Every payload includes what a human needs to read the entry without joins:

```ts
interface SeatingLogPayload {
  unit?: { householdId: string; partyId: string | null; label: string; seats: number };
  from?: { tableId: string; tableNumber: number | null; seatIndex: number } | null; // null = "sin mesa"
  to?:   { tableId: string; tableNumber: number | null; seatIndex: number } | null;
  table?: { tableId: string; shape: string; number: number | null; x: number; y: number; rotation: number };
  before?: unknown; after?: unknown;   // inventory_changed, table_moved, parties_defined
  revertsLogId?: number;               // on 'revert'
}
```

`tableNumber` is computed at write time from the positions in the same
transaction; `null` for the head table.

## 4. Venue plan and geometry

### Coordinate space

All positions are in "plan units": the PDF's own coordinate space, 960 wide by
540 tall, y down. The SVG map uses `viewBox="0 0 960 540"` so plan units are SVG
user units. Scale measured from the PDF: a 10-seat round table top is 24.6 units
in diameter; taking it as 1.80 m gives about 13.7 units per metre. Exact
obstacle rectangles are measured from the PDF during implementation and live as
constants in `lib/seating.ts`. Initial values (verify against the PDF):

| Element | Rect (x0, y0, x1, y1) | Role |
|---|---|---|
| Seating area | 305, 92, 745, 400 | Tables must be fully inside |
| Hedge line (bottom-right) | y = 500 − 0.2016·(x − 215) | Tables must be fully above this line |
| Head table block | 457, 47, 587, 115 | Obstacle |
| Dance floor | 460, 275, 582, 358 | Obstacle |
| Cantina | 485, 361, 557, 388 | Obstacle |
| DJ | 497, 390, 545, 422 | Obstacle |
| Head table oval | 475, 68, 569, 96 | Fixed table, seats along the top edge |

### Table footprints (plan units)

| Shape | Top | Footprint incl. chairs (used for overlap and bounds) |
|---|---|---|
| round | circle r 12.3 | circle r 17 |
| square | 24.6 × 24.6 | 33 × 33 |
| rect (rotation 0) | 41 × 16.5 | 50 × 26 (swap when rotation 90) |
| head | oval 94 × 28 at fixed position | fixed, never validated |

### Seat layouts

Seat indices are the order used for "consecutive seats". A unit of `n` seats
occupies `seatIndex … seatIndex + n − 1` modulo capacity for round, square and
rect (circular), and without wrap for head.

- round (10): seat i at angle −90° + i·36°, clockwise from the top.
- square (10): top side seats 0–2 left→right, right side 3–4 top→bottom,
  bottom side 5–7 right→left, left side 8–9 bottom→top.
- rect (12): long side A seats 0–4 left→right, end 5, long side B 6–10
  right→left, end 11. Rotation 90 rotates the whole layout.
- head (14): seats 0–13 left→right along the top edge of the oval.

`seatPositions(shape, rotation)` returns `{ x, y }` per seat relative to the
table centre so the map and the table panel draw the same chairs.

`firstFreeRun(occupiedIndices, capacity, n, circular)` returns the lowest
`seatIndex` whose run of `n` consecutive seats is free (wrapping when
`circular`), or `null` when the unit does not fit. `runIsFree(occupiedIndices,
capacity, seatIndex, n, circular)` is the same check for an explicit seat,
used when a card is dropped on a specific chair.

### Numbering

`numberTables(tables)` returns `Map<tableId, number>` for non-head tables:

1. Sort by y.
2. Walk in that order, opening a new band whenever `y − bandStartY > 30`
   (about two-thirds of the row pitch in the PDF, so a staggered neighbour
   stays in the same row).
3. Sort each band by x; number consecutively across bands.

Numbers recompute on every position change, so they shift live while dragging.
Assignments reference table ids, so seating never moves when numbers do.
Freezing the numbering (for after escort cards are printed) is out of scope for
v1 and noted in section 10.

### Placement validation

`placementProblem(table, otherTables): null | "fuera" | "obstaculo" | "traslape"`
checks, in order: footprint fully inside the seating area and above the hedge
line; no intersection with an obstacle; no intersection with another table's
footprint. Positions snap to a 2-unit grid before validation.

### Minimum tables

`minTables(confirmedSeats, reserved)`: fill rectangular tables (12) first up to
the reserved count, then 10-seat tables. Returns `{ total, rect, tens }`. Since
cost depends only on the count, biggest-first is optimal.

### Conflicts

`seatingConflicts(units, assignments, tables)` returns per-assignment problems:

- `no_confirmado`: the household is no longer Confirmed.
- `exceso`: the unit now needs more seats than it occupies (confirmed count
  went up, or party seats changed) and the next seats are taken.
- `partes_desactualizadas`: a household's parties no longer add up to its
  confirmed seats.

Conflicts never mutate data. They show as "Revisar" flags until the couple
fixes them by hand.

## 5. Server actions and persistence

All in `app/admin/seating-actions.ts`, each starting with `requireCouple()`.
The server is authoritative: it re-validates and throws with a Spanish message
the UI can show. Each action writes its log row inside the same transaction.

| Action | Validation | Log |
|---|---|---|
| `getSeatingStateAction()` | — | — (used to resync after a rejected save) |
| `setReservedAction(shape, n)` | n ≥ tables already placed of that shape | inventory_changed |
| `addTableAction(shape, x, y)` | placed < reserved for shape; `placementProblem` null | table_added |
| `moveTableAction(id, x, y)` | not locked; `placementProblem` null | table_moved |
| `rotateTableAction(id)` | shape rect; `placementProblem` null after rotation | table_rotated |
| `removeTableAction(id)` | not locked | table_removed, plus one unit_unseated per seated unit |
| `definePartiesAction(householdId, parts)` | household Confirmed with > 2 seats; every label non-empty; seats sum equals confirmed seats; replaces the household's parties; assignments for parties that disappear are deleted and logged | parties_defined (+ unit_unseated) |
| `seatUnitAction(unit, tableId, seatIndex \| null)` | unit exists and is seatable; if seatIndex null use `firstFreeRun`; the run must be free (ignoring the unit's own current seats) | unit_seated or unit_moved |
| `unseatUnitAction(unit)` | assignment exists | unit_unseated |
| `revertAction(logId)` | entry is unit_seated / unit_moved / unit_unseated; computes the inverse (unseat, move back, or seat back at `from`) and runs it through the same validation | revert (with `revertsLogId`) |

Initial data for the couple is loaded in `app/admin/page.tsx` alongside the
existing queries and passed as `initial.seating` (tables, parties,
assignments, reserved counts, last 100 log rows). The head table row is
created on first read if missing (`ensureHeadTable`).

## 6. Client state

`useSeatingStore(initial, track)` in `components/admin/seating-store.ts`:

- Holds tables, parties, assignments, reserved counts, log.
- Derived: units (from `store.guests` filtered to Confirmed Lista 1, expanded
  into parties where defined), numbering map, per-table occupancy, unseated
  units, conflicts, inventory counters, `minTables`.
- Every mutation applies optimistically, then calls the action through the
  admin store's `track` (exposed from `useAdminStore`) so the existing
  "Guardado ✓" chip and failure banner keep working.
- On a rejected save the store calls `getSeatingStateAction()` and replaces its
  state, then surfaces the server's message in a tab-level notice ("Ese
  asiento ya está ocupado", "No caben más mesas cuadradas", …) distinct from the
  generic deploy banner.
- Table drags persist once, on pointer up; the intermediate positions are local.

## 7. UI

Tab `mesas`, label "Mesas", placed after Pronostico in `AdminApp.tabs`; couple
only, like the budget tabs. The tab's content container drops the 1200px
`maxWidth` so the map has room on wide screens.

### Layout (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ INVENTARIO  Redondas 12/20  Cuadradas 4/10  Rect. 6/10   [+○][+□][+▭] │
│ Confirmados 312 · Sentados 288 · Sin mesa 24 · Vacíos 22 · Mínimo 27 │
├───────────────┬──────────────────────────────────────────────────────┤
│ INVITADOS     │                                                      │
│ [Lorel|Coke]  │                 MAPA (SVG 960×540)                   │
│ [Grupo ▾]     │        background: mayita.png · tables on top        │
│ [buscar…]     │                                                      │
│ Sin mesa|Con  │                                                      │
│ ┌───────────┐ │                                                      │
│ │ card  (2) │ │                                                      │
│ │ card  (1) │ │                                                      │
│ │ Definir…  │ │                                                      │
│ └───────────┘ │                                                      │
├───────────────┴──────────────────────────────────────────────────────┤
│ HISTORIAL ▸ (collapsed)                     [PDF plano][PDF mesas][PDF A–Z] │
└──────────────────────────────────────────────────────────────────────┘
```

Selecting a table swaps the left panel to the table panel (with "← Invitados"
to go back). Pressing Esc or clicking the empty map deselects.

### InventoryStrip

- Three editable counters (reserved) with placed/remaining. Editing below the
  placed count is rejected inline.
- Three palette buttons. Each is draggable onto the map (drop adds the table at
  the drop point) and clickable (adds at the first valid grid spot scanning the
  seating area top-left to bottom-right). Disabled with a tooltip when the
  shape's reserved count is reached.
- Headcount line: confirmed seats, seated, unseated, empty seats at placed
  tables, theoretical minimum tables with its rect/ten breakdown, placed
  tables total. Unseated > 0 shows in amber.

### VenueMap

- `<svg viewBox="0 0 960 540">` with `<image href="/mesas/mayita.png">` as the
  first child and one `TableShape` group per table.
- Table drag: pointer events on the group; pointermove converts screen deltas
  through `getScreenCTM()`; position snaps to the 2-unit grid; the shape turns
  red while `placementProblem` is non-null; pointerup persists a valid position
  or reverts to the last valid one.
- Drop target for guest cards (HTML5 drag and drop with `dataTransfer` carrying
  the unit ref) and palette buttons (carrying the shape). Hover highlights the
  table; a table with no free run of the unit's size shows a red outline and
  rejects the drop.
- Each `TableShape` draws the top, the chairs from `seatPositions`, the number
  (or "Honor"), and `seated/capacity`. Colour: green outline when full, amber
  when partly full, stone when empty, red when any conflict.
- Rect tables show a small rotate control when selected.
- Map footer legend: shape colours and the conflict marker.

### GuestPanel

- Filters: side chips (Todos / Lorel / Coke), group select (distinct
  `group_label`s of confirmed households), text search over household name,
  first, last and party labels, and a Sin mesa / Con mesa / Todos toggle
  defaulting to Sin mesa.
- Card: label, seat badge, side colour bar, group, table number when seated,
  "Revisar" badge when in conflict. Draggable when seatable.
- Households with more than 2 confirmed seats and no parties show a "Definir
  grupos" button instead of a drag handle; households whose parties no longer
  add up show "Actualizar grupos".
- `SplitHouseholdModal`: rows of label + seats, add/remove row, live sum
  versus confirmed seats, save disabled until they match. Pre-fills one row
  with the household name and the full count so a family that sits together
  can confirm in one click.

### TablePanel

- Header: number or "Mesa de honor", shape, seated/capacity, rotate (rect),
  and "Quitar mesa" (confirm dialog when seated units exist; unseats them).
  For the locked head table neither rotate nor "Quitar mesa" is shown.
- Seat diagram: the same `seatPositions`, each seat a drop target labelled
  with the unit's initials; occupied runs are drawn as one pill spanning the
  seats. Dropping a card on a seat calls `seatUnitAction` with that index;
  dropping on a seat whose run is not free is rejected with the red outline.
- Ordered list below: seat range, label, seats, "×" to unseat. Cards here are
  draggable onto other tables on the map.

### HistoryPanel

Collapsed by default. Newest first: time, role, human sentence built from the
payload ("Coke movió *Juan y Lupita* de Mesa 4 (asientos 3–4) a Mesa 9
(asientos 1–2)"), and "Regresar" on revertible entries. Loads 100 rows
initially with "Cargar más".

### Mobile (`MesasMobile`)

`useResponsive().isMobile` switches to a read-only view: the map as a
horizontally scrollable SVG with numbers and counts, then the per-table list.
No drag handlers are attached and the inventory is display only. The same
component is reused on tablets narrower than the map's comfortable width
(≤ 1024px) since two-panel drag and drop does not fit there.

## 8. PDF exports

Route: `app/admin/mesas/pdf/[kind]/route.ts`, `kind ∈ plano | mesas | alfabetico`,
`requireCouple()`, `force-dynamic`, responds `application/pdf` with a
`Content-Disposition: attachment` filename like `Plano de mesas 10-Oct-2026.pdf`.
Built with pdf-lib and its standard Helvetica fonts (WinAnsi covers accents and
ñ). Shared header: "Lorel & Coke · Jardín Mayita · 10/Oct/2026" and the
generation timestamp.

- **plano**: one landscape page. `mayita.png` embedded and scaled to the page;
  every table drawn with the same geometry as the map (top, number, seated/
  capacity), head table labelled "Mesa de honor". Legend with shape counts.
- **mesas**: portrait, sections in number order starting with Mesa de honor:
  heading "Mesa 4 · Cuadrada · 9/10", then rows "Asientos 1–2 · Juan y Lupita
  · Familia Lerdo" in seat order. Empty seats listed as "— libre —" so the
  planner sees gaps.
- **alfabetico**: portrait, two columns, sorted by household last name, then
  first name, then party label. Each row: label, household name in muted text
  when it differs, "Mesa N". Unseated confirmed units at the end under "Sin
  mesa" in red.

## 9. Error handling

- Server rejects → optimistic state is replaced by a resync and the message is
  shown in the tab notice; the generic red banner still fires through `track`
  for unexpected failures (network, deploy).
- Dropping where a unit does not fit is rejected client-side before any call.
- Removing a table with seated units asks for confirmation and logs every
  unseat, so the history can put them back one by one.
- `parties_defined` that drops a seated party unseats it and logs it.
- The head table row missing (fresh DB) is created on read, never assumed.
- `revertAction` on an entry whose inverse no longer fits (seat taken, table
  removed) fails with "Ya no se puede regresar ese movimiento" and logs
  nothing.

## 10. Out of scope for v1

- Freezing table numbers after printing escort cards.
- Per-table capacity overrides.
- Seating Pending households as a what-if.
- Realtime sync between two open sessions.
- Planner-role access.
- Auto-layout of the minimum table set.

## 11. Testing

Vitest, following `lib/calculations.test.ts`:

- `lib/seating.test.ts`: `seatPositions` counts per shape and rotation;
  `numberTables` on a staggered grid matches the expected left-to-right,
  top-to-bottom order and is stable under tiny jitter; `placementProblem`
  for outside, hedge line, each obstacle, overlap, and a valid spot;
  `firstFreeRun` with wrap-around on round tables and no wrap on head;
  `minTables` for boundary counts (0, 10, 12, 22, 25, 120 with reserved 10
  rect, and counts beyond the reserve); `seatingConflicts` for each conflict
  kind; unit expansion for 1, 2 and >2-seat households with and without
  parties; party-sum validation.
- `lib/seating-pdf.test.ts`: each kind returns a PDF buffer that starts with
  `%PDF` and has the expected page count for a small fixture.
- Manual checklist before shipping: add each shape up to the cap, drag into
  every obstacle, seat a 2-seat unit on a round table with one free seat left
  (should be rejected), split a 6-seat household three ways and seat the
  parties at three tables, revert a move, change a confirmation and see the
  "Revisar" flag, download the three PDFs, open the tab on a phone.

## 12. Build order (for the implementation plan)

1. Schema block, `pdf-lib` dependency, venue PNG and `scripts/venue-map.py`.
2. `lib/seating.ts` with tests.
3. Queries, actions, `ensureHeadTable`, initial data wiring, `track` export.
4. Seating store.
5. Tab shell, InventoryStrip, VenueMap with table add/move/rotate/remove.
6. GuestPanel, split modal, seating by drop on the map.
7. TablePanel with seat-level drops and unseat.
8. HistoryPanel and revert.
9. Conflicts and "Revisar" flags.
10. PDF exports.
11. Mobile read-only view.
