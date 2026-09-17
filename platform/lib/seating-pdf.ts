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
    const shapeLabel = t.shape === "head" ? "" : ` · ${SHAPE_LABEL[t.shape]}`;
    line(`${tableTitle(t, numbering)}${shapeLabel} · ${seated}/${t.capacity}`, { size: 12, font: ctx.bold, color: GREEN });
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
