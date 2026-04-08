import { C, glassCard, STATUS_COLORS } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";

export function FixedCosts({ store }) {
  const { fixedCosts, fixedTotal, paidTotal, updateFixed, deleteFixed, addFixed } = store;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: C.ink }}>Costos Fijos</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {fmt(fixedTotal)} total &middot; {fmt(paidTotal)} pagado &middot; {fmt(fixedTotal - paidTotal)} pendiente
          </div>
        </div>
        <button onClick={addFixed}
          style={{ background: C.ink, color: C.white, border: "none", padding: "9px 20px", fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: "pointer", letterSpacing: "0.02em" }}>
          + Agregar
        </button>
      </div>

      <div style={{ ...glassCard, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              {["Categoria", "Proveedor", "Monto", "Pagado", "Balance", "Fecha", "Estado", "Notas", ""].map((h) => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.stone}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixedCosts.map((c) => {
              const bal = (Number(c.amount) || 0) - (Number(c.paid) || 0);
              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.cream}` }}>
                  <td style={{ padding: "10px 14px" }}><EditableCell value={c.category} onChange={(v) => updateFixed(c.id, "category", v)} placeholder="Categoria" /></td>
                  <td style={{ padding: "10px 14px" }}><EditableCell value={c.name} onChange={(v) => updateFixed(c.id, "name", v)} placeholder="Nombre" /></td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}><EditableCell value={c.amount} onChange={(v) => updateFixed(c.id, "amount", Number(v))} type="number" displayFormat={fmt} /></td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}><EditableCell value={c.paid} onChange={(v) => updateFixed(c.id, "paid", Number(v))} type="number" displayFormat={fmt} /></td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 12, color: bal > 0 ? C.danger : C.success }}>{fmt(bal)}</td>
                  <td style={{ padding: "10px 14px" }}><EditableCell value={c.due} onChange={(v) => updateFixed(c.id, "due", v)} placeholder="YYYY-MM-DD" /></td>
                  <td style={{ padding: "10px 14px" }}><InlineSelect value={c.status} options={Object.keys(STATUS_COLORS)} onChange={(v) => updateFixed(c.id, "status", v)} colors={STATUS_COLORS} /></td>
                  <td style={{ padding: "10px 14px", maxWidth: 160 }}><EditableCell value={c.notes} onChange={(v) => updateFixed(c.id, "notes", v)} placeholder="Notas" /></td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>
                    <button onClick={() => deleteFixed(c.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 15 }}>&times;</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `1px solid ${C.stone}` }}>
              <td colSpan={2} style={{ padding: "12px 14px", fontWeight: 600, color: C.ink, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.ink, fontFamily: "'Playfair Display', serif" }}>{fmt(fixedTotal)}</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.success }}>{fmt(paidTotal)}</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.danger }}>{fmt(fixedTotal - paidTotal)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
