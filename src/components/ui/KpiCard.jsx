import { C } from "../../utils/theme";
import { useResponsive } from "../../hooks/useMediaQuery";

export function KpiCard({ label, value, sub, highlight }) {
  const { isMobile } = useResponsive();

  return (
    <div style={{
      background: highlight ? C.greenDk : "rgba(255,255,255,0.85)",
      border: highlight ? "none" : `1px solid ${C.stone}`,
      padding: isMobile ? "14px 16px" : "20px 24px",
      flex: 1,
      minWidth: isMobile ? 0 : 130,
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: highlight ? "rgba(255,255,255,0.55)" : C.muted, marginBottom: 6, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: isMobile ? (highlight ? 22 : 18) : (highlight ? 28 : 22), fontWeight: 600, color: highlight ? "#F7F5F0" : C.ink, fontFamily: "'Playfair Display', serif", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,0.45)" : C.muted, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>{sub}</div>}
    </div>
  );
}
