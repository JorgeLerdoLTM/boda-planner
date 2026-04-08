import { C, glassCard, TOUCH } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { useResponsive } from "../hooks/useMediaQuery";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";

function VarCard({ c, attendees, invitees, updateVar, deleteVar }) {
  const base = c.applies_to === "attendees" ? attendees : invitees;
  const est = (Number(c.unit_cost) || 0) * base;
  return (
    <div style={{ ...glassCard, padding: 16, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <EditableCell value={c.category} onChange={(v) => updateVar(c.id, "category", v)} placeholder="Categoria" />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <InlineSelect value={c.applies_to} options={["attendees", "invitees"]} onChange={(v) => updateVar(c.id, "applies_to", v)}
            colors={{ attendees: { bg: C.blueLt, color: C.blue }, invitees: { bg: C.yellowLt, color: "#8B6914" } }} />
          <button onClick={() => deleteVar(c.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 18, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <EditableCell value={c.name} onChange={(v) => updateVar(c.id, "name", v)} placeholder="Concepto" />
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Costo/pp</div>
          <EditableCell value={c.unit_cost} onChange={(v) => updateVar(c.id, "unit_cost", Number(v))} type="number" displayFormat={fmt} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Min.</div>
          <EditableCell value={c.min_guests} onChange={(v) => updateVar(c.id, "min_guests", Number(v))} type="number" />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Total estimado</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{fmt(est)}</div>
      </div>
      {c.notes && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Notas</div>
          <EditableCell value={c.notes} onChange={(v) => updateVar(c.id, "notes", v)} placeholder="Notas" />
        </div>
      )}
    </div>
  );
}

export function VariableCosts({ store }) {
  const { varCosts, varTotal, attendees, invitees, updateVar, deleteVar, addVar } = store;
  const { isMobile } = useResponsive();

  const btnStyle = {
    background: C.greenDk, color: C.white, border: "none",
    padding: isMobile ? "12px 20px" : "9px 20px",
    fontSize: isMobile ? 13 : 11, fontWeight: 500,
    fontFamily: "'Inter', sans-serif", cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", marginBottom: 24, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 22 : 26, fontWeight: 600, color: C.ink }}>Costos Variables</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{attendees} asistentes &middot; {fmt(varTotal)} total</div>
        </div>
        <button onClick={addVar} style={btnStyle}>+ Agregar</button>
      </div>

      <div style={{ background: C.cream, padding: "8px 16px", marginBottom: 20, display: "flex", gap: 20, alignItems: "center", fontSize: 11, color: C.muted, border: `1px solid ${C.stone}`, flexWrap: "wrap" }}>
        <span>Asistentes: <strong style={{ color: C.ink }}>{attendees}</strong></span>
        <span>Invitados: <strong style={{ color: C.ink }}>{invitees}</strong></span>
      </div>

      {isMobile ? (
        <div>
          {varCosts.map((c) => <VarCard key={c.id} c={c} attendees={attendees} invitees={invitees} updateVar={updateVar} deleteVar={deleteVar} />)}
        </div>
      ) : (
        <div style={{ ...glassCard, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr>
                {["Categoria", "Concepto", "Aplica a", "Costo/pp", "Min.", "Total", "Notas", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.stone}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {varCosts.map((c) => {
                const base = c.applies_to === "attendees" ? attendees : invitees;
                const est = (Number(c.unit_cost) || 0) * base;
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.cream}` }}>
                    <td style={{ padding: "10px 14px" }}><EditableCell value={c.category} onChange={(v) => updateVar(c.id, "category", v)} placeholder="Categoria" /></td>
                    <td style={{ padding: "10px 14px" }}><EditableCell value={c.name} onChange={(v) => updateVar(c.id, "name", v)} placeholder="Concepto" /></td>
                    <td style={{ padding: "10px 14px" }}>
                      <InlineSelect value={c.applies_to} options={["attendees", "invitees"]} onChange={(v) => updateVar(c.id, "applies_to", v)}
                        colors={{ attendees: { bg: C.blueLt, color: C.blue }, invitees: { bg: C.yellowLt, color: "#8B6914" } }} />
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}><EditableCell value={c.unit_cost} onChange={(v) => updateVar(c.id, "unit_cost", Number(v))} type="number" displayFormat={fmt} /></td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><EditableCell value={c.min_guests} onChange={(v) => updateVar(c.id, "min_guests", Number(v))} type="number" /></td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 12 }}>{fmt(est)}</td>
                    <td style={{ padding: "10px 14px", maxWidth: 180 }}><EditableCell value={c.notes} onChange={(v) => updateVar(c.id, "notes", v)} placeholder="Notas" /></td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <button onClick={() => deleteVar(c.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 15 }}>&times;</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `1px solid ${C.stone}` }}>
                <td colSpan={5} style={{ padding: "12px 14px", fontWeight: 600, color: C.ink, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Estimado</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.ink, fontFamily: "'Playfair Display', serif" }}>{fmt(varTotal)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
