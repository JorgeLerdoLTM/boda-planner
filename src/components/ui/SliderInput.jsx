import { C } from "../../utils/theme";

export function SliderInput({ label, value, min, max, step = 1, onChange, format, accent = C.blue }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 600,
            color: accent,
          }}
        >
          {format ? format(value) : value}
        </span>
      </div>
      <div style={{ position: "relative", height: 5, background: C.stone, borderRadius: 3 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: accent,
            borderRadius: 3,
            transition: "width 0.1s",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            top: -8,
            left: 0,
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            height: 22,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: C.muted }}>{format ? format(min) : min}</span>
        <span style={{ fontSize: 10, color: C.muted }}>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}
