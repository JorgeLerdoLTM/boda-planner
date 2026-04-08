import { useState, useCallback, useRef } from "react";

const GIST_ID = "84d11d6871ab1f17d4e25647dbf7c900";
const GIST_API = `https://api.github.com/gists/${GIST_ID}`;
const TOKEN_KEY = "boda-planner-gh-token";
const AUTHOR_KEY = "boda-planner-author";

function getStored(key) { return localStorage.getItem(key) || ""; }
function setStored(key, v) { localStorage.setItem(key, v); }

export function useCloudSync() {
  const [author, setAuthorState] = useState(() => getStored(AUTHOR_KEY));
  const [token, setTokenState] = useState(() => getStored(TOKEN_KEY));
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [changelog, setChangelog] = useState([]);
  const savingRef = useRef(false);
  const debounceRef = useRef(null);
  const changelogRef = useRef([]);
  changelogRef.current = changelog;

  const setAuthor = useCallback((name) => {
    setAuthorState(name);
    setStored(AUTHOR_KEY, name);
  }, []);

  const setToken = useCallback((t) => {
    setTokenState(t);
    setStored(TOKEN_KEY, t);
  }, []);

  const needsToken = !token;

  const save = useCallback(async (data) => {
    const currentToken = getStored(TOKEN_KEY);
    if (!currentToken || savingRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    setError(null);

    const now = new Date().toISOString();
    const authorName = getStored(AUTHOR_KEY) || "Auto";
    const entry = { author: authorName, date: now };
    const prevLog = changelogRef.current;
    const lastEntry = prevLog[prevLog.length - 1];
    const shouldLog = !lastEntry || lastEntry.author !== authorName || (new Date(now) - new Date(lastEntry.date)) > 30000;
    const newLog = shouldLog ? [...prevLog, entry].slice(-100) : prevLog;

    const payload = {
      fixedCosts: data.fixedCosts,
      varCosts: data.varCosts,
      guests: data.guests,
      cancelRate: data.cancelRate,
      contingency: data.contingency,
      _changelog: newLog,
      _lastSaved: now,
      _savedBy: authorName,
    };

    try {
      const res = await fetch(GIST_API, {
        method: "PATCH",
        headers: {
          "Authorization": `token ${currentToken}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          files: { "state.json": { content: JSON.stringify(payload) } },
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${res.status}`);
      }
      changelogRef.current = newLog;
      setChangelog(newLog);
      setStatus("saved");
    } catch (e) {
      console.error("Cloud save:", e);
      setError(e.message);
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, []);

  const saveRef = useRef(save);
  saveRef.current = save;

  const autoSave = useCallback((data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveRef.current(data), 2500);
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      // Public gist — no auth needed for read
      const res = await fetch(GIST_API, {
        headers: { "Accept": "application/vnd.github.v3+json" },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const gist = await res.json();
      const content = gist.files?.["state.json"]?.content;
      if (!content) { setStatus("idle"); return null; }
      const data = JSON.parse(content);
      changelogRef.current = data._changelog || [];
      setChangelog(data._changelog || []);
      setStatus("saved");
      return data;
    } catch (e) {
      console.error("Cloud load:", e);
      setError(e.message);
      setStatus("error");
      return null;
    }
  }, []);

  return { author, setAuthor, token, setToken, needsToken, status, error, changelog, save, autoSave, load };
}
