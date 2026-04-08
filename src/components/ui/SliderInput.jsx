import { useEffect } from "react";
import { C } from "../../utils/theme";

const STYLE_ID = "boda-slider-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .boda-slider { -webkit-appearance: none; appearance: none; width: 100%; background: transparent; cursor: pointer; height: 44px; margin: 0; padding: 0; }
    .boda-slider:focus { outline: none; }
    .boda-slider::-webkit-slider-runnable-track { height: 2px; border: none; }
    .boda-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 18px; width: 18px; margin-top: -8px; border: 2px solid #fff; box-shadow: 0 0 0 1px currentColor; }
    .boda-slider::-moz-range-track { height: 2px; border: none; }
    .boda-slider::-moz-range-thumb { height: 18px; width: 18px; border: 2px solid #fff; box-shadow: 0 0 0 1px currentColor; border-radius: 0; }
  `;
  document.head.appendChild(style);
}

export function SliderInput({ label, value, min, max, step = 1, onChange, format, accent = C.ink }) {
  useEffect(() => { injectStyles(); }, []);

  const pct = ((value - min) / (max - min)) * 100;
  const trackBg = `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, ${C.stone} ${pct}%, ${C.stone} 100%)`;

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
      <input
        type="range"
        className="boda-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          color: accent,
          background: trackBg,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: C.muted }}>{format ? format(min) : min}</span>
        <span style={{ fontSize: 10, color: C.muted }}>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}
