import { useState, useCallback, useRef, useEffect } from "react";

const API = "https://jsonblob.com/api/jsonBlob";
const BLOB_KEY = "boda-planner-blob-id";
const AUTHOR_KEY = "boda-planner-author";

function getStored(key) { return localStorage.getItem(key) || ""; }
function setStored(key, v) { localStorage.setItem(key, v); }

export function useCloudSync() {
  const [blobId, setBlobIdState] = useState(() => getStored(BLOB_KEY));
  const [author, setAuthorState] = useState(() => getStored(AUTHOR_KEY));
  const [status, setStatus] = useState("idle"); // idle | saving | saved | loading | error
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
    // Only add entry if last save was >30s ago or different author
    const lastEntry = prevLog[prevLog.length - 1];
    const shouldLog = !lastEntry || lastEntry.author !== authorName || (new Date(now) - new Date(lastEntry.date)) > 30000;
    const newLog = shouldLog ? [...prevLog, entry].slice(-100) : prevLog;

    const payload = { ...data, _changelog: newLog, _lastSaved: now, _savedBy: authorName };

    try {
      const currentBlobId = getStored(BLOB_KEY);
      if (currentBlobId) {
        const res = await fetch(`${API}/${currentBlobId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al guardar");
      } else {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al crear");
        const newId = res.headers.get("x-jsonblob-id") || res.headers.get("location")?.split("/").pop();
        if (newId) setBlobId(newId);
      }
      setChangelog(newLog);
      setStatus("saved");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [changelog, setBlobId]);

  // Debounced auto-save: call this on every data change
  const autoSave = useCallback((data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(data), 2000);
  }, [save]);

  const load = useCallback(async (id) => {
    setStatus("loading");
    setError(null);
    try {
      const targetId = id || getStored(BLOB_KEY);
      if (!targetId) { setStatus("idle"); return null; }
      const res = await fetch(`${API}/${targetId}`);
      if (!res.ok) throw new Error("Codigo no encontrado");
      const data = await res.json();
      if (id && id !== getStored(BLOB_KEY)) setBlobId(id);
      setChangelog(data._changelog || []);
      setStatus("saved");
      return data;
    } catch (e) {
      setError(e.message);
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
