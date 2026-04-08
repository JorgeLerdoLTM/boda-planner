import { useState, useCallback, useRef } from "react";

const API = "https://jsonblob.com/api/jsonBlob";
const BLOB_KEY = "boda-planner-blob-id";

function getBlobId() {
  return localStorage.getItem(BLOB_KEY) || "";
}
function setBlobId(id) {
  localStorage.setItem(BLOB_KEY, id);
}

export function useCloudSync() {
  const [blobId, setBlobIdState] = useState(getBlobId);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const [changelog, setChangelog] = useState([]);
  const savingRef = useRef(false);

  const save = useCallback(async (data, author = "Anon") => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    const now = new Date().toISOString();
    const entry = { author, date: now, action: "Guardado" };
    const newLog = [...(data._changelog || changelog), entry].slice(-50);
    const payload = { ...data, _changelog: newLog, _lastSaved: now, _savedBy: author };

    try {
      if (blobId) {
        // Update existing
        const res = await fetch(`${API}/${blobId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al guardar");
      } else {
        // Create new
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al crear");
        const newId = res.headers.get("x-jsonblob-id") || res.headers.get("location")?.split("/").pop();
        if (newId) {
          setBlobId(newId);
          setBlobIdState(newId);
        }
      }
      setLastSaved(now);
      setChangelog(newLog);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [blobId, changelog]);

  const load = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const targetId = id || blobId;
      if (!targetId) throw new Error("No hay codigo de sincronizacion");
      const res = await fetch(`${API}/${targetId}`);
      if (!res.ok) throw new Error("Codigo no encontrado");
      const data = await res.json();
      if (id && id !== blobId) {
        setBlobId(id);
        setBlobIdState(id);
      }
      setChangelog(data._changelog || []);
      setLastSaved(data._lastSaved || null);
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [blobId]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(BLOB_KEY);
    setBlobIdState("");
    setChangelog([]);
    setLastSaved(null);
  }, []);

  return { blobId, saving, loading, lastSaved, error, changelog, save, load, disconnect };
}
