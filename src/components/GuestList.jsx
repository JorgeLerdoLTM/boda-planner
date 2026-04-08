import { useState, useMemo } from "react";
import { C, glassCard, RSVP_COLORS, INV_COLORS } from "../utils/theme";
import { Pill } from "./ui/Pill";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";

export function GuestList({ store }) {
  const { guests, confirmed, pending, declined, plusOnes, updateGuest, deleteGuest, addGuest } = store;

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: C.ink }}>Invitados</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Pill label={`${guests.length} Total`} bg={C.blueXlt} color={C.blue} />
            <Pill label={`${confirmed} Confirmados`} bg="#EBF5EE" color={C.success} />
            <Pill label={`${pending} Pendientes`} bg="#F5F5F5" color={C.muted} />
            <Pill label={`${declined} Declinados`} bg="#FDECEA" color={C.danger} />
            <Pill label={`${plusOnes} +1`} bg={C.yellowLt} color="#8B6914" />
          </div>
        </div>
        <button onClick={addGuest}
          style={{ background: C.ink, color: C.white, border: "none", padding: "9px 20px", fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
          + Invitado
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 1, marginBottom: 20 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre..."
          style={{ border: `1px solid ${C.stone}`, padding: "8px 14px", fontSize: 11, fontFamily: "'Inter', sans-serif", outline: "none", flex: 1, minWidth: 140, background: C.white }} />
        {[
          ["Side", sideFilter, setSideFilter, ["All", "Lorel", "Coke"]],
          ["RSVP", rsvpFilter, setRsvpFilter, ["All", "Pending", "Confirmed", "Declined"]],
          ["Grupo", groupFilter, setGroupFilter, groups],
        ].map(([label, val, setter, opts]) => (
          <select key={label} value={val} onChange={(e) => setter(e.target.value)}
            style={{ border: `1px solid ${C.stone}`, padding: "8px 14px", fontSize: 11, fontFamily: "'Inter', sans-serif", background: C.white, outline: "none", cursor: "pointer", color: C.ink }}>
            {opts.map((o) => <option key={o} value={o}>{o === "All" ? `${label}` : o}</option>)}
          </select>
        ))}
      </div>

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
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", background: g.side === "Lorel" ? C.yellowLt : C.blueXlt, color: g.side === "Lorel" ? "#8B6914" : C.blue }}>{g.side}</span>
                </td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted }}>{g.group}</td>
                <td style={{ padding: "8px 12px" }}><EditableCell value={g.first} onChange={(v) => updateGuest(g.id, "first", v)} /></td>
                <td style={{ padding: "8px 12px" }}><EditableCell value={g.last} onChange={(v) => updateGuest(g.id, "last", v)} /></td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <InlineSelect value={String(g.plus_one)} options={["1", "2", "4"]} onChange={(v) => updateGuest(g.id, "plus_one", Number(v))}
                    colors={{ "1": { bg: "#F5F5F5", color: C.muted }, "2": { bg: C.yellowLt, color: "#8B6914" }, "4": { bg: C.blueXlt, color: C.blue } }} />
                </td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted }}>{g.phone}</td>
                <td style={{ padding: "8px 12px" }}><InlineSelect value={g.rsvp} options={["Pending", "Confirmed", "Declined"]} onChange={(v) => updateGuest(g.id, "rsvp", v)} colors={RSVP_COLORS} /></td>
                <td style={{ padding: "8px 12px" }}><InlineSelect value={g.inv_sent} options={["Not Sent", "Sent", "Delivered"]} onChange={(v) => updateGuest(g.id, "inv_sent", v)} colors={INV_COLORS} /></td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: g.dietary ? C.danger : C.stone }}>{g.dietary || "\u2014"}</td>
                <td style={{ padding: "8px 12px" }}><EditableCell value={g.notes} onChange={(v) => updateGuest(g.id, "notes", v)} placeholder="Notas" /></td>
                <td style={{ padding: "8px 6px", textAlign: "center" }}>
                  <button onClick={() => deleteGuest(g.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 14 }}>&times;</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "10px 14px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.stone}` }}>
          {filtered.length} de {guests.length}
        </div>
      </div>
    </div>
  );
}
