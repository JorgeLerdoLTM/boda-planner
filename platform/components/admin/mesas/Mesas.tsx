"use client";
import { useEffect } from "react";
import { C } from "@/lib/theme";
import type { AdminStore } from "../store";
import type { SeatingStore } from "../seating-store";
import { InventoryStrip } from "./InventoryStrip";
import { VenueMap } from "./VenueMap";
import { GuestPanel } from "./GuestPanel";
import { TablePanel } from "./TablePanel";
import { HistoryPanel } from "./HistoryPanel";

export function Mesas({ store, seating }: { store: AdminStore; seating: SeatingStore }) {
  const { selectTable } = seating;
  // Esc deselects the table (spec §7); all hooks stay above any early return.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") selectTable(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectTable]);

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
          {seating.selectedTableId ? <TablePanel seating={seating} /> : <GuestPanel store={store} seating={seating} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <VenueMap seating={seating} />
        </div>
      </div>
      <HistoryPanel seating={seating} />
    </div>
  );
}
