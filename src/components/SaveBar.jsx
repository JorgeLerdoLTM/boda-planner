import { useState } from "react";
import { C, glassCard } from "../utils/theme";
import { useResponsive } from "../hooks/useMediaQuery";

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function SaveBar({ cloud }) {
  const { author, setAuthor, token, setToken, needsToken, status, error, changelog } = cloud;
  const [showLog, setShowLog] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const { isMobile } = useResponsive();

  // First-time setup: name
  if (!author) {
    return (
      <div style={{ ...glassCard, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.ink, marginBottom: 12 }}>Como te llamas?</div>
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

  const dot = { idle: C.muted, saving: C.yellow, saved: C.success, loading: C.blue, error: C.danger }[status] || C.muted;
  const label = { idle: needsToken ? "Solo local" : "Listo", saving: "Guardando...", saved: "Sincronizado", loading: "Cargando...", error: error || "Error" }[status] || "";

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 11, color: C.muted }}>
        <span style={{ width: 6, height: 6, background: dot, display: "inline-block", flexShrink: 0 }} />
        <span>{label}</span>
        {!needsToken && <span style={{ opacity: 0.5 }}>&middot; {author}</span>}
        <span style={{ flex: 1 }} />
        {changelog.length > 0 && (
          <button onClick={() => { setShowLog(!showLog); setShowSetup(false); }}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Historial ({changelog.length})
          </button>
        )}
        {needsToken && (
          <button onClick={() => { setShowSetup(!showSetup); setShowLog(false); }}
            style={{ background: "none", border: "none", color: C.blue, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Activar sync
          </button>
        )}
      </div>

      {/* Token setup */}
      {showSetup && needsToken && (
        <div style={{ ...glassCard, padding: 16, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
            Para sincronizar entre dispositivos, necesitas un token de GitHub con permiso de "gist":
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
            1. Ve a github.com/settings/tokens → Generate new token (classic)
            <br />2. Marca solo el permiso "gist"
            <br />3. Genera y pega el token aqui:
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value.trim())} placeholder="ghp_xxxxx..."
              style={{ border: `1px solid ${C.stone}`, padding: "8px 10px", fontSize: 11, fontFamily: "monospace", background: C.white, flex: 1, outline: "none", color: C.ink }} />
            <button onClick={() => { if (tokenInput) { setToken(tokenInput); setShowSetup(false); setTokenInput(""); } }}
              style={{ background: C.greenDk, color: C.white, border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>
              Guardar
            </button>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>El token se guarda solo en tu navegador. Sin el, los cambios solo se guardan localmente.</div>
        </div>
      )}

      {/* Changelog */}
      {showLog && changelog.length > 0 && (
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
