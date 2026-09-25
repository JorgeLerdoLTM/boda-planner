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
    expect(p.slice(0, 5).every((s) => s.y < 0)).toBe(true); // side A above
    expect(p[5].x).toBeGreaterThan(20); // right end
    expect(p.slice(6, 11).every((s) => s.y > 0)).toBe(true); // side B below
    expect(p[11].x).toBeLessThan(-20); // left end
  });
  it("rotates rect seats by 90°", () => {
    const p = seatPositions("rect", 90);
    expect(p.slice(0, 5).every((s) => s.x > 0)).toBe(true);
  });
  it("puts head seats in one row above the oval", () => {
    const p = seatPositions("head", 0);
    expect(p.every((s) => s.y < 0)).toBe(true);
    expect(p[0].x).toBeLessThan(p[12].x);
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
    expect(placementProblem(table({ id: "a", x: 725, y: 380 }), [])).toBe("fuera");
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
    expect(n.get("C")).toBe(2);
    expect(n.get("F")).toBe(3);
    expect(n.get("A")).toBe(4);
    expect(n.get("D")).toBe(5);
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
  const reserved = { round: 20, square: 8, rect: 12 };
  it.each([
    [0, 0, 0, 0], [10, 1, 1, 0], [12, 1, 1, 0], [22, 2, 2, 0], [25, 3, 3, 0], [384, 32, 32, 0], [394, 33, 32, 1], [420, 36, 32, 4],
  ])("confirmed %i → %i tables (%i twelves, %i tens)", (confirmed, total, twelves, tens) => {
    expect(minTables(confirmed, reserved)).toMatchObject({ total, twelves, tens, fits: true });
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
