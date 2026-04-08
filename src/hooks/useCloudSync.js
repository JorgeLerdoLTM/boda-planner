import { useState, useCallback, useRef } from "react";

const API = "https://jsonblob.com/api/jsonBlob";
const BLOB_KEY = "boda-planner-blob-id";
const AUTHOR_KEY = "boda-planner-author";

function getStored(key) { return localStorage.getItem(key) || ""; }
function setStored(key, v) { localStorage.setItem(key, v); }

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

export function useCloudSync() {
  const [blobId, setBlobIdState] = useState(() => getStored(BLOB_KEY));
  const [author, setAuthorState] = useState(() => getStored(AUTHOR_KEY));
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [changelog, setChangelog] = useState([]);
  const savingRef = useRef(false);
  const debounceRef = useRef(null);

  const setAuthor = useCallback((name) => {
    setAuthorState(name);
    setStored(AUTHOR_KEY, name);
  }, []);

  const setBlobId = useCallback((id) => {
    setBlobIdState(id);
    setStored(BLOB_KEY, id);
  }, []);

  const save = useCallback(async (data) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    setError(null);

    const now = new Date().toISOString();
    const authorName = getStored(AUTHOR_KEY) || "Auto";
    const entry = { author: authorName, date: now };
    const prevLog = data._changelog || changelog;
    const lastEntry = prevLog[prevLog.length - 1];
    const shouldLog = !lastEntry || lastEntry.author !== authorName || (new Date(now) - new Date(lastEntry.date)) > 30000;
    const newLog = shouldLog ? [...prevLog, entry].slice(-100) : prevLog;

    // Strip internal fields before saving
    const { _changelog, _lastSaved, _savedBy, ...cleanData } = data;
    const payload = { ...cleanData, _changelog: newLog, _lastSaved: now, _savedBy: authorName };

    try {
      const currentBlobId = getStored(BLOB_KEY);
      if (currentBlobId) {
        const res = await fetch(`${API}/${currentBlobId}`, { method: "PUT", headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Guardar fallo (${res.status})`);
      } else {
        const res = await fetch(API, { method: "POST", headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Crear fallo (${res.status})`);
        const loc = res.headers.get("location") || "";
        const newId = res.headers.get("x-jsonblob-id") || loc.split("/").pop();
        if (newId) setBlobId(newId);
      }
      setChangelog(newLog);
      setStatus("saved");
    } catch (e) {
      console.error("Cloud save error:", e);
      setError(e.message || "Error de red");
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [changelog, setBlobId]);

  const autoSave = useCallback((data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(data), 2500);
  }, [save]);

  const load = useCallback(async (id) => {
    setStatus("loading");
    setError(null);
    try {
      const targetId = id || getStored(BLOB_KEY);
      if (!targetId) { setStatus("idle"); return null; }
      const res = await fetch(`${API}/${targetId}`, { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error(`Codigo no encontrado (${res.status})`);
      const data = await res.json();
      if (id && id !== getStored(BLOB_KEY)) setBlobId(id);
      setChangelog(data._changelog || []);
      setStatus("saved");
      return data;
    } catch (e) {
      console.error("Cloud load error:", e);
      setError(e.message || "Error de red");
      setStatus("error");
      return null;
    }
  }, [setBlobId]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(BLOB_KEY);
    setBlobIdState("");
    setChangelog([]);
    setStatus("idle");
  }, []);

  return { blobId, author, setAuthor, status, error, changelog, save, autoSave, load, disconnect, setBlobId };
}
