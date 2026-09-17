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
