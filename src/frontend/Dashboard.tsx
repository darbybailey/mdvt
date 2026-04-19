import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Props {
  data: any;
  mode: string;
}

export default function Dashboard({ data, mode }: Props) {
  const arcRef = useRef<SVGSVGElement>(null);
  const barRef = useRef<SVGSVGElement>(null);

  // Resolve segments and tone arc regardless of response shape
  const comparison = data.comparison ?? data;
  const original = comparison.original ?? comparison;
  const dubbed = comparison.dubbed ?? null;

  const toneArc: number[] = original.tone_arc ?? [];
  const dubbedArc: number[] = dubbed?.tone_arc ?? [];
  const segments = original.segments ?? [];
  const anomalies: number[] = original.anomaly_indices ?? [];

  useEffect(() => {
    if (!arcRef.current || toneArc.length === 0) return;
    drawArc(arcRef.current, toneArc, dubbedArc, anomalies);
  }, [data]);

  useEffect(() => {
    if (!barRef.current || segments.length === 0) return;
    drawBars(barRef.current, segments);
  }, [data]);

  const drift = comparison.sentiment_drift;
  const alignScore = comparison.alignment_score;
  const mismatches = comparison.mismatch_count;

  return (
    <div style={styles.root}>
      {/* Summary stats */}
      <div style={styles.stats}>
        <Stat label="Segments" value={original.segment_count} />
        <Stat label="Avg Tone" value={original.average_compound?.toFixed(3)} color={toneColor(original.average_compound)} />
        <Stat label="Overall" value={original.overall_label} />
        <Stat label="Anomalies" value={anomalies.length} color={anomalies.length > 0 ? "#e07070" : "#70c070"} />
        {drift !== undefined && <Stat label="Drift" value={drift?.toFixed(3)} color={Math.abs(drift) > 0.2 ? "#e07070" : "#70c070"} />}
        {alignScore !== undefined && <Stat label="Alignment" value={`${(alignScore * 100).toFixed(0)}%`} color={alignScore > 0.8 ? "#70c070" : "#e07070"} />}
        {mismatches !== undefined && <Stat label="Mismatches" value={mismatches} color={mismatches > 0 ? "#e07070" : "#70c070"} />}
      </div>

      {/* Translation output */}
      {data.translation && (
        <div style={styles.translationBox}>
          <div style={styles.sectionLabel}>Translation ({data.translation.target_language?.toUpperCase()})</div>
          <p style={styles.translationText}>{data.translation.translated}</p>
        </div>
      )}

      {/* Tone arc chart */}
      {toneArc.length > 0 && (
        <div style={styles.chart}>
          <div style={styles.sectionLabel}>Tone Arc {dubbedArc.length > 0 ? "— Original (gold) vs Dubbed (blue)" : ""}</div>
          <svg ref={arcRef} width="100%" height={180} />
        </div>
      )}

      {/* Segment bars */}
      {segments.length > 0 && (
        <div style={styles.chart}>
          <div style={styles.sectionLabel}>Sentiment Per Segment</div>
          <svg ref={barRef} width="100%" height={Math.max(160, segments.length * 22 + 30)} />
        </div>
      )}

      {/* Segment table */}
      <div style={styles.table}>
        <div style={styles.sectionLabel}>Segment Detail</div>
        {segments.slice(0, 30).map((s: any) => (
          <div key={s.index} style={{ ...styles.row, borderLeft: `3px solid ${toneColor(s.compound)}`, background: anomalies.includes(s.index) ? "#1a1208" : "transparent" }}>
            <span style={styles.idx}>#{s.index + 1}</span>
            <span style={styles.compound}>{s.compound > 0 ? "+" : ""}{s.compound.toFixed(3)}</span>
            <span style={styles.segText}>{s.text}</span>
          </div>
        ))}
        {segments.length > 30 && <div style={styles.more}>+{segments.length - 30} more segments</div>}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statVal, color: color ?? "#C0A84A" }}>{value}</div>
    </div>
  );
}

function toneColor(compound: number): string {
  if (compound >= 0.05) return "#70c070";
  if (compound <= -0.05) return "#e07070";
  return "#888";
}

function drawArc(svg: SVGSVGElement, arc: number[], dubbed: number[], anomalies: number[]) {
  const el = d3.select(svg);
  el.selectAll("*").remove();

  const w = svg.parentElement?.clientWidth ?? 600;
  const h = 180;
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;

  const g = el.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, arc.length - 1]).range([0, width]);
  const y = d3.scaleLinear().domain([-1, 1]).range([height, 0]);

  // Zero line
  g.append("line")
    .attr("x1", 0).attr("x2", width)
    .attr("y1", y(0)).attr("y2", y(0))
    .attr("stroke", "#333").attr("stroke-dasharray", "4,4");

  // Anomaly markers
  anomalies.forEach((i) => {
    if (i < arc.length) {
      g.append("circle")
        .attr("cx", x(i)).attr("cy", y(arc[i]))
        .attr("r", 6).attr("fill", "none")
        .attr("stroke", "#e07070").attr("stroke-width", 1.5);
    }
  });

  const line = d3.line<number>()
    .x((_, i) => x(i))
    .y((d) => y(d))
    .curve(d3.curveCatmullRom);

  // Original arc
  g.append("path")
    .datum(arc)
    .attr("fill", "none")
    .attr("stroke", "#C0A84A")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Dubbed arc
  if (dubbed.length > 0) {
    g.append("path")
      .datum(dubbed)
      .attr("fill", "none")
      .attr("stroke", "#4a90d9")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,3")
      .attr("d", line);
  }

  // Axes
  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(Math.min(arc.length, 10)).tickFormat(d3.format("d")));
  g.append("g").call(d3.axisLeft(y).ticks(5));
}

function drawBars(svg: SVGSVGElement, segments: any[]) {
  const el = d3.select(svg);
  el.selectAll("*").remove();

  const w = svg.parentElement?.clientWidth ?? 600;
  const barH = 18;
  const margin = { top: 10, right: 20, bottom: 20, left: 40 };
  const width = w - margin.left - margin.right;
  const height = segments.length * barH + margin.top + margin.bottom;

  d3.select(svg).attr("height", height);
  const g = el.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([-1, 1]).range([0, width]);
  const y = d3.scaleBand().domain(segments.map((_: any, i: number) => String(i))).range([0, segments.length * barH]).padding(0.15);

  // Zero axis
  g.append("line")
    .attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", segments.length * barH)
    .attr("stroke", "#444");

  segments.forEach((s: any, i: number) => {
    const bx = s.compound >= 0 ? x(0) : x(s.compound);
    const bw = Math.abs(x(s.compound) - x(0));
    g.append("rect")
      .attr("x", bx).attr("y", y(String(i))!)
      .attr("width", Math.max(bw, 1))
      .attr("height", y.bandwidth())
      .attr("fill", toneColor(s.compound))
      .attr("opacity", 0.75);

    g.append("text")
      .attr("x", x(0) + (s.compound >= 0 ? 4 : -4))
      .attr("y", y(String(i))! + y.bandwidth() / 2 + 4)
      .attr("text-anchor", s.compound >= 0 ? "start" : "end")
      .attr("fill", "#888")
      .attr("font-size", 9)
      .text(`#${i + 1}`);
  });

  g.append("g").attr("transform", `translate(0,${segments.length * barH})`).call(d3.axisBottom(x).ticks(5));
}

const styles: Record<string, React.CSSProperties> = {
  root: { marginTop: 24 },
  stats: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  stat: { background: "#151515", border: "1px solid #222", padding: "12px 20px", minWidth: 100 },
  statLabel: { fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#555", marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: 700, color: "#C0A84A" },
  sectionLabel: { fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "#555", marginBottom: 10 },
  chart: { marginBottom: 28, background: "#111", border: "1px solid #1e1e1e", padding: 16 },
  table: { marginTop: 8 },
  row: { display: "flex", gap: 12, padding: "6px 10px", borderBottom: "1px solid #1a1a1a", alignItems: "flex-start" },
  idx: { fontSize: 9, color: "#555", minWidth: 28, paddingTop: 2 },
  compound: { fontSize: 11, minWidth: 52, color: "#888", paddingTop: 1 },
  segText: { fontSize: 12, color: "#bbb", lineHeight: 1.5, flex: 1 },
  more: { fontSize: 10, color: "#555", padding: "8px 10px" },
  translationBox: { background: "#111", border: "1px solid #1e1e1e", padding: 16, marginBottom: 20 },
  translationText: { fontSize: 13, color: "#c8c5bc", lineHeight: 1.7, margin: 0 },
};
