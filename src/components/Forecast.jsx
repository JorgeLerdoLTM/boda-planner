import { useState } from "react";
import { C, glassCard } from "../utils/theme";
import { fmt, getExpectedAttendees, getVariableTotal, getGrandTotal, getCostPerAttendee } from "../utils/calculations";
import { useResponsive } from "../hooks/useMediaQuery";
import { KpiCard } from "./ui/KpiCard";
import { SliderInput } from "./ui/SliderInput";

export function Forecast({ store }) {
  const { invitees: realInvitees, cancelRate, contingency, fixedTotal, varCosts, grandTotal: realGrandTotal, attendees: realAttendees } = store;
  const { isMobile } = useResponsive();

  // Local what-if slider — defaults to actual guest list count
  const [whatIfInvitees, setWhatIfInvitees] = useState(realInvitees);
  const [whatIfCancel, setWhatIfCancel] = useState(cancelRate);
  const [whatIfContingency, setWhatIfContingency] = useState(contingency);

  // What-if calculations
  const wAttendees = getExpectedAttendees(whatIfInvitees, whatIfCancel);
  const wVarTotal = getVariableTotal(varCosts, wAttendees, whatIfInvitees);
  const wGrandTotal = getGrandTotal(fixedTotal, wVarTotal, whatIfContingency);
  const wPerAttendee = getCostPerAttendee(wGrandTotal, wAttendees);
  const diff = wGrandTotal - realGrandTotal;
  const isChanged = whatIfInvitees !== realInvitees || whatIfCancel !== cancelRate || whatIfContingency !== contingency;

  const reset = () => { setWhatIfInvitees(realInvitees); setWhatIfCancel(cancelRate); setWhatIfContingency(contingency); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 22 : 26, fontWeight: 600, color: C.ink }}>Pronostico</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Estado actual: {realInvitees} invitados &middot; {realAttendees} asistentes &middot; {fmt(realGrandTotal)}
          </div>
        </div>
        {isChanged && (
          <button onClick={reset} style={{ background: "transparent", border: `1px solid ${C.stone}`, color: C.muted, padding: "7px 14px", fontSize: 11, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
            Resetear
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 1, marginBottom: 1 }}>
        {/* What-if sliders */}
        <div style={{ ...glassCard, padding: isMobile ? 20 : 28 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 20 }}>Que pasa si...</div>
          <SliderInput label="Invitados" value={whatIfInvitees} min={50} max={Math.max(800, realInvitees + 200)} step={5} onChange={setWhatIfInvitees} accent={C.blue} />
          <SliderInput label="Cancelaciones" value={whatIfCancel} min={0} max={40} onChange={setWhatIfCancel} format={(v) => `${v}%`} accent={C.green} />
          <SliderInput label="Contingencia" value={whatIfContingency} min={0} max={30} onChange={setWhatIfContingency} format={(v) => `${v}%`} accent={C.yellow} />
          <div style={{ borderTop: `1px solid ${C.stone}`, paddingTop: 16, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Asistentes</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 28 : 34, fontWeight: 600, color: C.ink }}>{wAttendees}</span>
          </div>
        </div>

        {/* What-if KPIs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <KpiCard label="Costo Total" value={fmt(wGrandTotal)} sub={`con ${whatIfContingency}% contingencia`} highlight />
          {isChanged && (
            <div style={{ background: diff < 0 ? "#EBF5EE" : "#FFF9E0", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${diff < 0 ? C.greenLt : "#F0DFA0"}` }}>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Diferencia vs actual</span>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: diff < 0 ? C.success : C.yellowDk }}>
                {diff < 0 ? "" : "+"}{fmt(diff)}
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 1 }}>
            <KpiCard label="Por asistente" value={fmt(wPerAttendee)} />
            <KpiCard label="Por invitado" value={fmt(whatIfInvitees > 0 ? wGrandTotal / whatIfInvitees : 0)} />
          </div>
          <div style={{ display: "flex", gap: 1 }}>
            <KpiCard label="Fijos" value={fmt(fixedTotal)} sub={`${Math.round((fixedTotal / wGrandTotal) * 100)}%`} />
            <KpiCard label="Variables" value={fmt(wVarTotal)} sub={`${Math.round((wVarTotal / wGrandTotal) * 100)}%`} />
          </div>
        </div>
      </div>

      {/* Scenarios based on what-if value */}
      <div style={{ ...glassCard, padding: isMobile ? 20 : 28 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 20 }}>Escenarios</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 8 : 1 }}>
          {[{ label: "Intimo", pct: 0.7 }, { label: "Seleccionado", pct: 1 }, { label: "Ampliado", pct: 1.3 }].map(({ label, pct }) => {
            const inv = Math.round(whatIfInvitees * pct);
            const att = Math.round(inv * (1 - whatIfCancel / 100));
            const vt = varCosts.reduce((s, c) => s + (Number(c.unit_cost) || 0) * (c.applies_to === "attendees" ? att : inv), 0);
            const tot = (fixedTotal + vt) * (1 + whatIfContingency / 100);
            const isCurrent = pct === 1;
            return (
              <div key={label} style={{ background: isCurrent ? C.greenDk : C.cream, padding: "22px 24px", border: isCurrent ? "none" : `1px solid ${C.stone}` }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: isCurrent ? "rgba(255,255,255,0.55)" : C.muted, marginBottom: 8, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: isCurrent ? "rgba(255,255,255,0.55)" : C.muted, marginBottom: 6 }}>{inv} inv. &middot; {att} asist.</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, color: isCurrent ? C.white : C.ink }}>{fmt(tot)}</div>
                <div style={{ fontSize: 11, color: isCurrent ? "rgba(255,255,255,0.45)" : C.muted, marginTop: 4 }}>{fmt(att > 0 ? tot / att : 0)}/persona</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
