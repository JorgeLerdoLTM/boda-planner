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
