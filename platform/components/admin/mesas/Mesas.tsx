"use client";
import { useEffect } from "react";
import { C } from "@/lib/theme";
import { useResponsive } from "../../hooks";
import type { AdminStore } from "../store";
import type { SeatingStore } from "../seating-store";
import { InventoryStrip } from "./InventoryStrip";
import { VenueMap } from "./VenueMap";
import { GuestPanel } from "./GuestPanel";
import { TablePanel } from "./TablePanel";
import { HistoryPanel } from "./HistoryPanel";
import { MesasMobile } from "./MesasMobile";

export function Mesas({ store, seating }: { store: AdminStore; seating: SeatingStore }) {
  const { selectTable } = seating;
  const { isMobile, isTablet } = useResponsive();
  // Esc deselects the table (spec §7); all hooks stay above any early return.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") selectTable(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectTable]);

  // Phones and tablets: read-only view (all hooks are above this early return).
  if (isMobile || isTablet) return <MesasMobile seating={seating} />;

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
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
        {([["plano", "PDF · Plano numerado"], ["mesas", "PDF · Lista por mesa"], ["alfabetico", "PDF · Lista alfabética"]] as const).map(([k, l]) => (
          <a key={k} href={`/admin/mesas/pdf/${k}`} download
            style={{ fontSize: 11, color: C.greenDk, textDecoration: "none", border: `1px solid ${C.greenDk}`, padding: "7px 12px", fontFamily: "'Inter', sans-serif" }}>{l}</a>
        ))}
      </div>
      <HistoryPanel seating={seating} />
    </div>
  );
}
