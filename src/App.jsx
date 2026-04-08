import { useState } from "react";
import { C, TOUCH } from "./utils/theme";
import { fmtShort } from "./utils/calculations";
import { useResponsive } from "./hooks/useMediaQuery";
import { useWeddingStore } from "./hooks/useWeddingStore";
import { VineBackground } from "./components/VineBackground";
import { Dashboard } from "./components/Dashboard";
import { FixedCosts } from "./components/FixedCosts";
import { VariableCosts } from "./components/VariableCosts";
import { GuestList } from "./components/GuestList";
import { Forecast } from "./components/Forecast";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "fixed", label: "Fijos" },
  { id: "variable", label: "Variables" },
  { id: "guests", label: "Invitados" },
  { id: "forecast", label: "Pronostico" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const store = useWeddingStore();
  const { isMobile } = useResponsive();

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Inter', sans-serif", color: C.ink, position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <VineBackground />

      {/* Header */}
      <div style={{
        padding: isMobile ? `12px ${TOUCH.mobilePad}px` : "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${C.stone}`,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 16 : 18, fontWeight: 600, color: C.greenDk }}>Lorel & Coke</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>Octubre 2026</div>
        </div>

        {/* Desktop tabs */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  background: activeTab === t.id ? C.greenDk : "transparent",
                  color: activeTab === t.id ? C.white : C.muted,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Total</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 18 : 20, fontWeight: 600, color: C.greenDk }}>{fmtShort(store.grandTotal)}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? `20px ${TOUCH.mobilePad}px 100px` : "32px 32px 80px", position: "relative", zIndex: 1 }}>
        {activeTab === "dashboard" && <Dashboard store={store} />}
        {activeTab === "fixed" && <FixedCosts store={store} />}
        {activeTab === "variable" && <VariableCosts store={store} />}
        {activeTab === "guests" && <GuestList store={store} />}
        {activeTab === "forecast" && <Forecast store={store} />}
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: `1px solid ${C.stone}`,
          zIndex: 100,
        }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: "8px 0",
                minHeight: 52,
                border: "none",
                background: activeTab === t.id ? C.greenDk : "transparent",
                color: activeTab === t.id ? C.white : C.muted,
                fontSize: 10,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
