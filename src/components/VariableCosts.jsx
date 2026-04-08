import { C } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";

export function VariableCosts({ store }) {
  const { varCosts, varTotal, attendees, invitees, updateVar, deleteVar, addVar } = store;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: C.ink }}>Costos Variables</div>
          <div style={{ fontSize: 12, color: C.muted }}>Basado en {attendees} asistentes &middot; Total: {fmt(varTotal)}</div>
        </div>
        <button
          onClick={addVar}
          style={{ background: C.blue, color: C.white, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Agregar
        </button>
      </div>

      <div style={{ background: C.yellowLt, border: `1px solid ${C.yellow}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 20, alignItems: "center", fontSize: 12, color: "#8B6914" }}>
        <span>Asistentes: <strong>{attendees}</strong></span>
        <span>Invitados: <strong>{invitees}</strong></span>
        <span style={{ color: C.muted, fontSize: 11 }}>Ajusta los sliders en Dashboard para cambiar estos valores</span>
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ background: C.blue }}>
              {["Categoria", "Concepto", "Aplica a", "Costo/persona", "Min. personas", "Total estimado", "Notas", ""].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.blueXlt, fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {varCosts.map((c, i) => {
              const base = c.applies_to === "attendees" ? attendees : invitees;
              const est = (Number(c.unit_cost) || 0) * base;
              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.stone}`, background: i % 2 === 0 ? C.white : C.cream }}>
                  <td style={{ padding: "9px 12px" }}>
                    <EditableCell value={c.category} onChange={(v) => updateVar(c.id, "category", v)} placeholder="Categoria" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <EditableCell value={c.name} onChange={(v) => updateVar(c.id, "name", v)} placeholder="Concepto" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <InlineSelect
                      value={c.applies_to}
                      options={["attendees", "invitees"]}
                      onChange={(v) => updateVar(c.id, "applies_to", v)}
                      colors={{ attendees: { bg: C.blueXlt, color: C.blue }, invitees: { bg: C.yellowLt, color: "#8B6914" } }}
                    />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                    <EditableCell value={c.unit_cost} onChange={(v) => updateVar(c.id, "unit_cost", Number(v))} type="number" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <EditableCell value={c.min_guests} onChange={(v) => updateVar(c.id, "min_guests", Number(v))} type="number" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: C.blue }}>{fmt(est)}</td>
                  <td style={{ padding: "9px 12px", maxWidth: 200 }}>
                    <EditableCell value={c.notes} onChange={(v) => updateVar(c.id, "notes", v)} placeholder="Notas" />
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "center" }}>
                    <button onClick={() => deleteVar(c.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 15, padding: "0 4px" }}>
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: C.blueXlt, borderTop: `2px solid ${C.blue}` }}>
              <td colSpan={5} style={{ padding: "10px 12px", fontWeight: 700, color: C.blue, fontSize: 12 }}>TOTAL ESTIMADO</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: C.blue }}>{fmt(varTotal)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
