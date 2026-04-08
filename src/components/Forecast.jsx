import { C, glassCard } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { KpiCard } from "./ui/KpiCard";
import { SliderInput } from "./ui/SliderInput";

export function Forecast({ store }) {
  const { invitees, setInvitees, cancelRate, setCancelRate, contingency, setContingency, attendees, grandTotal, perAttendee, fixedTotal, varTotal, varCosts } = store;

  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 28 }}>Pronostico</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 1 }}>
        <div style={{ ...glassCard, padding: 28 }}>
          <SliderInput label="Total invitados" value={invitees} min={100} max={600} step={5} onChange={setInvitees} accent={C.ink} />
          <SliderInput label="Cancelaciones" value={cancelRate} min={0} max={40} onChange={setCancelRate} format={(v) => `${v}%`} accent={C.ink} />
          <SliderInput label="Contingencia" value={contingency} min={0} max={30} onChange={setContingency} format={(v) => `${v}%`} accent={C.ink} />
          <div style={{ borderTop: `1px solid ${C.stone}`, paddingTop: 16, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Asistentes</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 600, color: C.ink }}>{attendees}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <KpiCard label="Costo Total" value={fmt(grandTotal)} sub={`con ${contingency}% contingencia`} highlight />
          <div style={{ display: "flex", gap: 1 }}>
            <KpiCard label="Por asistente" value={fmt(perAttendee)} />
            <KpiCard label="Por invitado" value={fmt(grandTotal / invitees)} />
          </div>
          <div style={{ display: "flex", gap: 1 }}>
            <KpiCard label="Fijos" value={fmt(fixedTotal)} sub={`${Math.round((fixedTotal / grandTotal) * 100)}%`} />
            <KpiCard label="Variables" value={fmt(varTotal)} sub={`${Math.round((varTotal / grandTotal) * 100)}%`} />
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div style={{ ...glassCard, padding: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 20 }}>Escenarios</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          {[{ label: "Intimo", pct: 0.7 }, { label: "Actual", pct: 1 }, { label: "Ampliado", pct: 1.3 }].map(({ label, pct }) => {
            const inv = Math.round(invitees * pct);
            const att = Math.round(inv * (1 - cancelRate / 100));
            const vt = varCosts.reduce((s, c) => s + (Number(c.unit_cost) || 0) * (c.applies_to === "attendees" ? att : inv), 0);
            const tot = (fixedTotal + vt) * (1 + contingency / 100);
            const isCurrent = pct === 1;
            return (
              <div key={label} style={{ background: isCurrent ? C.ink : C.cream, padding: "22px 24px", border: isCurrent ? "none" : `1px solid ${C.stone}` }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: isCurrent ? "#666" : C.muted, marginBottom: 8, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: isCurrent ? "#666" : C.muted, marginBottom: 6 }}>{inv} inv. &middot; {att} asist.</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, color: isCurrent ? C.white : C.ink }}>{fmt(tot)}</div>
                <div style={{ fontSize: 11, color: isCurrent ? "#555" : C.muted, marginTop: 4 }}>{fmt(att > 0 ? tot / att : 0)}/persona</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
