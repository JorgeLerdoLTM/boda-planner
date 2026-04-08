# 💍 Wedding Forecast Engine — Project Spec v2

> **Lorel & Coke** · September 2026
> Tuscan / Capri aesthetic — Lemon Yellow + Italian Blue + Warm White

---

## Design System

### Theme: Tuscany & Capri
- **Primary**: Italian Blue `#1B4F8A`
- **Accent**: Lemon Yellow `#F5C518`
- **Warm White**: `#FFFDF5`
- **Stone**: `#E8E0D0`
- **Dark Ink**: `#1A1A2E`
- **Success Green**: `#4A7C59`
- **Danger Red**: `#C0392B`

### Typography
- **Display**: Cormorant Garamond (serif) — titles, large numbers
- **Body**: DM Sans or Lato — tables, labels, inputs
- **Feel**: Editorial Italian luxury — think Amalfi coast wedding invite

### Mood
Minimalist and modern but warm. Think white linen tablecloths, blue ceramic, lemon centerpieces. Not cold or corporate.

---

## Architecture Overview

**No backend. No database.** All state lives in React (`useState`). Data is loaded from the Excel file via SheetJS on first launch and stored in component state. Users can also edit everything inline.

```
wedding-forecast/
├── App.jsx              # Root with tab navigation
├── data/
│   └── weddingData.js   # Seed data parsed from Excel (hardcoded fallback)
├── components/
│   ├── Dashboard.jsx    # Overview: all KPIs in one view
│   ├── FixedCosts.jsx   # Editable table of fixed costs
│   ├── VariableCosts.jsx# Editable table of variable costs
│   ├── GuestList.jsx    # Full guest list with dropdowns + filters
│   └── Forecast.jsx     # Sliders + scenario comparison
├── hooks/
│   └── useWeddingStore.js  # Central state: costs, guests, settings
└── utils/
    └── calculations.js  # Pure functions: totals, per-person, scenarios
```

---

## Core Features

### 1. Dashboard View (NEW)
A single-screen overview showing:
- **Total estimated budget** (large hero number)
- **Paid to date** vs **Balance remaining**
- **Expected attendees** (from slider)
- **Cost per attendee**
- **Fixed vs Variable** split (donut chart)
- **Cost by category** (horizontal bar chart)
- **RSVP summary** (Confirmed / Pending / Declined pill counts)
- **Payment timeline** — upcoming due dates sorted chronologically
- **Quick scenario strip** — Intimate / Current / Expanded side by side

### 2. Guest Count Slider
- Range: 100–600
- Default: 450 (total invitees from data)
- Drives all variable cost calculations

### 3. Cancellation Rate Slider
- Default: 20%
- Range: 0%–40%
- Expected attendees = Invitees × (1 − Cancellation Rate)

### 4. Fixed Costs Table (Editable)
Fully editable inline table. Columns:

| Column | Type | Notes |
|---|---|---|
| # | auto | Row index |
| category | text input | e.g. Salon, DJ, Flores |
| item_name | text input | Vendor or description |
| amount_mxn | number input | Blue text = user input |
| paid_to_date | number input | |
| balance_due | formula | `amount - paid` — auto |
| payment_due_date | date input | |
| status_tag | dropdown | See options below |
| notes | text input | Free text |

**Status Tag dropdown options:**
- `Anticipo pagado` (yellow)
- `Cotizado` (blue)
- `Por Definir` (gray)
- `Pagado completo` (green)
- `Cancelado` (red)

**Add row button** — inserts a blank row at the bottom (above totals).
**Delete row** — trash icon on hover per row.

### 5. Variable Costs Table (Editable)
Columns:

| Column | Type | Notes |
|---|---|---|
| # | auto | |
| category | text | |
| item_name | text | |
| applies_to | dropdown | `attendees` or `invitees` |
| unit_cost_mxn | number | Per person cost |
| min_guests | number | Optional minimum |
| estimated_total | formula | `unit_cost × attendees/invitees` — auto |
| notes | text | |

Add/delete rows inline.

### 6. Guest List (Full Editable Table)
Loaded from **"Guest List input"** sheet. Columns to display:

| Column | Type | Notes |
|---|---|---|
| side | pill / display | Lorel (Bride) or Coke (Groom) — color coded |
| group | text | Fam Haro, Amiga Regis, Novio, etc. |
| first_name | text input | Editable |
| last_name | text input | Editable |
| plus_one | toggle | 1 = No, 2 = Yes (or more) |
| email_phone | text input | |
| rsvp_status | **dropdown** | Pending / Confirmed / Declined |
| invitation_sent | **dropdown** | Not Sent / Sent / Delivered |
| dietary | text input | Blank = none (keep column, show dash) |
| notes | text input | |

**Dropdown options for rsvp_status:**
- `Pending` (gray)
- `Confirmed` (green)
- `Declined` (red)

**Dropdown options for invitation_sent:**
- `Not Sent` (gray)
- `Sent` (yellow)
- `Delivered` (green)

**Filters bar above table:**
- Filter by `side`: All / Lorel / Coke
- Filter by `group`: All / [dynamic list from data]
- Filter by `rsvp_status`: All / Pending / Confirmed / Declined
- Search by name

**Add guest** button — opens inline blank row at the bottom.
**RSVP counter pills** at top of table: Total · Confirmed · Pending · Declined · +1s

**Guest data from Excel (pre-load):**
Note: `plus_one` values in Excel: 1 = No +1 (solo), 2 = has +1. A value of 4 = family (4 seats). Map to display labels accordingly.

Side mapping: `Lorel` = Bride side, `Coke` = Groom side.

---

## Seed Data (from Excel — hardcode as fallback)

### Fixed Costs
```js
const fixedCosts = [
  { id:"f1",  category:"Salon",               name:"Mayita",                         amount:383902, paid:100000, due:"2026-09-15", status:"Anticipo pagado", notes:"" },
  { id:"f2",  category:"Iglesia",             name:"Universidad Anahuac",            amount:13000,  paid:6500,   due:"2026-09-01", status:"Anticipo pagado", notes:"" },
  { id:"f3",  category:"DJ",                  name:"Rux Productions",                amount:94000,  paid:10000,  due:"2026-09-01", status:"Anticipo pagado", notes:"" },
  { id:"f4",  category:"Foto y Video",        name:"Diego Dingo Cinema",             amount:74000,  paid:0,      due:"2026-09-01", status:"Cotizado",        notes:"" },
  { id:"f5",  category:"Wedding planner",     name:"Sparkle Wedding Planner",        amount:35000,  paid:7874.75,due:"2026-09-01", status:"Anticipo pagado", notes:"" },
  { id:"f6",  category:"Coro Misa",           name:"Renacimiento Coros y Orquesta",  amount:19062,  paid:0,      due:"2026-09-01", status:"Cotizado",        notes:"" },
  { id:"f7",  category:"Mesa dulces/quesos",  name:"The Candy Station",              amount:50150,  paid:5000,   due:"2026-09-01", status:"Anticipo pagado", notes:"Pago Lorel 5k" },
  { id:"f8",  category:"Argollas",            name:"TBD",                            amount:15000,  paid:0,      due:"2026-09-01", status:"Por Definir",     notes:"Estimado aprox 8-9k por argolla" },
  { id:"f9",  category:"Termos y Pantuflas",  name:"TBD",                            amount:5169,   paid:0,      due:"2026-09-01", status:"Por Definir",     notes:"275 Cilindros + 135 Pantuflas" },
  { id:"f10", category:"Diseño Invitaciones", name:"Blanca",                         amount:5500,   paid:0,      due:"2026-09-01", status:"Por Definir",     notes:"Estimado basado en Andrea e Iñigo" },
  { id:"f11", category:"Fraq Hombres",        name:"TBD",                            amount:35000,  paid:0,      due:"2026-09-01", status:"Por Definir",     notes:"7 personas estimado Moni Avila" },
  { id:"f12", category:"Flores Iglesia",      name:"TBD",                            amount:20000,  paid:0,      due:"2026-09-01", status:"Por Definir",     notes:"Estimado -30% vs Iñigo (Valentine's)" },
  { id:"f13", category:"Renta fundas sillas", name:"Mayita / Eterum",                amount:27000,  paid:0,      due:"2026-09-01", status:"Cotizado",        notes:"200 fundas Tiffany Santorini beige" },
  { id:"f14", category:"Renta Copa y Plato",  name:"Mayita / 11:11",                 amount:18000,  paid:0,      due:"2026-09-01", status:"Cotizado",        notes:"Copa verde $40 + Plato azul $50 × 200" },
  { id:"f15", category:"Flores",              name:"Mattiola",                       amount:161533, paid:0,      due:"2026-09-01", status:"Cotizado",        notes:"TBD precio final" },
  { id:"f16", category:"Violin Banquete",     name:"",                               amount:25000,  paid:2000,   due:"2026-09-01", status:"Anticipo pagado", notes:"Pago Lorel 5k" },
];
```

### Variable Costs
```js
const variableCosts = [
  { id:"v1", category:"Banquete", name:"Mayita costo promedio menús",          applies_to:"attendees", unit_cost:1393, min_guests:0, notes:"incluye tornafiestas, cocteles de entrada, aguas" },
  { id:"v2", category:"Banquete", name:"Mayita Refrescos, jugos, hielos",      applies_to:"attendees", unit_cost:108,  min_guests:0, notes:"4 opciones" },
  { id:"v3", category:"Alcohol",  name:"Barra libre Europea (benchmark)",      applies_to:"attendees", unit_cost:365,  min_guests:0, notes:"Promedio 6 cotizaciones" },
];
```

### Settings
```js
const settings = {
  totalInvitees: 450,    // from Excel K3
  expectedAttendees: 400, // from Excel K2
  cancellationRate: 0.11, // derived: 1 - (400/450)
  contingencyBuffer: 0.05,
  currency: "MXN",
  weddingDate: "2026-09-XX",
  bride: "Lorel",
  groom: "Coke",
};
```

---

## Calculations (Pure Functions)

```js
// utils/calculations.js

export const getExpectedAttendees = (invitees, cancellationRate) =>
  Math.round(invitees * (1 - cancellationRate));

export const getFixedTotal = (fixedCosts) =>
  fixedCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

export const getVariableTotal = (varCosts, attendees, invitees) =>
  varCosts.reduce((sum, c) => {
    const base = c.applies_to === "attendees" ? attendees : invitees;
    return sum + (Number(c.unit_cost) || 0) * base;
  }, 0);

export const getPaidTotal = (fixedCosts) =>
  fixedCosts.reduce((sum, c) => sum + (Number(c.paid) || 0), 0);

export const getBalanceTotal = (fixedCosts) =>
  fixedCosts.reduce((sum, c) => sum + Math.max(0, (Number(c.amount)||0) - (Number(c.paid)||0)), 0);

export const getTotalCost = (fixedTotal, varTotal, contingency) =>
  (fixedTotal + varTotal) * (1 + contingency);

export const getCostPerAttendee = (total, attendees) =>
  attendees > 0 ? total / attendees : 0;

export const getScenario = (invitees, cancelRate, fixedCosts, varCosts, contingency) => {
  const att = getExpectedAttendees(invitees, cancelRate);
  const fixed = getFixedTotal(fixedCosts);
  const variable = getVariableTotal(varCosts, att, invitees);
  const total = getTotalCost(fixed, variable, contingency);
  return { invitees, attendees: att, fixed, variable, total, perAttendee: getCostPerAttendee(total, att) };
};
```

---

## Component Specs

### `<Dashboard />`
The main landing view. Shows:
- Hero card: Total Budget, Paid, Balance
- 2-col grid: Sliders left, KPI cards right
- Donut chart: Fixed vs Variable
- Horizontal bar: Cost by category (sorted desc)
- Guest RSVP pills: Confirmed · Pending · Declined
- Payment timeline: upcoming sorted by date
- Scenario strip: 3 cards (Intimate 80%, Current, Extended 120%)

### `<FixedCosts />`
- Full-width table
- Each row fully editable on click
- Status tag shown as colored pill, click to dropdown
- Balance = auto-calculated (not editable)
- `+ Add row` button at bottom
- `🗑` delete on hover
- Totals row: fixed, auto-computed

### `<VariableCosts />`
- Same pattern as Fixed Costs
- `applies_to` shown as toggle pill: Attendees / Invitees
- `estimated_total` computed live from slider values
- Totals row at bottom

### `<GuestList />`
- Filter bar: side / group / rsvp / search
- RSVP summary pills above table
- Full table with inline editing
- `rsvp_status` and `invitation_sent` as styled dropdowns
- `plus_one` as toggle: No / Yes / Family
- `+ Add guest` at bottom
- Color coding: Lorel rows = warm yellow tint, Coke rows = blue tint

### `<Forecast />`
- Two sliders
- Live KPI cards
- Scenario comparison 3-up

---

## Phase 2 Backlog

- [ ] Payment installment scheduler — per vendor, track deposit / next payment / final
- [ ] Vendor comparison mode — compare 3 quotes for same category
- [ ] Excel re-import — drag & drop updated Excel to refresh data
- [ ] Export to PDF — print-friendly summary for sharing with vendors
- [ ] Contingency alert — flag when any category exceeds 20% of total budget
- [ ] WhatsApp/email link per guest (tap phone number to open WA)

---

## Notes for Claude Code

1. **Start with `useWeddingStore.js`** — central state with `useState` arrays for `fixedCosts`, `varCosts`, `guests`, and `settings`. Pass down via props or context.
2. **Seed data** — hardcode from this spec. Don't try to import the Excel at runtime (SheetJS can be added later as enhancement).
3. **Design tokens** — define CSS variables or a Tailwind theme extension with the Capri palette at the top of `App.jsx` or `index.css`.
4. **Table editing pattern** — use `onBlur` to commit edits, not `onChange`, to avoid re-render lag on large guest list.
5. **Currency formatting** — always format MXN with `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
6. **Date formatting** — display as `DD MMM YYYY` in Spanish (e.g. `15 Sep 2026`).
7. **Guest list has 58 guests** from the Excel — pre-load all of them as seed data. All start with `rsvp_status: "Pending"` and `invitation_sent: "Not Sent"`.
8. **plus_one mapping**: value `1` = No, value `2` = Yes (+1), value `4` = Family group.
