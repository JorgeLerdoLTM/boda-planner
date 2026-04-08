import { useState, useMemo } from "react";
import { C, RSVP_COLORS, INV_COLORS } from "../utils/theme";
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
    () =>
      guests.filter((g) => {
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
      {/* RSVP pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Pill label={`${guests.length} Total`} bg={C.blueXlt} color={C.blue} dot={C.blue} />
        <Pill label={`${confirmed} Confirmados`} bg="#D8F0E0" color={C.success} dot={C.success} />
        <Pill label={`${pending} Pendientes`} bg="#F0EFEF" color={C.muted} dot="#9E9E9E" />
        <Pill label={`${declined} Declinados`} bg="#FDECEA" color={C.danger} dot={C.danger} />
        <Pill label={`${plusOnes} con +1`} bg={C.yellowLt} color="#8B6914" dot={C.yellow} />
        <button
          onClick={addGuest}
          style={{ marginLeft: "auto", background: C.blue, color: C.white, border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          + Invitado
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nombre..."
          style={{ border: `1px solid ${C.stone}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, outline: "none", flex: 1, minWidth: 160, background: C.white }}
        />
        {[
          ["Side", sideFilter, setSideFilter, ["All", "Lorel", "Coke"]],
          ["RSVP", rsvpFilter, setRsvpFilter, ["All", "Pending", "Confirmed", "Declined"]],
          ["Grupo", groupFilter, setGroupFilter, groups],
        ].map(([label, val, setter, opts]) => (
          <select
            key={label}
            value={val}
            onChange={(e) => setter(e.target.value)}
            style={{ border: `1px solid ${C.stone}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, background: C.white, outline: "none", cursor: "pointer" }}
          >
            {opts.map((o) => (
              <option key={o} value={o}>
                {o === "All" ? `Todos (${label})` : o}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: C.blue }}>
              {["Side", "Grupo", "Nombre", "Apellido", "+1", "Telefono", "RSVP", "Invitacion", "Dieta", "Notas", ""].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.blueXlt, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((g, i) => {
              const rowBg = g.side === "Lorel" ? (i % 2 === 0 ? C.white : "#FFFBF0") : (i % 2 === 0 ? "#F5F9FF" : "#EEF4FF");
              return (
                <tr key={g.id} style={{ borderBottom: `1px solid ${C.stone}`, background: rowBg }}>
                  <td style={{ padding: "8px 12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: g.side === "Lorel" ? C.yellowLt : C.blueXlt,
                        color: g.side === "Lorel" ? "#8B6914" : C.blue,
                      }}
                    >
                      {g.side}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted }}>{g.group}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <EditableCell value={g.first} onChange={(v) => updateGuest(g.id, "first", v)} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <EditableCell value={g.last} onChange={(v) => updateGuest(g.id, "last", v)} />
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <InlineSelect
                      value={String(g.plus_one)}
                      options={["1", "2", "4"]}
                      onChange={(v) => updateGuest(g.id, "plus_one", Number(v))}
                      colors={{ "1": { bg: "#F0EFEF", color: C.muted }, "2": { bg: C.yellowLt, color: "#8B6914" }, "4": { bg: C.blueXlt, color: C.blue } }}
                    />
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted }}>{g.phone}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <InlineSelect value={g.rsvp} options={["Pending", "Confirmed", "Declined"]} onChange={(v) => updateGuest(g.id, "rsvp", v)} colors={RSVP_COLORS} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <InlineSelect value={g.inv_sent} options={["Not Sent", "Sent", "Delivered"]} onChange={(v) => updateGuest(g.id, "inv_sent", v)} colors={INV_COLORS} />
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: g.dietary ? C.danger : C.stone }}>{g.dietary || "\u2014"}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <EditableCell value={g.notes} onChange={(v) => updateGuest(g.id, "notes", v)} placeholder="Notas" />
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "center" }}>
                    <button onClick={() => deleteGuest(g.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 15 }}>
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "10px 16px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.stone}` }}>
          Mostrando {filtered.length} de {guests.length} invitados
        </div>
      </div>
    </div>
  );
}
