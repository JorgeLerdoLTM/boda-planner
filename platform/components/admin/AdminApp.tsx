"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, TOUCH } from "@/lib/theme";
import { logoutAction } from "@/app/admin/actions";
import { useResponsive, useCurrency } from "../hooks";
import { useAdminStore, type AdminInitial } from "./store";
import { VineBackground } from "./VineBackground";
import { Dashboard } from "./Dashboard";
import { FixedCosts } from "./FixedCosts";
import { VariableCosts } from "./VariableCosts";
import { GuestList } from "./GuestList";
import { Forecast } from "./Forecast";
import { NotificationsBell } from "./NotificationsBell";
import { Mesas } from "./mesas/Mesas";
import { useSeatingStore } from "./seating-store";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "fixed", label: "Fijos" },
  { id: "variable", label: "Variables" },
  { id: "guests", label: "Invitados" },
  { id: "forecast", label: "Pronostico" },
  { id: "mesas", label: "Mesas" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AdminApp({ initial, role }: { initial: AdminInitial; role: string }) {
  // Planner only manages guests — budget tabs (Dashboard/Fijos/Variables/
  // Pronostico) are couple-only. Enlaces + Seguimiento stay available to both.
  const isCouple = role === "couple";
  const visibleTabs = isCouple ? tabs : tabs.filter((t) => t.id === "guests");
  const [activeTab, setActiveTab] = useState<TabId>(isCouple ? "dashboard" : "guests");
  const store = useAdminStore(initial);
  const seating = useSeatingStore(initial.seating, store.guests);
  const cx = useCurrency();
  const { isMobile } = useResponsive();

  // "Guardado ✓" chip: visible from each successful persist until 1.8s later.
  const [savedHiddenAt, setSavedHiddenAt] = useState(0);
  const lastSaved = Math.max(store.savedAt, seating.savedAt);
  useEffect(() => {
    if (!lastSaved) return;
    const t = setTimeout(() => setSavedHiddenAt(Date.now()), 1800);
    return () => clearTimeout(t);
  }, [lastSaved]);
  const showSaved = lastSaved > 0 && savedHiddenAt < lastSaved;
  const saveError = store.saveError ?? seating.saveError;
  const dismissSaveError = () => { store.dismissSaveError(); seating.dismissSaveError(); };

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'Inter', sans-serif", color: C.ink, position: "relative" }}>
      <VineBackground />

      {/* Save-failure banner: edits are optimistic; if the server rejects one
          (typically a tab left open across a deploy), say it LOUDLY. */}
      {saveError && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "#C0392B", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontSize: 13, flexWrap: "wrap", textAlign: "center" }}>
          <span>⚠️ {saveError}</span>
          <button onClick={() => window.location.reload()} style={{ background: "#fff", color: "#C0392B", border: "none", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Recargar ahora</button>
          <button onClick={dismissSaveError} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.6)", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Saved confirmation chip */}
      {showSaved && !saveError && (
        <div style={{ position: "fixed", bottom: 18, right: 18, zIndex: 200, background: C.greenDk, color: C.white, padding: "8px 16px", fontSize: 12, fontWeight: 500, boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}>
          Guardado ✓
        </div>
      )}

      <div style={{ padding: isMobile ? `12px ${TOUCH.mobilePad}px` : "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.stone}`, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 16 : 18, fontWeight: 600, color: C.greenDk }}>{store.coupleNames}</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>Octubre 2026 · {role === "couple" ? "Novios" : "Planner"}</div>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 0 }}>
            {visibleTabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding: "8px 18px", border: "none", background: activeTab === t.id ? C.greenDk : "transparent", color: activeTab === t.id ? C.white : C.muted, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, cursor: "pointer", letterSpacing: "0.02em" }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Invitados</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 18 : 20, fontWeight: 600, color: C.greenDk }}>{store.invitees}</div>
          </div>
          <NotificationsBell />
          {!isMobile && (
            <>
              <Link href="/admin/links" style={{ fontSize: 11, color: C.muted, textDecoration: "none", border: `1px solid ${C.stone}`, padding: "6px 12px" }}>Enlaces</Link>
              <Link href="/admin/tracking" style={{ fontSize: 11, color: C.muted, textDecoration: "none", border: `1px solid ${C.stone}`, padding: "6px 12px" }}>Seguimiento</Link>
            </>
          )}
          <form action={logoutAction}>
            <button type="submit" title="Salir" style={{ background: "transparent", border: `1px solid ${C.stone}`, color: C.muted, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Salir</button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: activeTab === "mesas" ? 1600 : 1200, margin: "0 auto", padding: isMobile ? `20px ${TOUCH.mobilePad}px 100px` : "32px 32px 80px", position: "relative", zIndex: 1 }}>
        {activeTab === "dashboard" && isCouple && <Dashboard store={store} cx={cx} />}
        {activeTab === "fixed" && isCouple && <FixedCosts store={store} />}
        {activeTab === "variable" && isCouple && <VariableCosts store={store} />}
        {activeTab === "guests" && <GuestList store={store} />}
        {activeTab === "forecast" && isCouple && <Forecast store={store} cx={cx} />}
        {activeTab === "mesas" && isCouple && <Mesas store={store} seating={seating} />}
      </div>

      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${C.stone}`, zIndex: 100 }}>
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: "8px 0", minHeight: 52, border: "none", background: activeTab === t.id ? C.greenDk : "transparent", color: activeTab === t.id ? C.white : C.muted, fontSize: 10, fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
