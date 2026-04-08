import { useState } from "react";
import { C, glassCard } from "../utils/theme";
import { useResponsive } from "../hooks/useMediaQuery";

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function SaveBar({ cloud }) {
  const { blobId, author, setAuthor, status, error, changelog, disconnect } = cloud;
  const [showPanel, setShowPanel] = useState(false);
  const [connectCode, setConnectCode] = useState("");
  const [nameInput, setNameInput] = useState("");
  const { isMobile } = useResponsive();

  // If no author set yet, show name prompt
  if (!author) {
    return (
      <div style={{ ...glassCard, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.ink, marginBottom: 12 }}>Como te llamas? (para el historial de cambios)</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 300, margin: "0 auto" }}>
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) setAuthor(nameInput.trim()); }}
            placeholder="Tu nombre..."
            style={{ border: `1px solid ${C.stone}`, padding: "10px 14px", fontSize: 13, fontFamily: "'Inter', sans-serif", background: C.white, flex: 1, outline: "none", color: C.ink }} />
          <button onClick={() => { if (nameInput.trim()) setAuthor(nameInput.trim()); }}
            style={{ background: C.greenDk, color: C.white, border: "none", padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Listo
          </button>
        </div>
      </div>
    );
  }

  const dot = {
    idle: C.muted,
    saving: C.yellow,
    saved: C.success,
    loading: C.blue,
    error: C.danger,
  }[status] || C.muted;

  const label = {
    idle: "Local",
    saving: "Guardando...",
    saved: "Sincronizado",
    loading: "Cargando...",
    error: error || "Error",
  }[status] || "";

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Minimal status bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: isMobile ? "8px 0" : "8px 0",
        fontSize: 11,
        color: C.muted,
      }}>
        <span style={{ width: 6, height: 6, background: dot, display: "inline-block", flexShrink: 0 }} />
        <span>{label}</span>
        {blobId && <span style={{ opacity: 0.5 }}>&middot; {author}</span>}
        <span style={{ flex: 1 }} />
        {changelog.length > 0 && (
          <button onClick={() => setShowPanel(showPanel === "log" ? false : "log")}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Historial ({changelog.length})
          </button>
        )}
        <button onClick={() => setShowPanel(showPanel === "sync" ? false : "sync")}
          style={{ background: "none", border: "none", color: C.blue, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
          {blobId ? "Compartir" : "Conectar"}
        </button>
      </div>

      {/* Sync panel */}
      {showPanel === "sync" && (
        <div style={{ ...glassCard, padding: 16, marginTop: 4 }}>
          {blobId ? (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Codigo compartido (envia a quien quiera editar):</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={blobId} readOnly onClick={(e) => { e.target.select(); navigator.clipboard?.writeText(blobId); }}
                  style={{ border: `1px solid ${C.stone}`, padding: "8px 10px", fontSize: 11, fontFamily: "monospace", background: C.cream, flex: 1, outline: "none", color: C.ink }} />
                <button onClick={() => navigator.clipboard?.writeText(blobId)}
                  style={{ background: C.greenDk, color: C.white, border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>Copiar</button>
                <button onClick={() => { disconnect(); setShowPanel(false); }}
                  style={{ background: "transparent", color: C.danger, border: `1px solid ${C.stone}`, padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>Desconectar</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Pega un codigo para conectarte, o tus cambios se guardaran automaticamente y se creara un nuevo codigo:</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={connectCode} onChange={(e) => setConnectCode(e.target.value.trim())} placeholder="Pega el codigo aqui..."
                  style={{ border: `1px solid ${C.stone}`, padding: "8px 10px", fontSize: 11, fontFamily: "monospace", background: C.white, flex: 1, outline: "none", color: C.ink }} />
                <button onClick={() => { if (connectCode) { cloud.load(connectCode).then((data) => { if (data && cloud.onConnect) cloud.onConnect(data); }); setShowPanel(false); setConnectCode(""); } }}
                  style={{ background: C.blue, color: C.white, border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>Conectar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Changelog */}
      {showPanel === "log" && changelog.length > 0 && (
        <div style={{ ...glassCard, padding: 16, marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
          {[...changelog].reverse().map((entry, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: i < changelog.length - 1 ? `1px solid ${C.cream}` : "none", fontSize: 11 }}>
              <span style={{ color: C.muted, minWidth: 110 }}>{fmtDate(entry.date)}</span>
              <span style={{ color: C.greenDk, fontWeight: 500 }}>{entry.author}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
