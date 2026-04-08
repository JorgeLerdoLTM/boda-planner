import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { C, glassCard } from "../utils/theme";
import { uid } from "../utils/calculations";

// Map common Excel column names to our guest fields
const COLUMN_MAP = {
  // side
  side: "side", lado: "side",
  // group
  group: "group", grupo: "group", mesa: "group",
  // first name
  first: "first", first_name: "first", nombre: "first", name: "first",
  // last name
  last: "last", last_name: "last", apellido: "last", apellidos: "last",
  // plus one
  plus_one: "plus_one", plusone: "plus_one", acompanante: "plus_one", acompañante: "plus_one", pax: "plus_one", personas: "plus_one",
  // phone
  phone: "phone", telefono: "phone", teléfono: "phone", tel: "phone", celular: "phone", whatsapp: "phone",
  // rsvp
  rsvp: "rsvp", rsvp_status: "rsvp", confirmacion: "rsvp", confirmación: "rsvp",
  // invitation sent
  inv_sent: "inv_sent", invitation_sent: "inv_sent", invitacion: "inv_sent", invitación: "inv_sent",
  // dietary
  dietary: "dietary", dieta: "dietary", restricciones: "dietary",
  // notes
  notes: "notes", notas: "notes", comentarios: "notes",
  // email
  email: "phone", correo: "phone",
};

function normalizeKey(key) {
  return key.toLowerCase().trim().replace(/[^a-z0-9_áéíóúñü]/g, "").replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ú/g,"u").replace(/ñ/g,"n").replace(/ü/g,"u");
}

function mapRow(row) {
  const guest = {
    id: "g" + uid(),
    side: "",
    group: "",
    first: "",
    last: "",
    plus_one: 1,
    phone: "",
    rsvp: "Pending",
    inv_sent: "Not Sent",
    dietary: "",
    notes: "",
  };

  for (const [key, val] of Object.entries(row)) {
    if (val == null || val === "") continue;
    const norm = normalizeKey(key);
    const field = COLUMN_MAP[norm];
    if (!field) continue;

    const strVal = String(val).trim();

    if (field === "plus_one") {
      guest.plus_one = parseInt(strVal) || 1;
    } else if (field === "rsvp") {
      const lower = strVal.toLowerCase();
      if (lower.includes("confirm")) guest.rsvp = "Confirmed";
      else if (lower.includes("declin") || lower.includes("no")) guest.rsvp = "Declined";
      else guest.rsvp = "Pending";
    } else if (field === "inv_sent") {
      const lower = strVal.toLowerCase();
      if (lower.includes("deliver") || lower.includes("entregad")) guest.inv_sent = "Delivered";
      else if (lower.includes("sent") || lower.includes("enviad")) guest.inv_sent = "Sent";
      else guest.inv_sent = "Not Sent";
    } else {
      guest[field] = strVal;
    }
  }

  return guest;
}

export function ExcelUpload({ onImport, existingCount }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [workbook, setWorkbook] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // Auto-select sheet that looks like guest list
      const guestSheet = wb.SheetNames.find((n) => {
        const lower = n.toLowerCase();
        return lower.includes("guest") || lower.includes("invitad") || lower.includes("list") || lower.includes("input");
      }) || wb.SheetNames[0];

      setSelectedSheet(guestSheet);
      parseSheet(wb, guestSheet);
    };
    reader.readAsArrayBuffer(file);
  };

  const parseSheet = (wb, name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const mapped = rows.map(mapRow).filter((g) => g.first || g.last);
    setPreview(mapped);
  };

  const handleSheetChange = (name) => {
    setSelectedSheet(name);
    if (workbook) parseSheet(workbook, name);
  };

  const handleImport = () => {
    if (preview && preview.length > 0) {
      onImport(preview);
      setPreview(null);
      setWorkbook(null);
      setSheetNames([]);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleClear = () => {
    setPreview(null);
    setWorkbook(null);
    setSheetNames([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      {/* Upload area */}
      <div style={{ ...glassCard, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Importar desde Excel
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
              Sube un archivo .xlsx o .xls con columnas: Nombre, Apellido, Side, Grupo, Plus_one, Telefono, etc.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              style={{ fontSize: 11, fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          {sheetNames.length > 1 && (
            <div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Hoja</div>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                style={{ border: `1px solid ${C.stone}`, padding: "6px 12px", fontSize: 11, fontFamily: "'Inter', sans-serif", background: C.white, cursor: "pointer" }}
              >
                {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ ...glassCard, overflow: "auto", marginBottom: 20 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.stone}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{preview.length} invitados encontrados</span>
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>({existingCount} existentes)</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleClear}
                style={{ background: "transparent", color: C.muted, border: `1px solid ${C.stone}`, padding: "7px 16px", fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleImport}
                style={{ background: C.ink, color: C.white, border: "none", padding: "7px 16px", fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
                Importar {preview.length}
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Side", "Grupo", "Nombre", "Apellido", "+1", "Tel", "RSVP"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.stone}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 20).map((g) => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${C.cream}` }}>
                  <td style={{ padding: "8px 12px", fontSize: 11 }}>{g.side || "\u2014"}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted }}>{g.group || "\u2014"}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{g.first}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }}>{g.last}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, textAlign: "center" }}>{g.plus_one}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted }}>{g.phone || "\u2014"}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11 }}>{g.rsvp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 20 && (
            <div style={{ padding: "10px 14px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.stone}` }}>
              Mostrando 20 de {preview.length} (se importaran todos)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
