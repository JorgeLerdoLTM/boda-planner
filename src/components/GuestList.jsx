import { useState, useMemo } from "react";
import { C, glassCard, RSVP_COLORS, INV_COLORS, TOUCH } from "../utils/theme";
import { useResponsive } from "../hooks/useMediaQuery";
import { Pill } from "./ui/Pill";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";
import { ExcelUpload } from "./ExcelUpload";

const SIDE_COLORS = {
  Lorel: { bg: C.yellowLt, color: "#8B6914" },
  Coke: { bg: C.blueLt, color: C.blue },
};

function GuestCard({ g, updateGuest, deleteGuest }) {
  return (
    <div style={{ ...glassCard, padding: 16, marginBottom: 8 }}>
      {/* Row 1: Side + RSVP + delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <InlineSelect value={g.side} options={["Lorel", "Coke"]} onChange={(v) => updateGuest(g.id, "side", v)} colors={SIDE_COLORS} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <InlineSelect value={g.rsvp} options={["Pending", "Confirmed", "Declined"]} onChange={(v) => updateGuest(g.id, "rsvp", v)} colors={RSVP_COLORS} />
          <button onClick={() => deleteGuest(g.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 18, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
        </div>
      </div>
      {/* Row 2: Name */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <EditableCell value={g.first} onChange={(v) => updateGuest(g.id, "first", v)} placeholder="Nombre" />
        <EditableCell value={g.last} onChange={(v) => updateGuest(g.id, "last", v)} placeholder="Apellido" />
      </div>
      {/* Row 3: Group + Phone */}
      <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Grupo</div>
          <EditableCell value={g.group} onChange={(v) => updateGuest(g.id, "group", v)} placeholder="Grupo" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Tel</div>
          <EditableCell value={g.phone} onChange={(v) => updateGuest(g.id, "phone", v)} placeholder="Telefono" />
        </div>
      </div>
      {/* Row 4: +1, Inv, Dieta */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>+1</div>
          <InlineSelect value={String(g.plus_one)} options={["1", "2", "4"]} onChange={(v) => updateGuest(g.id, "plus_one", Number(v))}
            colors={{ "1": { bg: "#F5F5F5", color: C.muted }, "2": { bg: C.yellowLt, color: "#8B6914" }, "4": { bg: C.blueLt, color: C.blue } }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Inv.</div>
          <InlineSelect value={g.inv_sent} options={["Not Sent", "Sent", "Delivered"]} onChange={(v) => updateGuest(g.id, "inv_sent", v)} colors={INV_COLORS} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Dieta</div>
          <EditableCell value={g.dietary} onChange={(v) => updateGuest(g.id, "dietary", v)} placeholder="\u2014" />
        </div>
      </div>
      {/* Row 5: Notes (only if needed) */}
      {(g.notes || false) && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Notas</div>
          <EditableCell value={g.notes} onChange={(v) => updateGuest(g.id, "notes", v)} placeholder="Notas" />
        </div>
      )}
    </div>
  );
}

export function GuestList({ store }) {
  const { guests, confirmed, pending, declined, plusOnes, updateGuest, deleteGuest, addGuest, importGuests } = store;
  const { isMobile } = useResponsive();

  const [sideFilter, setSideFilter] = useState("All");
  const [rsvpFilter, setRsvpFilter] = useState("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [search, setSearch] = useState("");

  const groups = useMemo(() => ["All", ...new Set(guests.map((g) => g.group).filter(Boolean))], [guests]);

  const filtered = useMemo(
    () => guests.filter((g) => {
      if (sideFilter !== "All" && g.side !== sideFilter) return false;
      if (rsvpFilter !== "All" && g.rsvp !== rsvpFilter) return false;
      if (groupFilter !== "All" && g.group !== groupFilter) return false;
      if (search && !`${g.first} ${g.last}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [guests, sideFilter, rsvpFilter, groupFilter, search],
  );

  const btnStyle = {
    background: C.greenDk, color: C.white, border: "none",
    padding: isMobile ? "12px 20px" : "9px 20px",
    fontSize: isMobile ? 13 : 11, fontWeight: 500,
    fontFamily: "'Inter', sans-serif", cursor: "pointer",
  };

  const filterStyle = {
    border: `1px solid ${C.stone}`,
    padding: isMobile ? "12px 14px" : "8px 14px",
    fontSize: isMobile ? 14 : 11,
    fontFamily: "'Inter', sans-serif",
    background: C.white, outline: "none", cursor: "pointer", color: C.ink,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", marginBottom: 20, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 22 : 26, fontWeight: 600, color: C.ink }}>Invitados</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <Pill label={`${guests.length} Total`} bg={C.blueLt} color={C.blue} />
            <Pill label={`${confirmed} Conf.`} bg="#EBF5EE" color={C.success} />
            <Pill label={`${pending} Pend.`} bg="#F5F5F5" color={C.muted} />
            <Pill label={`${declined} Decl.`} bg="#FDECEA" color={C.danger} />
            <Pill label={`${plusOnes} +1`} bg={C.yellowLt} color="#8B6914" />
          </div>
        </div>
        <button onClick={addGuest} style={btnStyle}>+ Invitado</button>
      </div>

      {/* Excel Upload */}
      <ExcelUpload onImport={importGuests} existingCount={guests.length} />

      {/* Filters */}
      <div style={{ display: "flex", gap: isMobile ? 8 : 1, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre..."
          style={{ ...filterStyle, flex: 1, minWidth: isMobile ? "100%" : 140 }} />
        {[
          ["Side", sideFilter, setSideFilter, ["All", "Lorel", "Coke"]],
          ["RSVP", rsvpFilter, setRsvpFilter, ["All", "Pending", "Confirmed", "Declined"]],
          ["Grupo", groupFilter, setGroupFilter, groups],
        ].map(([label, val, setter, opts]) => (
          <select key={label} value={val} onChange={(e) => setter(e.target.value)}
            style={{ ...filterStyle, flex: isMobile ? 1 : "none", minWidth: isMobile ? 0 : "auto" }}>
            {opts.map((o) => <option key={o} value={o}>{o === "All" ? label : o}</option>)}
          </select>
        ))}
      </div>

      {/* Mobile: cards */}
      {isMobile ? (
        <div>
          {filtered.map((g) => <GuestCard key={g.id} g={g} updateGuest={updateGuest} deleteGuest={deleteGuest} />)}
          <div style={{ fontSize: 11, color: C.muted, padding: "12px 0" }}>{filtered.length} de {guests.length}</div>
        </div>
      ) : (
        /* Desktop: table */
        <div style={{ ...glassCard, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {["Side", "Grupo", "Nombre", "Apellido", "+1", "Tel", "RSVP", "Inv.", "Dieta", "Notas", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.stone}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${C.cream}` }}>
                  <td style={{ padding: "8px 12px" }}>
                    <InlineSelect value={g.side} options={["Lorel", "Coke"]} onChange={(v) => updateGuest(g.id, "side", v)} colors={SIDE_COLORS} />
                  </td>
                  <td style={{ padding: "8px 12px" }}><EditableCell value={g.group} onChange={(v) => updateGuest(g.id, "group", v)} placeholder="Grupo" /></td>
                  <td style={{ padding: "8px 12px" }}><EditableCell value={g.first} onChange={(v) => updateGuest(g.id, "first", v)} /></td>
                  <td style={{ padding: "8px 12px" }}><EditableCell value={g.last} onChange={(v) => updateGuest(g.id, "last", v)} /></td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <InlineSelect value={String(g.plus_one)} options={["1", "2", "4"]} onChange={(v) => updateGuest(g.id, "plus_one", Number(v))}
                      colors={{ "1": { bg: "#F5F5F5", color: C.muted }, "2": { bg: C.yellowLt, color: "#8B6914" }, "4": { bg: C.blueLt, color: C.blue } }} />
                  </td>
                  <td style={{ padding: "8px 12px" }}><EditableCell value={g.phone} onChange={(v) => updateGuest(g.id, "phone", v)} placeholder="Tel" /></td>
                  <td style={{ padding: "8px 12px" }}><InlineSelect value={g.rsvp} options={["Pending", "Confirmed", "Declined"]} onChange={(v) => updateGuest(g.id, "rsvp", v)} colors={RSVP_COLORS} /></td>
                  <td style={{ padding: "8px 12px" }}><InlineSelect value={g.inv_sent} options={["Not Sent", "Sent", "Delivered"]} onChange={(v) => updateGuest(g.id, "inv_sent", v)} colors={INV_COLORS} /></td>
                  <td style={{ padding: "8px 12px" }}><EditableCell value={g.dietary} onChange={(v) => updateGuest(g.id, "dietary", v)} placeholder="Dieta" /></td>
                  <td style={{ padding: "8px 12px" }}><EditableCell value={g.notes} onChange={(v) => updateGuest(g.id, "notes", v)} placeholder="Notas" /></td>
                  <td style={{ padding: "8px 6px", textAlign: "center" }}>
                    <button onClick={() => deleteGuest(g.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 14 }}>&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 14px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.stone}` }}>{filtered.length} de {guests.length}</div>
        </div>
      )}
    </div>
  );
}
