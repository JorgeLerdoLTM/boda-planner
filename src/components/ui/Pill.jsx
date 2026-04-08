export function Pill({ label, bg, color, dot, onClick, style }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dot,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}
