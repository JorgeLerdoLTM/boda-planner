import { C } from "../../utils/theme";

export function SliderInput({ label, value, min, max, step = 1, onChange, format, accent = C.ink }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: accent }}>
          {format ? format(value) : value}
        </span>
      </div>
      <div style={{ position: "relative", height: 2, background: C.stone }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: accent, transition: "width 0.15s ease" }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: "absolute", top: -10, left: 0, width: "100%", opacity: 0, cursor: "pointer", height: 22 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: C.muted }}>{format ? format(min) : min}</span>
        <span style={{ fontSize: 10, color: C.muted }}>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}
