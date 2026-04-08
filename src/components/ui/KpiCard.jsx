import { C } from "../../utils/theme";

export function KpiCard({ label, value, sub, highlight }) {
  return (
    <div
      style={{
        background: highlight ? C.blue : C.white,
        border: `1px solid ${highlight ? C.blue : C.stone}`,
        borderRadius: 14,
        padding: "18px 22px",
        flex: 1,
        minWidth: 130,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: highlight ? C.blueXlt : C.muted,
          marginBottom: 6,
          fontFamily: "'Cormorant Garamond', serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: highlight ? 28 : 22,
          fontWeight: 700,
          color: highlight ? C.yellow : C.ink,
          fontFamily: "'Cormorant Garamond', serif",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: highlight ? C.blueXlt : C.muted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
