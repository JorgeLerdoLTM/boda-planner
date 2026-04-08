import { useState } from "react";
import { C, TOUCH } from "../../utils/theme";
import { useResponsive } from "../../hooks/useMediaQuery";

export function EditableCell({ value, onChange, type = "text", placeholder = "", displayFormat }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const { isMobile } = useResponsive();

  const commit = () => { setEditing(false); if (val !== value) onChange(val); };

  if (editing) {
    return (
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(value); setEditing(false); } }}
        type={type}
        style={{
          width: "100%",
          border: `1px solid ${C.ink}`,
          padding: isMobile ? "10px 8px" : "2px 6px",
          fontSize: isMobile ? 14 : 12,
          fontFamily: "'Inter', sans-serif",
          background: C.white,
          outline: "none",
          color: C.ink,
          minHeight: isMobile ? TOUCH.minTarget : "auto",
          boxSizing: "border-box",
        }} />
    );
  }

  const display = displayFormat ? displayFormat(value) : value;

  return (
    <span onClick={() => { setVal(value); setEditing(true); }}
      style={{
        cursor: "text",
        display: "block",
        minWidth: 40,
        minHeight: isMobile ? TOUCH.minTarget : "auto",
        lineHeight: isMobile ? `${TOUCH.minTarget}px` : "normal",
        color: value ? C.ink : C.muted,
        fontSize: isMobile ? 14 : 12,
        fontFamily: "'Inter', sans-serif",
      }}>
      {display || <span style={{ color: C.stone }}>{placeholder || "\u2014"}</span>}
    </span>
  );
}
