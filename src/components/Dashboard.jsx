import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { C, CAT_COLORS } from "../utils/theme";
import { fmt, fmtShort } from "../utils/calculations";
import { KpiCard } from "./ui/KpiCard";
import { Pill } from "./ui/Pill";
import { SliderInput } from "./ui/SliderInput";

export function Dashboard({ store }) {
  const {
    grandTotal, paidTotal, balance, perAttendee, attendees,
    contingency, setContingency, invitees, setInvitees,
    cancelRate, setCancelRate, fixedTotal, varTotal,
    catBreakdown, guests, confirmed, pending, declined, plusOnes, upcoming,
  } = store;

  return (
    <div>
      {/* Hero KPIs */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <KpiCard label="Total Estimado" value={fmt(grandTotal)} sub={`incl. ${contingency}% contingencia`} highlight />
        <KpiCard label="Pagado" value={fmt(paidTotal)} sub={`${Math.round((paidTotal / grandTotal) * 100)}% del total`} />
        <KpiCard label="Balance Pendiente" value={fmt(balance)} sub="por pagar" />
        <KpiCard label="Por Asistente" value={fmt(perAttendee)} sub={`${attendees} esperados`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Sliders */}
        <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 18 }}>
            Parametros
          </div>
          <SliderInput label="Total invitados" value={invitees} min={100} max={600} step={5} onChange={setInvitees} accent={C.blue} />
          <SliderInput label="Tasa de cancelacion" value={cancelRate} min={0} max={40} onChange={setCancelRate} format={(v) => `${v}%`} accent={C.yellow} />
          <SliderInput label="Contingencia" value={contingency} min={0} max={30} onChange={setContingency} format={(v) => `${v}%`} accent={C.success} />
          <div style={{ background: C.blueXlt, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Asistentes esperados</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.blue }}>{attendees}</span>
          </div>
        </div>

        {/* Fixed vs Variable donut */}
        <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
            Fijo vs Variable
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Pill label={`Fijo ${fmt(fixedTotal)}`} bg={C.blueXlt} color={C.blue} dot={C.blue} />
            <Pill label={`Variable ${fmt(varTotal)}`} bg={C.yellowLt} color="#8B6914" dot={C.yellow} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={[{ name: "Fijo", value: fixedTotal }, { name: "Variable", value: varTotal }]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                <Cell fill={C.blue} />
                <Cell fill={C.yellow} />
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
          Desglose por Categoria
        </div>
        <ResponsiveContainer width="100%" height={Math.max(220, catBreakdown.length * 28)}>
          <BarChart data={catBreakdown} layout="vertical" margin={{ left: 20, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.stone} />
            <XAxis type="number" tickFormatter={(v) => fmtShort(v)} style={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={130} style={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {catBreakdown.map((_, i) => (
                <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* RSVP summary */}
        <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
            Estado Invitados
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { val: guests.length, label: "Total invitados", bg: C.blueXlt, color: C.blue },
              { val: confirmed, label: "Confirmados", bg: "#D8F0E0", color: C.success },
              { val: pending, label: "Pendientes", bg: "#F0EFEF", color: C.muted },
              { val: declined, label: "Declinados", bg: "#FDECEA", color: C.danger },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Pill label={`${plusOnes} con +1`} bg={C.yellowLt} color="#8B6914" dot={C.yellow} />
          </div>
        </div>

        {/* Upcoming payments */}
        <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
            Proximos Pagos
          </div>
          {upcoming.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>Sin fechas proximas.</div>}
          {upcoming.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.stone}` }}>
              <div style={{ background: C.blueXlt, borderRadius: 8, padding: "6px 10px", fontSize: 10, color: C.blue, fontWeight: 600, minWidth: 72, textAlign: "center" }}>
                {c.due}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{c.name || c.category}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{c.category}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{fmt(Number(c.amount) - Number(c.paid || 0))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
