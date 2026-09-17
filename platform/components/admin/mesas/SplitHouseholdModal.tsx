"use client";
import { useState } from "react";
import { C, glassCard, TOUCH } from "@/lib/theme";
import type { AdminGuestRow } from "@/lib/queries";
import { confirmedSeats, type SeatingParty } from "@/lib/seating";
import type { PartyInput } from "@/app/admin/seating-actions";

// Define the parts of a household with > 2 confirmed seats. Parts must add up
// to the confirmed count. Existing parties keep their id so their seats survive.
export function SplitHouseholdModal({ guest, parties, onSave, onClose }: {
  guest: AdminGuestRow;
  parties: SeatingParty[];
  onSave: (parts: PartyInput[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const total = confirmedSeats(guest);
  const name = guest.invitation || `${guest.first} ${guest.last}`.trim();
  const [rows, setRows] = useState<PartyInput[]>(() =>
    parties.length > 0
      ? parties.slice().sort((a, b) => a.sort - b.sort).map((p) => ({ id: p.id, label: p.label, seats: p.seats }))
      : [{ label: name, seats: total }],
  );
  const [saving, setSaving] = useState(false);
  const sum = rows.reduce((s, r) => s + (Number(r.seats) || 0), 0);
  const valid = rows.length > 0 && sum === total && rows.every((r) => r.label.trim() && Number(r.seats) >= 1);
  const update = (i: number, patch: Partial<PartyInput>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const inputStyle = { height: 36, padding: "0 10px", border: `1px solid ${C.stone}`, background: C.white, color: C.ink, fontSize: 13, fontFamily: "'Inter', sans-serif" } as const;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const ok = await onSave(rows.map((r) => ({ id: r.id, label: r.label.trim(), seats: Number(r.seats) })));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,74,61,0.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Definir grupos" style={{ ...glassCard, background: C.white, width: 460, maxWidth: "100%", padding: 22 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: C.greenDk, marginBottom: 4 }}>Definir grupos</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          <b style={{ color: C.ink }}>{name}</b> confirmó <b style={{ color: C.ink }}>{total}</b> pases. Divide en personas o parejas que se sentarán juntas; cada parte será su propia tarjeta.
        </div>
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={r.label} placeholder="Nombre(s)" aria-label={`Parte ${i + 1}`} onChange={(e) => update(i, { label: e.target.value })} style={{ ...inputStyle, flex: 1 }} autoFocus={i === rows.length - 1 && !r.id} />
            <input value={r.seats} type="number" min={1} max={total} aria-label={`Asientos parte ${i + 1}`} onChange={(e) => update(i, { seats: Number(e.target.value) })} style={{ ...inputStyle, width: 64 }} />
            <button onClick={() => setRows((p) => p.filter((_, j) => j !== i))} disabled={rows.length === 1} title="Quitar parte"
              style={{ width: 32, height: 36, border: "none", background: "transparent", color: rows.length === 1 ? C.stone : C.danger, cursor: rows.length === 1 ? "default" : "pointer", fontSize: 18 }}>×</button>
          </div>
        ))}
        <button onClick={() => setRows((p) => [...p, { label: "", seats: Math.max(1, total - sum) }])}
          style={{ background: "transparent", border: `1px dashed ${C.stone}`, color: C.greenDk, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 14 }}>+ Agregar parte</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: sum === total ? C.success : C.danger, flex: 1 }}>Suma {sum} de {total}{sum !== total ? " — deben coincidir" : " ✓"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.stone}`, color: C.muted, padding: "8px 14px", fontSize: 12, cursor: "pointer", minHeight: TOUCH.minTarget, fontFamily: "'Inter', sans-serif" }}>Cancelar</button>
          <button onClick={save} disabled={!valid || saving}
            style={{ background: valid ? C.greenDk : C.stone, border: "none", color: C.white, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: valid ? "pointer" : "not-allowed", minHeight: TOUCH.minTarget, fontFamily: "'Inter', sans-serif" }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
