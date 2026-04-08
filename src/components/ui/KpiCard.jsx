import { C } from "../../utils/theme";

export function KpiCard({ label, value, sub, highlight }) {
  return (
    <div
      style={{
        background: highlight ? C.ink : C.white,
        border: highlight ? "none" : `1px solid ${C.stone}`,
        padding: "20px 24px",
        flex: 1,
        minWidth: 130,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: highlight ? C.muted : C.muted,
          marginBottom: 8,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: highlight ? 28 : 22,
          fontWeight: 600,
          color: highlight ? C.white : C.ink,
          fontFamily: "'Playfair Display', serif",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: highlight ? "#666" : C.muted, marginTop: 6, fontFamily: "'Inter', sans-serif" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
