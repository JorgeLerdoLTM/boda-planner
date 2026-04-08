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
  { id: "variable", label: "Variables" },
  { id: "guests", label: "Invitados" },
  { id: "forecast", label: "Pronostico" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const store = useWeddingStore();

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Inter', sans-serif", color: C.ink }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.stone}`, background: C.white }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: C.ink }}>Lorel & Coke</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>Octubre 2026</div>
        </div>

        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 18px",
                border: "none",
                background: activeTab === t.id ? C.ink : "transparent",
                color: activeTab === t.id ? C.white : C.muted,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                letterSpacing: "0.02em",
                transition: "all 0.15s ease",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Total</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.ink }}>{fmtShort(store.grandTotal)}</div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 80px" }}>
        {activeTab === "dashboard" && <Dashboard store={store} />}
        {activeTab === "fixed" && <FixedCosts store={store} />}
        {activeTab === "variable" && <VariableCosts store={store} />}
        {activeTab === "guests" && <GuestList store={store} />}
        {activeTab === "forecast" && <Forecast store={store} />}
      </div>
    </div>
  );
}
