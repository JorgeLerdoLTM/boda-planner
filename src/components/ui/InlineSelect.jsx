import { C } from "../../utils/theme";

export function InlineSelect({ value, options, onChange, colors }) {
  const col = colors?.[value] || {};

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        background: col.bg || "#F5F5F5",
        color: col.color || C.ink,
        border: "none",
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
      }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
