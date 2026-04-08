import { C } from "../utils/theme";
import { fmt } from "../utils/calculations";
import { KpiCard } from "./ui/KpiCard";
import { SliderInput } from "./ui/SliderInput";

export function Forecast({ store }) {
  const {
    invitees, setInvitees, cancelRate, setCancelRate,
    contingency, setContingency, attendees,
    grandTotal, perAttendee, fixedTotal, varTotal, varCosts, fixedCosts,
  } = store;

  const scenarios = [
    { label: "Intimo", pct: 0.7 },
    { label: "Actual", pct: 1 },
    { label: "Ampliado", pct: 1.3 },
  ];

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 24 }}>
        Pronostico de Costos
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 28 }}>
          <SliderInput label="Total invitados" value={invitees} min={100} max={600} step={5} onChange={setInvitees} accent={C.blue} />
          <SliderInput label="Cancelaciones" value={cancelRate} min={0} max={40} onChange={setCancelRate} format={(v) => `${v}%`} accent={C.yellow} />
          <SliderInput label="Contingencia" value={contingency} min={0} max={30} onChange={setContingency} format={(v) => `${v}%`} accent={C.success} />
          <div style={{ background: C.blueXlt, borderRadius: 10, padding: "12px 18px", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Asistentes esperados</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: C.blue }}>{attendees}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <KpiCard label="Costo Total" value={fmt(grandTotal)} sub={`con ${contingency}% contingencia`} highlight />
          <div style={{ display: "flex", gap: 12 }}>
            <KpiCard label="Por asistente" value={fmt(perAttendee)} />
            <KpiCard label="Por invitado" value={fmt(grandTotal / invitees)} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <KpiCard label="Costos fijos" value={fmt(fixedTotal)} sub={`${Math.round((fixedTotal / grandTotal) * 100)}%`} />
            <KpiCard label="Costos variables" value={fmt(varTotal)} sub={`${Math.round((varTotal / grandTotal) * 100)}%`} />
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
          Escenarios
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {scenarios.map(({ label, pct }) => {
            const inv = Math.round(invitees * pct);
            const att = Math.round(inv * (1 - cancelRate / 100));
            const vt = varCosts.reduce((s, c) => s + (Number(c.unit_cost) || 0) * (c.applies_to === "attendees" ? att : inv), 0);
            const tot = (fixedTotal + vt) * (1 + contingency / 100);
            const isCurrent = pct === 1;
            return (
              <div key={label} style={{ background: isCurrent ? C.blue : C.cream, borderRadius: 12, padding: "18px 20px", border: `1px solid ${isCurrent ? C.blue : C.stone}` }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: isCurrent ? C.yellow : C.muted, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 11, color: isCurrent ? C.blueXlt : C.muted, marginBottom: 4 }}>
                  {inv} invitados &middot; {att} asistentes
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: isCurrent ? C.yellow : C.ink }}>{fmt(tot)}</div>
                <div style={{ fontSize: 11, color: isCurrent ? C.blueXlt : C.muted, marginTop: 2 }}>{fmt(att > 0 ? tot / att : 0)}/persona</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
