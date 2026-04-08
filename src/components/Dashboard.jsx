import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { C, glassCard, CAT_COLORS } from "../utils/theme";
import { fmt, fmtShort } from "../utils/calculations";
import { useResponsive } from "../hooks/useMediaQuery";
import { KpiCard } from "./ui/KpiCard";
import { Pill } from "./ui/Pill";
import { SliderInput } from "./ui/SliderInput";

export function Dashboard({ store }) {
  const {
    grandTotal, paidTotal, balance, perAttendee, attendees,
    contingency, setContingency, invitees,
    cancelRate, setCancelRate, fixedTotal, varTotal,
    catBreakdown, guests, confirmed, pending, declined, upcoming,
  } = store;
  const { isMobile } = useResponsive();

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 1, marginBottom: isMobile ? 20 : 32 }}>
        <KpiCard label="Total Estimado" value={fmt(grandTotal)} sub={`incl. ${contingency}% cont.`} highlight />
        <KpiCard label="Pagado" value={fmt(paidTotal)} sub={`${Math.round((paidTotal / grandTotal) * 100)}%`} />
        <KpiCard label="Balance" value={fmt(balance)} sub="pendiente" />
        <KpiCard label="Por Asistente" value={fmt(perAttendee)} sub={`${attendees} esp.`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 1, marginBottom: 1 }}>
        {/* Sliders */}
        <div style={{ ...glassCard, padding: isMobile ? 20 : 28 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 24 }}>Parametros</div>
          {/* Invitees — derived from guest list */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "10px 0", borderBottom: `1px solid ${C.stone}` }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total invitados</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: C.green }}>{invitees}</span>
          </div>
          <SliderInput label="Tasa de cancelacion" value={cancelRate} min={0} max={40} onChange={setCancelRate} format={(v) => `${v}%`} accent={C.green} />
          <SliderInput label="Contingencia" value={contingency} min={0} max={30} onChange={setContingency} format={(v) => `${v}%`} accent={C.green} />
          <div style={{ borderTop: `1px solid ${C.stone}`, paddingTop: 16, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Asistentes esperados</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 26 : 32, fontWeight: 600, color: C.ink }}>{attendees}</span>
          </div>
        </div>

        {/* Donut */}
        <div style={{ ...glassCard, padding: isMobile ? 20 : 28 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 16 }}>Fijo vs Variable</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <Pill label={`Fijo ${fmt(fixedTotal)}`} bg={C.blueLt} color={C.blue} />
            <Pill label={`Variable ${fmt(varTotal)}`} bg={C.yellowLt} color="#8B6914" />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={[{ name: "Fijo", value: fixedTotal }, { name: "Variable", value: varTotal }]} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
                <Cell fill={C.greenDk} />
                <Cell fill={C.stone} />
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ border: `1px solid ${C.stone}`, borderRadius: 0, fontSize: 12, fontFamily: "'Inter', sans-serif" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ ...glassCard, padding: isMobile ? 20 : 28, marginBottom: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 20 }}>Desglose por Categoria</div>
        <ResponsiveContainer width="100%" height={Math.max(200, catBreakdown.length * (isMobile ? 32 : 28))}>
          <BarChart data={catBreakdown} layout="vertical" margin={{ left: 10, right: isMobile ? 20 : 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.stone} horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => fmtShort(v)} style={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={isMobile ? 80 : 120} style={{ fontSize: isMobile ? 10 : 11 }} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ border: `1px solid ${C.stone}`, borderRadius: 0, fontSize: 12 }} />
            <Bar dataKey="value" radius={0}>
              {catBreakdown.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 1 }}>
        {/* RSVP */}
        <div style={{ ...glassCard, padding: isMobile ? 20 : 28 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 20 }}>Invitados</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 16 }}>
            {[
              { val: invitees, label: "Total", color: C.ink },
              { val: confirmed, label: "Confirmados", color: C.success },
              { val: pending, label: "Pendientes", color: C.muted },
              { val: declined, label: "Declinados", color: C.danger },
            ].map((s) => (
              <div key={s.label} style={{ background: C.cream, padding: "14px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 22 : 28, fontWeight: 600, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ ...glassCard, padding: isMobile ? 20 : 28 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 20 }}>Proximos Pagos</div>
          {upcoming.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>Sin fechas proximas.</div>}
          {upcoming.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < upcoming.length - 1 ? `1px solid ${C.stone}` : "none" }}>
              <div style={{ background: C.cream, padding: "4px 10px", fontSize: 10, color: C.muted, fontWeight: 500, minWidth: 72, textAlign: "center" }}>{c.due}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{c.name || c.category}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{c.category}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: "'Playfair Display', serif" }}>{fmt(Number(c.amount) - Number(c.paid || 0))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
