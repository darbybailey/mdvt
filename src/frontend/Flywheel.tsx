import React from "react";

interface Props {
  speed: number;       // 1–5
  onChange: (n: number) => void;
}

const LABELS = ["", "1×", "2×", "3×", "4×", "5×"];

export default function Flywheel({ speed, onChange }: Props) {
  return (
    <div style={styles.root} title="Processing speed">
      <span style={styles.label}>Speed</span>
      <div style={styles.track}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            style={{ ...styles.pip, ...(n <= speed ? styles.pipActive : {}) }}
            onClick={() => onChange(n)}
            aria-label={`Speed ${n}`}
          />
        ))}
      </div>
      <span style={styles.val}>{LABELS[speed]}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" },
  label: { fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#555" },
  track: { display: "flex", gap: 4 },
  pip: {
    width: 10, height: 10, borderRadius: "50%",
    background: "#222", border: "1px solid #444",
    cursor: "pointer", padding: 0,
  },
  pipActive: { background: "#C0A84A", borderColor: "#C0A84A" },
  val: { fontSize: 11, color: "#C0A84A", minWidth: 24 },
};
