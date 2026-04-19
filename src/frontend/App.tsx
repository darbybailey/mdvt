import React, { useState } from "react";
import Dashboard from "./Dashboard";
import Flywheel from "./Flywheel";

const API = "";  // proxied to localhost:8000

type Mode = "analyze" | "compare" | "translate";

export default function App() {
  const [mode, setMode] = useState<Mode>("analyze");
  const [speed, setSpeed] = useState(1);          // Flywheel: 1–5
  const [text, setText] = useState("");
  const [dubbed, setDubbed] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let url = `${API}/analyze`;
      let body: any = { text };

      if (mode === "compare") {
        url = `${API}/compare`;
        body = { original: text, dubbed };
      } else if (mode === "translate") {
        url = `${API}/translate-and-analyze`;
        body = { text, target_language: targetLang };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <span style={styles.logo}>MDVT</span>
        <span style={styles.sub}>Media Dubbing Visualization Toolkit</span>
        <Flywheel speed={speed} onChange={setSpeed} />
      </header>

      <div style={styles.controls}>
        {(["analyze", "compare", "translate"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.inputs}>
        <textarea
          style={styles.textarea}
          placeholder={mode === "compare" ? "Original script..." : "Enter script or dialogue..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {mode === "compare" && (
          <textarea
            style={styles.textarea}
            placeholder="Dubbed / translated script..."
            value={dubbed}
            onChange={(e) => setDubbed(e.target.value)}
          />
        )}
        {mode === "translate" && (
          <select
            style={styles.select}
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {["es","fr","de","it","pt","ja","ko","zh","ru","ar","nl","pl","sv","tr"].map((l) => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </select>
        )}
        <button style={styles.btn} onClick={submit} disabled={loading || !text.trim()}>
          {loading ? "Processing..." : "Analyze"}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {result && <Dashboard data={result} mode={mode} />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "IBM Plex Mono, monospace", background: "#0e0e0e", minHeight: "100vh", color: "#e0ddd4", padding: 24 },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24, borderBottom: "1px solid #222", paddingBottom: 16 },
  logo: { fontSize: 22, fontWeight: 700, letterSpacing: "0.18em", color: "#C0A84A" },
  sub: { fontSize: 11, color: "#666", letterSpacing: "0.1em" },
  controls: { display: "flex", gap: 8, marginBottom: 16 },
  tab: { background: "none", border: "1px solid #333", color: "#888", padding: "6px 18px", cursor: "pointer", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" },
  tabActive: { borderColor: "#C0A84A", color: "#C0A84A" },
  inputs: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 },
  textarea: { background: "#151515", border: "1px solid #2a2a2a", color: "#e0ddd4", padding: 14, fontSize: 13, fontFamily: "IBM Plex Mono, monospace", minHeight: 140, resize: "vertical" },
  select: { background: "#151515", border: "1px solid #2a2a2a", color: "#e0ddd4", padding: "8px 12px", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" },
  btn: { alignSelf: "flex-start", background: "#C0A84A", color: "#0e0e0e", border: "none", padding: "10px 28px", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontWeight: 700 },
  error: { background: "#2a1010", border: "1px solid #5a2020", color: "#e07070", padding: 12, fontSize: 12, marginBottom: 16 },
};
