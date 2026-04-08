import { useState } from "react";
import { C } from "../../utils/theme";

export function EditableCell({ value, onChange, type = "text", placeholder = "" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const commit = () => {
    setEditing(false);
    if (val !== value) onChange(val);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setVal(value);
            setEditing(false);
          }
        }}
        type={type}
        style={{
          width: "100%",
          border: "1px solid " + C.blue,
          borderRadius: 4,
          padding: "2px 6px",
          fontSize: 12,
          background: C.yellowLt,
          outline: "none",
        }}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setVal(value);
        setEditing(true);
      }}
      style={{
        cursor: "text",
        display: "block",
        minWidth: 40,
        color: value ? C.ink : C.muted,
        fontSize: 12,
      }}
    >
      {value || (
        <span style={{ color: C.stone, fontSize: 11 }}>{placeholder || "\u2014"}</span>
      )}
    </span>
  );
}
