import { C } from "../../utils/theme";

export function InlineSelect({ value, options, onChange, colors }) {
  const col = colors?.[value] || {};

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: col.bg || "#f5f5f5",
        color: col.color || C.ink,
        border: "none",
        borderRadius: 12,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
