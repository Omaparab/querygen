"use server";

import mysql from "mysql2/promise";
import { getConnectionUrl } from "./database";
import { parseConnectionUrl } from "./db-utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: "bar" | "pie" | "line" | "scatter" | "stackedBar" | "radar";
  data: ChartDataPoint[];
  insight: string;
  xKey: string;
  yKeys: string[];
  sourceTable: string;
}

export interface ReportData {
  success: boolean;
  tableNames?: string[];
  totalRows?: number;
  charts?: ChartConfig[];
  error?: string;
}

// ─── Column Classification ──────────────────────────────────────────────────

type ColType = "numeric" | "categorical" | "temporal";

interface ColumnMeta {
  name: string;
  colType: ColType;
  mysqlType: string;
}

interface TableProfile {
  tableName: string;
  rowCount: number;
  columns: ColumnMeta[];
  numericCols: ColumnMeta[];
  categoricalCols: ColumnMeta[];
  temporalCols: ColumnMeta[];
  rows: any[];
  score: number; // importance score
}

function classifyColumn(mysqlType: string): ColType {
  const t = mysqlType.toLowerCase();
  if (/^(int|bigint|smallint|tinyint|mediumint|float|double|decimal|numeric|real)/.test(t))
    return "numeric";
  if (/^(date|datetime|timestamp|time|year)/.test(t))
    return "temporal";
  return "categorical";
}

// ─── Ollama Integration ─────────────────────────────────────────────────────

async function getOllamaInsight(prompt: string): Promise<string> {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 120 },
      }),
    });
    if (!response.ok) return "AI insight unavailable — Ollama is not responding.";
    const data = await response.json();
    const raw: string = data.response || "";
    const sentences = raw.replace(/\n/g, " ").split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);
    return sentences.slice(0, 2).join(" ").trim() || "No insight generated.";
  } catch (error) {
    console.error("Ollama error:", error);
    return "AI insight unavailable — ensure Ollama is running locally with llama3.2 model.";
  }
}

// ─── Chart Generation Helpers ───────────────────────────────────────────────

function buildBarChart(rows: any[], catCol: ColumnMeta, numCol: ColumnMeta): ChartDataPoint[] {
  const agg: Record<string, number> = {};
  for (const row of rows) {
    const key = String(row[catCol.name] ?? "Unknown");
    agg[key] = (agg[key] || 0) + (parseFloat(row[numCol.name]) || 0);
  }
  return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

function buildPieChart(rows: any[], catCol: ColumnMeta): ChartDataPoint[] {
  const counts: Record<string, number> = {};
  for (const row of rows) { const key = String(row[catCol.name] ?? "Unknown"); counts[key] = (counts[key] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
}

function buildLineChart(rows: any[], orderCol: ColumnMeta, numCol: ColumnMeta): ChartDataPoint[] {
  const sorted = [...rows].sort((a, b) => (a[orderCol.name] < b[orderCol.name] ? -1 : a[orderCol.name] > b[orderCol.name] ? 1 : 0));
  const maxPts = 20;
  let sampled = sorted;
  if (sorted.length > maxPts) { const step = Math.floor(sorted.length / maxPts); sampled = sorted.filter((_, i) => i % step === 0).slice(0, maxPts); }
  return sampled.map((row) => ({ name: String(row[orderCol.name] ?? ""), value: parseFloat(row[numCol.name]) || 0 }));
}

function buildScatterChart(rows: any[], n1: ColumnMeta, n2: ColumnMeta): ChartDataPoint[] {
  const maxPts = 50;
  const sampled = rows.length > maxPts ? rows.filter((_, i) => i % Math.ceil(rows.length / maxPts) === 0) : rows;
  return sampled.map((row, i) => ({ name: `Point ${i + 1}`, x: parseFloat(row[n1.name]) || 0, y: parseFloat(row[n2.name]) || 0, value: parseFloat(row[n2.name]) || 0 }));
}

function buildStackedBarChart(rows: any[], c1: ColumnMeta, c2: ColumnMeta, numCol: ColumnMeta): { data: ChartDataPoint[]; subKeys: string[] } {
  const grouped: Record<string, Record<string, number>> = {};
  const subs = new Set<string>();
  for (const row of rows) {
    const p = String(row[c1.name] ?? "Unknown"), s = String(row[c2.name] ?? "Unknown");
    if (!grouped[p]) grouped[p] = {};
    grouped[p][s] = (grouped[p][s] || 0) + (parseFloat(row[numCol.name]) || 1);
    subs.add(s);
  }
  const subKeys = Array.from(subs).slice(0, 5);
  const data = Object.entries(grouped).slice(0, 8).map(([name, sv]) => {
    const pt: ChartDataPoint = { name, value: 0 };
    for (const sk of subKeys) pt[sk] = sv[sk] || 0;
    return pt;
  });
  return { data, subKeys };
}

function buildRadarChart(rows: any[], catCol: ColumnMeta, numCols: ColumnMeta[]): ChartDataPoint[] {
  const groups: Record<string, { sums: Record<string, number>; count: number }> = {};
  for (const row of rows) {
    const key = String(row[catCol.name] ?? "Unknown");
    if (!groups[key]) groups[key] = { sums: {}, count: 0 };
    groups[key].count++;
    for (const nc of numCols) groups[key].sums[nc.name] = (groups[key].sums[nc.name] || 0) + (parseFloat(row[nc.name]) || 0);
  }
  const topCats = Object.entries(groups).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  return numCols.slice(0, 6).map((nc) => {
    const pt: ChartDataPoint = { name: nc.name, value: 0 };
    for (const [catName, group] of topCats) { const avg = Math.round((group.sums[nc.name] || 0) / group.count * 100) / 100; pt[catName] = avg; pt.value = avg; }
    return pt;
  });
}

// ─── Table Scoring ──────────────────────────────────────────────────────────

function scoreTable(t: TableProfile): number {
  let s = 0;
  s += Math.min(t.rowCount, 500) * 0.1;         // more rows = more interesting
  s += t.numericCols.length * 15;                 // numeric columns are very useful
  s += t.categoricalCols.length * 10;             // categorical too
  s += t.temporalCols.length * 12;                // temporal enables line charts
  s += Math.min(t.columns.length, 15) * 3;        // column diversity
  if (t.numericCols.length > 0 && t.categoricalCols.length > 0) s += 25; // mixed = ideal
  return s;
}

// ─── Best-fit table selection per chart type ────────────────────────────────

function pickBarTable(tables: TableProfile[]): TableProfile | null {
  // Needs: categorical + numeric
  return tables.find(t => t.categoricalCols.length > 0 && t.numericCols.length > 0) || tables[0] || null;
}

function pickPieTable(tables: TableProfile[], used: Set<string>): TableProfile | null {
  // Needs: categorical; prefer unused table
  return tables.find(t => t.categoricalCols.length > 0 && !used.has(t.tableName))
    || tables.find(t => t.categoricalCols.length > 0) || tables[0] || null;
}

function pickLineTable(tables: TableProfile[], used: Set<string>): TableProfile | null {
  // Prefers: temporal + numeric; then any with numeric
  return tables.find(t => t.temporalCols.length > 0 && t.numericCols.length > 0 && !used.has(t.tableName))
    || tables.find(t => t.temporalCols.length > 0 && t.numericCols.length > 0)
    || tables.find(t => t.numericCols.length > 0 && !used.has(t.tableName))
    || tables.find(t => t.numericCols.length > 0) || tables[0] || null;
}

function pickScatterTable(tables: TableProfile[], used: Set<string>): TableProfile | null {
  // Needs: 2+ numeric columns
  return tables.find(t => t.numericCols.length >= 2 && !used.has(t.tableName))
    || tables.find(t => t.numericCols.length >= 2) || tables[0] || null;
}

function pickStackedTable(tables: TableProfile[], used: Set<string>): TableProfile | null {
  // Needs: 2 categorical + numeric, OR 1 categorical + 2 numeric
  return tables.find(t => t.categoricalCols.length >= 2 && t.numericCols.length > 0 && !used.has(t.tableName))
    || tables.find(t => t.categoricalCols.length >= 1 && t.numericCols.length >= 2 && !used.has(t.tableName))
    || tables.find(t => t.categoricalCols.length >= 2 && t.numericCols.length > 0)
    || tables[0] || null;
}

function pickRadarTable(tables: TableProfile[], used: Set<string>): TableProfile | null {
  // Needs: categorical + 2+ numeric
  return tables.find(t => t.categoricalCols.length > 0 && t.numericCols.length >= 2 && !used.has(t.tableName))
    || tables.find(t => t.numericCols.length >= 3 && !used.has(t.tableName))
    || tables.find(t => t.categoricalCols.length > 0 && t.numericCols.length >= 2)
    || tables[0] || null;
}

// ─── Main Report Generator ─────────────────────────────────────────────────

export async function generateReport(): Promise<ReportData> {
  let userPool: mysql.Pool | null = null;

  try {
    const connectionUrl = await getConnectionUrl();
    const config = parseConnectionUrl(connectionUrl);

    userPool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 5 });
    await userPool.query("SELECT 1");

    // ── 1. Discover all tables ──────────────────────────────────────────────
    const [tablesRows] = (await userPool.query(
      `SELECT table_name, table_rows FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_rows DESC`,
      [config.database]
    )) as [any[], any];

    if (!tablesRows.length) return { success: false, error: "No tables found in the database." };

    // ── 2. Profile each table (top 6 by row count) ──────────────────────────
    const tablesToProfile = tablesRows.slice(0, 6);
    const profiles: TableProfile[] = [];

    for (const tr of tablesToProfile) {
      const tName = tr.table_name ?? tr.TABLE_NAME;
      const [colRows] = (await userPool.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`,
        [config.database, tName]
      )) as [any[], any];

      const columns: ColumnMeta[] = (colRows as any[]).map((r: any) => ({
        name: r.column_name ?? r.COLUMN_NAME,
        mysqlType: r.data_type ?? r.DATA_TYPE,
        colType: classifyColumn(r.data_type ?? r.DATA_TYPE),
      }));

      const [dataRows] = (await userPool.query(`SELECT * FROM \`${tName}\` LIMIT 500`)) as [any[], any];
      if ((dataRows as any[]).length === 0) continue;

      const countRes = (await userPool.query(`SELECT COUNT(*) AS cnt FROM \`${tName}\``)) as [any[], any];
      const rowCount = parseInt(countRes[0][0]?.cnt ?? "0", 10);

      const profile: TableProfile = {
        tableName: tName,
        rowCount,
        columns,
        numericCols: columns.filter(c => c.colType === "numeric"),
        categoricalCols: columns.filter(c => c.colType === "categorical"),
        temporalCols: columns.filter(c => c.colType === "temporal"),
        rows: dataRows as any[],
        score: 0,
      };
      profile.score = scoreTable(profile);
      profiles.push(profile);
    }

    if (!profiles.length) return { success: false, error: "All tables are empty." };

    // Sort by score descending
    profiles.sort((a, b) => b.score - a.score);

    const totalRows = profiles.reduce((s, p) => s + p.rowCount, 0);
    const usedTables = new Set<string>();
    const charts: ChartConfig[] = [];

    // ── 3. Chart 1: Bar Chart ───────────────────────────────────────────────
    const barT = pickBarTable(profiles);
    if (barT) {
      usedTables.add(barT.tableName);
      const { categoricalCols: cc, numericCols: nc } = barT;
      if (cc.length > 0 && nc.length > 0) {
        const data = buildBarChart(barT.rows, cc[0], nc[0]);
        const insight = await getOllamaInsight(
          `Analyze this bar chart from table "${barT.tableName}" showing "${nc[0].name}" grouped by "${cc[0].name}". Data: ${JSON.stringify(data.slice(0, 5))}. Write exactly 1-2 sentences highlighting which category has the highest and lowest values with exact numbers.`
        );
        charts.push({ id: "bar", title: `${nc[0].name} by ${cc[0].name}`, type: "bar", data, insight, xKey: "name", yKeys: ["value"], sourceTable: barT.tableName });
      } else {
        const data = barT.numericCols.slice(0, 6).map(nc => {
          const sum = barT.rows.reduce((s: number, r: any) => s + (parseFloat(r[nc.name]) || 0), 0);
          return { name: nc.name, value: Math.round(sum * 100) / 100 };
        });
        const insight = await getOllamaInsight(`Analyze sums of numeric columns in "${barT.tableName}": ${JSON.stringify(data)}. Write 1-2 sentences about highest and lowest.`);
        charts.push({ id: "bar", title: `Column Sums — ${barT.tableName}`, type: "bar", data, insight, xKey: "name", yKeys: ["value"], sourceTable: barT.tableName });
      }
    }

    // ── 4. Chart 2: Pie Chart ───────────────────────────────────────────────
    const pieT = pickPieTable(profiles, usedTables);
    if (pieT) {
      usedTables.add(pieT.tableName);
      const catCol = pieT.categoricalCols[0] || pieT.columns[0];
      const data = buildPieChart(pieT.rows, catCol);
      const insight = await getOllamaInsight(
        `Analyze this pie chart from table "${pieT.tableName}" showing distribution of "${catCol.name}". Data: ${JSON.stringify(data)}. Write 1-2 sentences about which category is most and least common with exact counts.`
      );
      charts.push({ id: "pie", title: `${catCol.name} Distribution — ${pieT.tableName}`, type: "pie", data, insight, xKey: "name", yKeys: ["value"], sourceTable: pieT.tableName });
    }

    // ── 5. Chart 3: Line Chart ──────────────────────────────────────────────
    const lineT = pickLineTable(profiles, usedTables);
    if (lineT && lineT.numericCols.length > 0) {
      usedTables.add(lineT.tableName);
      const orderCol = lineT.temporalCols[0] || lineT.categoricalCols[0] || lineT.columns[0];
      const numCol = lineT.numericCols[0];
      const data = buildLineChart(lineT.rows, orderCol, numCol);
      const insight = await getOllamaInsight(
        `Analyze this line chart from table "${lineT.tableName}" showing "${numCol.name}" over "${orderCol.name}". Data (first 5): ${JSON.stringify(data.slice(0, 5))}. Write 1-2 sentences about trends, peaks and dips.`
      );
      charts.push({ id: "line", title: `${numCol.name} Trend — ${lineT.tableName}`, type: "line", data, insight, xKey: "name", yKeys: ["value"], sourceTable: lineT.tableName });
    }

    // ── 6. Chart 4: Scatter Plot ────────────────────────────────────────────
    const scatT = pickScatterTable(profiles, usedTables);
    if (scatT && scatT.numericCols.length >= 2) {
      usedTables.add(scatT.tableName);
      const data = buildScatterChart(scatT.rows, scatT.numericCols[0], scatT.numericCols[1]);
      const insight = await getOllamaInsight(
        `Analyze this scatter plot from table "${scatT.tableName}" comparing "${scatT.numericCols[0].name}" vs "${scatT.numericCols[1].name}". Sample: ${JSON.stringify(data.slice(0, 5))}. Write 1-2 sentences about correlation.`
      );
      charts.push({ id: "scatter", title: `${scatT.numericCols[0].name} vs ${scatT.numericCols[1].name} — ${scatT.tableName}`, type: "scatter", data, insight, xKey: "x", yKeys: ["y"], sourceTable: scatT.tableName });
    }

    // ── 7. Chart 5: Stacked Bar ─────────────────────────────────────────────
    const stackT = pickStackedTable(profiles, usedTables);
    if (stackT) {
      usedTables.add(stackT.tableName);
      const { categoricalCols: cc, numericCols: nc } = stackT;
      if (cc.length >= 2 && nc.length > 0) {
        const { data, subKeys } = buildStackedBarChart(stackT.rows, cc[0], cc[1], nc[0]);
        const insight = await getOllamaInsight(
          `Analyze stacked bar from "${stackT.tableName}" showing "${nc[0].name}" by "${cc[0].name}" & "${cc[1].name}". Categories: ${subKeys.join(", ")}. Data: ${JSON.stringify(data.slice(0, 3))}. Write 1-2 sentences about dominant segments.`
        );
        charts.push({ id: "stackedBar", title: `${nc[0].name} Breakdown — ${stackT.tableName}`, type: "stackedBar", data, insight, xKey: "name", yKeys: subKeys, sourceTable: stackT.tableName });
      } else if (cc.length >= 1 && nc.length >= 2) {
        const catCol = cc[0];
        const grouped: Record<string, Record<string, number>> = {};
        for (const row of stackT.rows) {
          const key = String(row[catCol.name] ?? "Unknown");
          if (!grouped[key]) grouped[key] = {};
          for (const n of nc.slice(0, 3)) grouped[key][n.name] = (grouped[key][n.name] || 0) + (parseFloat(row[n.name]) || 0);
        }
        const subKeys = nc.slice(0, 3).map(n => n.name);
        const data = Object.entries(grouped).slice(0, 8).map(([name, vals]) => {
          const pt: ChartDataPoint = { name, value: 0 };
          for (const sk of subKeys) pt[sk] = Math.round((vals[sk] || 0) * 100) / 100;
          return pt;
        });
        const insight = await getOllamaInsight(`Analyze stacked bar from "${stackT.tableName}" with metrics ${subKeys.join(", ")} by "${catCol.name}". Write 1-2 sentences.`);
        charts.push({ id: "stackedBar", title: `Metrics — ${stackT.tableName}`, type: "stackedBar", data, insight, xKey: "name", yKeys: subKeys, sourceTable: stackT.tableName });
      }
    }

    // ── 8. Chart 6: Radar Chart ─────────────────────────────────────────────
    const radarT = pickRadarTable(profiles, usedTables);
    if (radarT && radarT.categoricalCols.length > 0 && radarT.numericCols.length >= 2) {
      usedTables.add(radarT.tableName);
      const data = buildRadarChart(radarT.rows, radarT.categoricalCols[0], radarT.numericCols);
      const categoryKeys = Object.keys(data[0] || {}).filter(k => k !== "name" && k !== "value");
      const insight = await getOllamaInsight(
        `Analyze radar chart from "${radarT.tableName}" comparing averages. Axes: ${data.map(d => d.name).join(", ")}. Categories: ${categoryKeys.join(", ")}. Write 1-2 sentences about best performing category.`
      );
      charts.push({ id: "radar", title: `Feature Comparison — ${radarT.tableName}`, type: "radar", data, insight, xKey: "name", yKeys: categoryKeys, sourceTable: radarT.tableName });
    } else if (radarT && radarT.numericCols.length >= 3) {
      usedTables.add(radarT.tableName);
      const data = radarT.numericCols.slice(0, 6).map(nc => {
        const values = radarT.rows.map((r: any) => parseFloat(r[nc.name]) || 0);
        const avg = values.reduce((s: number, v: number) => s + v, 0) / values.length;
        return { name: nc.name, value: Math.round(avg * 100) / 100, Average: Math.round(avg * 100) / 100 };
      });
      const insight = await getOllamaInsight(`Analyze averages from "${radarT.tableName}": ${JSON.stringify(data)}. Write 1-2 sentences.`);
      charts.push({ id: "radar", title: `Averages — ${radarT.tableName}`, type: "radar", data, insight, xKey: "name", yKeys: ["Average"], sourceTable: radarT.tableName });
    }

    // ── 9. Fill remaining slots ─────────────────────────────────────────────
    let fillIdx = 0;
    while (charts.length < 6 && fillIdx < profiles.length) {
      const p = profiles[fillIdx++ % profiles.length];
      const data = p.columns.slice(0, 6).map(c => ({
        name: c.name, value: p.rows.filter((r: any) => r[c.name] != null).length,
      }));
      const insight = await getOllamaInsight(`Analyze data quality for "${p.tableName}": ${JSON.stringify(data)}. Write 1-2 sentences.`);
      charts.push({
        id: `extra_${charts.length}`, title: `Data Quality — ${p.tableName}`,
        type: charts.length % 2 === 0 ? "bar" : "pie",
        data, insight, xKey: "name", yKeys: ["value"], sourceTable: p.tableName,
      });
    }

    return {
      success: true,
      tableNames: Array.from(usedTables),
      totalRows,
      charts: charts.slice(0, 6),
    };
  } catch (error: any) {
    console.error("❌ generateReport Error:", error.message);
    return { success: false, error: error.message || "Failed to generate report" };
  } finally {
    if (userPool) await userPool.end();
  }
}
