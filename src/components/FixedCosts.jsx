import { C, glassCard, STATUS_COLORS, TOUCH } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { useResponsive } from "../hooks/useMediaQuery";
import { EditableCell } from "./ui/EditableCell";
import { InlineSelect } from "./ui/InlineSelect";

const approxBg = "#FFF9E0";
const approxBorder = "#F0DFA0";
const approxBadge = { display: "inline-block", fontSize: 9, fontWeight: 600, color: "#A68420", background: "#FBF0C8", padding: "1px 6px", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 };

function FixedCard({ c, updateFixed, deleteFixed }) {
  const bal = (Number(c.amount) || 0) - (Number(c.paid) || 0);
  const isApprox = c.approx;
  return (
    <div style={{ ...glassCard, padding: 16, marginBottom: 8, background: isApprox ? approxBg : glassCard.background, borderColor: isApprox ? approxBorder : C.stone }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <EditableCell value={c.category} onChange={(v) => updateFixed(c.id, "category", v)} placeholder="Categoria" />
          {isApprox && <span style={approxBadge}>Aprox.</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => updateFixed(c.id, "approx", !c.approx)} title="Marcar como aproximado"
            style={{ background: isApprox ? "#F0DFA0" : "#F0EFED", border: "none", color: isApprox ? "#A68420" : C.muted, cursor: "pointer", fontSize: 10, fontWeight: 600, padding: "4px 8px", minHeight: TOUCH.minTarget, display: "flex", alignItems: "center" }}>
            ~
          </button>
          <InlineSelect value={c.status} options={Object.keys(STATUS_COLORS)} onChange={(v) => updateFixed(c.id, "status", v)} colors={STATUS_COLORS} />
          <button onClick={() => deleteFixed(c.id)} style={{ background: "none", border: "none", color: C.stone, cursor: "pointer", fontSize: 18, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <EditableCell value={c.name} onChange={(v) => updateFixed(c.id, "name", v)} placeholder="Proveedor" />
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Monto</div>
          <EditableCell value={c.amount} onChange={(v) => updateFixed(c.id, "amount", Number(v))} type="number" displayFormat={fmt} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Pagado</div>
          <EditableCell value={c.paid} onChange={(v) => updateFixed(c.id, "paid", Number(v))} type="number" displayFormat={fmt} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Balance</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: bal > 0 ? C.danger : C.success }}>{fmt(bal)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Fecha</div>
          <EditableCell value={c.due} onChange={(v) => updateFixed(c.id, "due", v)} placeholder="YYYY-MM-DD" />
        </div>
      </div>
      {c.notes && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Notas</div>
          <EditableCell value={c.notes} onChange={(v) => updateFixed(c.id, "notes", v)} placeholder="Notas" />
        </div>
      )}
    </div>
  );
}

export function FixedCosts({ store }) {
  const { fixedCosts, fixedTotal, paidTotal, updateFixed, deleteFixed, addFixed } = store;
  const { isMobile } = useResponsive();

  const approxTotal = fixedCosts.filter((c) => c.approx).reduce((s, c) => s + (Number(c.amount) || 0), 0);

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
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 22 : 26, fontWeight: 600, color: C.ink }}>Costos Fijos</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {fmt(fixedTotal)} total &middot; {fmt(paidTotal)} pagado &middot; {fmt(fixedTotal - paidTotal)} pendiente
          </div>
          {approxTotal > 0 && (
            <div style={{ fontSize: 11, color: "#A68420", marginTop: 2 }}>
              ~ {fmt(approxTotal)} en montos aproximados
            </div>
          )}
        </div>
        <button onClick={addFixed} style={btnStyle}>+ Agregar</button>
      </div>

      {isMobile ? (
        <div>
          {fixedCosts.map((c) => <FixedCard key={c.id} c={c} updateFixed={updateFixed} deleteFixed={deleteFixed} />)}
        </div>
      ) : (
        <div style={{ ...glassCard, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {["", "Categoria", "Proveedor", "Monto", "Pagado", "Balance", "Fecha", "Estado", "Notas", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.stone}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fixedCosts.map((c) => {
                const bal = (Number(c.amount) || 0) - (Number(c.paid) || 0);
                const isApprox = c.approx;
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.cream}`, background: isApprox ? approxBg : "transparent" }}>
                    <td style={{ padding: "10px 6px", textAlign: "center" }}>
                      <button onClick={() => updateFixed(c.id, "approx", !c.approx)} title="Marcar como aproximado"
                        style={{ background: isApprox ? "#F0DFA0" : "#F0EFED", border: "none", color: isApprox ? "#A68420" : C.muted, cursor: "pointer", fontSize: 10, fontWeight: 600, padding: "3px 6px", width: 24, height: 24 }}>
                        ~
                      </button>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <EditableCell value={c.category} onChange={(v) => updateFixed(c.id, "category", v)} placeholder="Categoria" />
                      {isApprox && <span style={approxBadge}>Aprox.</span>}
                    </td>
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
                <td />
                <td colSpan={2} style={{ padding: "12px 14px", fontWeight: 600, color: C.ink, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.ink, fontFamily: "'Playfair Display', serif" }}>{fmt(fixedTotal)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.success }}>{fmt(paidTotal)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: C.danger }}>{fmt(fixedTotal - paidTotal)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
