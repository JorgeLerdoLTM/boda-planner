import { C, TOUCH } from "../../utils/theme";
import { useResponsive } from "../../hooks/useMediaQuery";

export function InlineSelect({ value, options, onChange, colors }) {
  const col = colors?.[value] || {};
  const { isMobile } = useResponsive();

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        background: col.bg || "#F5F5F5",
        color: col.color || C.ink,
        border: "none",
        padding: isMobile ? "10px 10px" : "3px 8px",
        fontSize: isMobile ? 14 : 11,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        minHeight: isMobile ? TOUCH.minTarget : "auto",
      }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
