import { useState } from "react";
import { C } from "./utils/theme";
import { fmtShort } from "./utils/calculations";
import { useWeddingStore } from "./hooks/useWeddingStore";
import { Dashboard } from "./components/Dashboard";
import { FixedCosts } from "./components/FixedCosts";
import { VariableCosts } from "./components/VariableCosts";
import { GuestList } from "./components/GuestList";
import { Forecast } from "./components/Forecast";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "fixed", label: "Costos Fijos" },
  { id: "variable", label: "Costos Variables" },
  { id: "guests", label: "Invitados" },
  { id: "forecast", label: "Pronostico" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const store = useWeddingStore();

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'DM Sans', sans-serif", color: C.ink }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={{ background: C.blue, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: C.yellow, letterSpacing: "0.03em" }}>
            Lorel & Coke
          </div>
          <div style={{ fontSize: 11, color: C.blueXlt, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>
            Wedding Budget &middot; Septiembre 2026
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.blueXlt }}>Presupuesto total</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: C.yellow }}>
            {fmtShort(store.grandTotal)}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.stone}`, display: "flex", gap: 0, padding: "0 32px", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "14px 20px",
              border: "none",
              background: "transparent",
              color: activeTab === t.id ? C.blue : C.muted,
              borderBottom: activeTab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 60px" }}>
        {activeTab === "dashboard" && <Dashboard store={store} />}
        {activeTab === "fixed" && <FixedCosts store={store} />}
        {activeTab === "variable" && <VariableCosts store={store} />}
        {activeTab === "guests" && <GuestList store={store} />}
        {activeTab === "forecast" && <Forecast store={store} />}
      </div>
    </div>
  );
}
