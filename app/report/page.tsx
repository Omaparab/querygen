"use client";

import { Sidebar } from "@/components/sidebar";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { generateReport, type ChartConfig, type ReportData } from "@/app/api/backend/report";
import {
  FileText, Download, Loader2, Sparkles, AlertTriangle,
  BarChart3, PieChart, TrendingUp, ScatterChart, Layers, Radar,
  RefreshCw, Database
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  LineChart, Line, ScatterChart as RechartsScatter, Scatter,
  RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar as RechartsRadarShape
} from "recharts";

// ─── Color Palette ──────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c084fc",
  "#e879f9", "#f472b6", "#fb7185", "#f97316",
  "#facc15", "#4ade80", "#22d3ee", "#38bdf8",
];

const GRADIENT_PAIRS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f472b6"],
  ["#14b8a6", "#2dd4bf"],
  ["#f59e0b", "#fbbf24"],
  ["#3b82f6", "#60a5fa"],
  ["#ef4444", "#f87171"],
];

// ─── Chart Icon Map ─────────────────────────────────────────────────────────

const CHART_ICONS: Record<string, React.ElementType> = {
  bar: BarChart3,
  pie: PieChart,
  line: TrendingUp,
  scatter: ScatterChart,
  stackedBar: Layers,
  radar: Radar,
};

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-300 font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || entry.fill }}>
          {entry.name}: <span className="font-bold">{typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Chart Renderers ────────────────────────────────────────────────────────

function RenderBarChart({ chart, index }: { chart: ChartConfig; index: number }) {
  const [g1, g2] = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`barGrad${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g1} stopOpacity={0.9} />
            <stop offset="100%" stopColor={g2} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey={chart.xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {chart.yKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={`url(#barGrad${index})`} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderPieChart({ chart, index }: { chart: ChartConfig; index: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsPie>
        <Pie
          data={chart.data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={95}
          innerRadius={45}
          stroke="#18181b"
          strokeWidth={2}
          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: "#71717a" }}
        >
          {chart.data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </RechartsPie>
    </ResponsiveContainer>
  );
}

function RenderLineChart({ chart, index }: { chart: ChartConfig; index: number }) {
  const [g1, g2] = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`lineArea${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g1} stopOpacity={0.3} />
            <stop offset="100%" stopColor={g1} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey={chart.xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {chart.yKeys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={g1}
            strokeWidth={2.5}
            dot={{ fill: g1, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: g2, stroke: g1, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function RenderScatterChart({ chart, index }: { chart: ChartConfig; index: number }) {
  const [g1] = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsScatter data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey={chart.xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} name={chart.xKey} />
        <YAxis dataKey={chart.yKeys[0]} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} name={chart.yKeys[0]} />
        <Tooltip content={<CustomTooltip />} />
        <Scatter name="Data" fill={g1} fillOpacity={0.7} />
      </RechartsScatter>
    </ResponsiveContainer>
  );
}

function RenderStackedBarChart({ chart, index }: { chart: ChartConfig; index: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey={chart.xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
        {chart.yKeys.map((key, i) => (
          <Bar key={key} dataKey={key} stackId="stack" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === chart.yKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderRadarChart({ chart, index }: { chart: ChartConfig; index: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={chart.data}>
        <PolarGrid stroke="#3f3f46" />
        <PolarAngleAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
        <PolarRadiusAxis tick={{ fill: "#71717a", fontSize: 9 }} />
        {chart.yKeys.map((key, i) => (
          <RechartsRadarShape
            key={key}
            name={key}
            dataKey={key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
        <Tooltip content={<CustomTooltip />} />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}

// ─── Chart Card Component ───────────────────────────────────────────────────

function ChartCard({ chart, index }: { chart: ChartConfig; index: number }) {
  const Icon = CHART_ICONS[chart.type] || BarChart3;

  const renderChart = () => {
    switch (chart.type) {
      case "bar": return <RenderBarChart chart={chart} index={index} />;
      case "pie": return <RenderPieChart chart={chart} index={index} />;
      case "line": return <RenderLineChart chart={chart} index={index} />;
      case "scatter": return <RenderScatterChart chart={chart} index={index} />;
      case "stackedBar": return <RenderStackedBarChart chart={chart} index={index} />;
      case "radar": return <RenderRadarChart chart={chart} index={index} />;
      default: return <RenderBarChart chart={chart} index={index} />;
    }
  };

  return (
    <div className="group border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5">
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/50">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: `linear-gradient(135deg, ${GRADIENT_PAIRS[index % GRADIENT_PAIRS.length][0]}22, ${GRADIENT_PAIRS[index % GRADIENT_PAIRS.length][1]}22)` }}
        >
          <Icon size={16} style={{ color: GRADIENT_PAIRS[index % GRADIENT_PAIRS.length][0] }} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 truncate flex-1">{chart.title}</h3>
        {chart.sourceTable && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-teal-400 border border-teal-500/20 bg-teal-500/5 px-2 py-0.5 shrink-0 rounded-sm">
            <Database size={9} />
            {chart.sourceTable}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="px-3 py-4">
        {renderChart()}
      </div>

      {/* AI Insight */}
      <div className="px-5 py-4 border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-start gap-2">
          <div className="flex items-center justify-center w-5 h-5 mt-0.5 rounded-md bg-indigo-500/10 shrink-0">
            <Sparkles size={11} className="text-indigo-400" />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {chart.insight}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ──────────────────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950/50 animate-pulse">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
        <div className="h-4 w-32 bg-zinc-800 rounded" />
      </div>
      <div className="px-3 py-4">
        <div className="h-[260px] bg-zinc-900/50 rounded flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="text-indigo-500/50 animate-spin" />
            <span className="text-xs text-zinc-600">Generating chart {index + 1}...</span>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-md bg-zinc-800 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-full bg-zinc-800 rounded" />
            <div className="h-3 w-3/4 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { isLoading: authLoading } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReportData(null);
    try {
      const data = await generateReport();
      setReportData(data);
    } catch (err: any) {
      setReportData({ success: false, error: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const element = reportRef.current;

      // Capture the report section
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#09090b",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if content overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      pdf.save(`Data_Report_${reportData?.tableNames?.join("_") || "report"}_${timestamp}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Data Report</h1>
              <p className="mt-2 text-muted-foreground">
                AI-powered data overview with automated charts and insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : reportData?.success ? (
                  <>
                    <RefreshCw size={16} />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Report
                  </>
                )}
              </button>

              {reportData?.success && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-zinc-600"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Download PDF
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Empty State */}
          {!isGenerating && !reportData && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <FileText size={36} className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-200 mb-2">
                Generate Your Data Report
              </h2>
              <p className="text-sm text-zinc-500 max-w-md mb-8 leading-relaxed">
                Click the button above to analyze your connected database. The report
                will include 6 automated charts with AI-generated insights powered by
                Ollama.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {["Bar Chart", "Pie Chart", "Line Chart", "Scatter Plot", "Stacked Bar", "Radar Chart"].map((type, i) => {
                  const icons = [BarChart3, PieChart, TrendingUp, ScatterChart, Layers, Radar];
                  const Icon = icons[i];
                  return (
                    <div key={type} className="flex items-center gap-2 px-3 py-1.5 border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500">
                      <Icon size={12} />
                      {type}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Loader2 size={18} className="text-indigo-400 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">Analyzing your data...</p>
                  <p className="text-xs text-zinc-600">
                    Fetching data, generating charts, and getting AI insights from Ollama
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {reportData && !reportData.success && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-200 mb-2">Report Generation Failed</h2>
              <p className="text-sm text-red-400/80 max-w-md text-center mb-6">
                {reportData.error}
              </p>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          )}

          {/* Report Content */}
          {reportData?.success && reportData.charts && (
            <div ref={reportRef}>
              {/* Report Header */}
              <div className="mb-6 pb-5 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">
                      Multi-Table Report
                    </h2>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {reportData.tableNames?.map((t) => (
                        <span key={t} className="flex items-center gap-1 text-[11px] font-medium text-teal-400 border border-teal-500/20 bg-teal-500/5 px-2 py-0.5">
                          <Database size={10} />
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      {reportData.totalRows?.toLocaleString()} total rows across {reportData.tableNames?.length || 0} tables • {reportData.charts.length} charts • {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-400">
                    <Sparkles size={12} />
                    AI Insights by Ollama
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {reportData.charts.map((chart, index) => (
                  <ChartCard key={chart.id} chart={chart} index={index} />
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-5 border-t border-zinc-800 text-center">
                <p className="text-xs text-zinc-600">
                  Generated by QueryGen • AI insights powered by Ollama (llama3.2) • {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
