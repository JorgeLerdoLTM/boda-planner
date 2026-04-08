import { useState } from "react";
import { C } from "../../utils/theme";

export function EditableCell({ value, onChange, type = "text", placeholder = "", displayFormat }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const commit = () => { setEditing(false); if (val !== value) onChange(val); };

  if (editing) {
    return (
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(value); setEditing(false); } }}
        type={type}
        style={{ width: "100%", border: `1px solid ${C.ink}`, padding: "2px 6px", fontSize: 12, fontFamily: "'Inter', sans-serif", background: C.white, outline: "none", color: C.ink }} />
    );
  }

  const display = displayFormat ? displayFormat(value) : value;

  return (
    <span onClick={() => { setVal(value); setEditing(true); }}
      style={{ cursor: "text", display: "block", minWidth: 40, color: value ? C.ink : C.muted, fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
      {display || <span style={{ color: C.stone }}>{placeholder || "\u2014"}</span>}
    </span>
  );
}
