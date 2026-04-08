export function Pill({ label, bg, color, dot, onClick, style }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {dot && <span style={{ width: 5, height: 5, background: dot, flexShrink: 0 }} />}
      {label}
    </span>
  );
}
