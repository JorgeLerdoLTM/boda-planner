import { useState } from "react";
import { C, glassCard } from "../utils/theme";
import { useResponsive } from "../hooks/useMediaQuery";

export function SaveBar({ cloud, onSave, onLoad, authorName, setAuthorName }) {
  const { blobId, saving, loading, lastSaved, error, changelog, disconnect } = cloud;
  const [connectCode, setConnectCode] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const { isMobile } = useResponsive();

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Main save bar */}
      <div style={{
        ...glassCard,
        padding: isMobile ? "12px 16px" : "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 8 : 14,
        flexWrap: "wrap",
      }}>
        {/* Author name */}
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Tu nombre"
          style={{
            border: `1px solid ${C.stone}`,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: "'Inter', sans-serif",
            background: C.white,
            outline: "none",
            color: C.ink,
            width: isMobile ? 90 : 110,
          }}
        />

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            background: C.greenDk,
            color: C.white,
            border: "none",
            padding: "7px 18px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>

        {/* Load latest */}
        {blobId && (
          <button
            onClick={() => onLoad()}
            disabled={loading}
            style={{
              background: "transparent",
              color: C.blue,
              border: `1px solid ${C.blueLt}`,
              padding: "6px 14px",
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Cargando..." : "Cargar ultimo"}
          </button>
        )}

        {/* Status */}
        <div style={{ flex: 1, fontSize: 11, color: C.muted, minWidth: 100 }}>
          {error && <span style={{ color: C.danger }}>{error}</span>}
          {!error && lastSaved && <span>Guardado: {fmtDate(lastSaved)}</span>}
          {!error && !lastSaved && !blobId && <span>Sin guardar en la nube</span>}
        </div>

        {/* Changelog toggle */}
        {changelog.length > 0 && (
          <button onClick={() => setShowLog(!showLog)}
            style={{ background: "transparent", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
            Historial ({changelog.length})
          </button>
        )}

        {/* Connect / Share toggle */}
        <button onClick={() => setShowConnect(!showConnect)}
          style={{ background: "transparent", border: "none", color: C.blue, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
          {blobId ? "Compartir" : "Conectar"}
        </button>
      </div>

      {/* Connect / Share panel */}
      {showConnect && (
        <div style={{ ...glassCard, padding: 16, marginTop: 1 }}>
          {blobId ? (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Codigo para compartir (copia y envia a quien quieras que edite):</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={blobId}
                  readOnly
                  onClick={(e) => { e.target.select(); navigator.clipboard?.writeText(blobId); }}
                  style={{ border: `1px solid ${C.stone}`, padding: "8px 10px", fontSize: 12, fontFamily: "monospace", background: C.cream, flex: 1, outline: "none", color: C.ink }}
                />
                <button onClick={() => { navigator.clipboard?.writeText(blobId); }}
                  style={{ background: C.greenDk, color: C.white, border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>
                  Copiar
                </button>
                <button onClick={() => { disconnect(); setShowConnect(false); }}
                  style={{ background: "transparent", color: C.danger, border: `1px solid ${C.stone}`, padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Pega un codigo para conectarte a datos compartidos:</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={connectCode}
                  onChange={(e) => setConnectCode(e.target.value.trim())}
                  placeholder="Pega el codigo aqui..."
                  style={{ border: `1px solid ${C.stone}`, padding: "8px 10px", fontSize: 12, fontFamily: "monospace", background: C.white, flex: 1, outline: "none", color: C.ink }}
                />
                <button onClick={() => { if (connectCode) { onLoad(connectCode); setShowConnect(false); setConnectCode(""); } }}
                  style={{ background: C.blue, color: C.white, border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>
                  Conectar
                </button>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>O haz click en "Guardar" para crear un nuevo codigo compartido.</div>
            </div>
          )}
        </div>
      )}

      {/* Changelog */}
      {showLog && changelog.length > 0 && (
        <div style={{ ...glassCard, padding: 16, marginTop: 1, maxHeight: 200, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Historial de cambios</div>
          {[...changelog].reverse().map((entry, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < changelog.length - 1 ? `1px solid ${C.cream}` : "none", fontSize: 12 }}>
              <span style={{ color: C.muted, minWidth: 120 }}>{fmtDate(entry.date)}</span>
              <span style={{ color: C.greenDk, fontWeight: 500, minWidth: 80 }}>{entry.author}</span>
              <span style={{ color: C.ink }}>{entry.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
