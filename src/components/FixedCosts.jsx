import { C, STATUS_COLORS } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";

export function FixedCosts({ store }) {
  const { fixedCosts, fixedTotal, paidTotal, updateFixed, deleteFixed, addFixed } = store;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: C.ink }}>Costos Fijos</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Total: {fmt(fixedTotal)} &middot; Pagado: {fmt(paidTotal)} &middot; Balance: {fmt(fixedTotal - paidTotal)}
          </div>
        </div>
        <button
          onClick={addFixed}
          style={{ background: C.blue, color: C.white, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Agregar
        </button>
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: C.blue }}>
              {["Categoria", "Proveedor / Concepto", "Monto", "Pagado", "Balance", "Fecha Pago", "Estado", "Notas", ""].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.blueXlt, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixedCosts.map((c, i) => {
              const bal = (Number(c.amount) || 0) - (Number(c.paid) || 0);
              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.stone}`, background: i % 2 === 0 ? C.white : C.cream }}>
                  <td style={{ padding: "9px 12px" }}>
                    <EditableCell value={c.category} onChange={(v) => updateFixed(c.id, "category", v)} placeholder="Categoria" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <EditableCell value={c.name} onChange={(v) => updateFixed(c.id, "name", v)} placeholder="Nombre" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                    <EditableCell value={c.amount} onChange={(v) => updateFixed(c.id, "amount", Number(v))} type="number" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                    <EditableCell value={c.paid} onChange={(v) => updateFixed(c.id, "paid", Number(v))} type="number" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: bal > 0 ? C.danger : C.success }}>
                    {fmt(bal)}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <EditableCell value={c.due} onChange={(v) => updateFixed(c.id, "due", v)} placeholder="YYYY-MM-DD" />
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <InlineSelect value={c.status} options={Object.keys(STATUS_COLORS)} onChange={(v) => updateFixed(c.id, "status", v)} colors={STATUS_COLORS} />
                  </td>
                  <td style={{ padding: "9px 12px", maxWidth: 180 }}>
                    <EditableCell value={c.notes} onChange={(v) => updateFixed(c.id, "notes", v)} placeholder="Notas" />
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "center" }}>
                    <button onClick={() => deleteFixed(c.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 15, padding: "0 4px" }} title="Eliminar">
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: C.blueXlt, borderTop: `2px solid ${C.blue}` }}>
              <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700, color: C.blue, fontSize: 12 }}>TOTAL</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: C.blue }}>{fmt(fixedTotal)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: C.success }}>{fmt(paidTotal)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: C.danger }}>{fmt(fixedTotal - paidTotal)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
