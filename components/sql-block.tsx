"use client";

import { useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useTheme } from "next-themes";
import { Copy, Check } from "lucide-react";
import type { CSSProperties } from "react";

type Theme = { [key: string]: CSSProperties };

// ── Dark theme ────────────────────────────────────────────────────────────────
const darkTheme: Theme = {
  'code[class*="language-"]': {
    color: "#e2e8f0",
    background: "none",
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontSize: "0.8rem",
    lineHeight: "1.7",
    whiteSpace: "pre",
  },
  'pre[class*="language-"]': {
    color: "#e2e8f0",
    background: "#0a0d13",
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontSize: "0.8rem",
    lineHeight: "1.7",
    margin: "0",
    padding: "1rem 1.25rem",
    overflow: "auto",
  },
  comment:       { color: "#4b5563", fontStyle: "italic" },
  prolog:        { color: "#4b5563" },
  punctuation:   { color: "#64748b" },
  keyword:       { color: "#a78bfa", fontWeight: "600" }, // purple — SELECT, FROM, WHERE
  function:      { color: "#38bdf8" },                    // blue   — COUNT(), SUM()
  string:        { color: "#34d399" },                    // green  — 'literals'
  number:        { color: "#fb923c" },                    // orange — numbers
  boolean:       { color: "#f472b6" },                    // pink   — TRUE, FALSE, NULL
  operator:      { color: "#fbbf24" },                    // yellow — =, >, AND, OR
  "class-name":  { color: "#60a5fa" },
  symbol:        { color: "#e2e8f0" },
  inserted:      { color: "#34d399" },
  deleted:       { color: "#f87171" },
};

// ── Light theme ───────────────────────────────────────────────────────────────
const lightTheme: Theme = {
  'code[class*="language-"]': {
    color: "#1e293b",
    background: "none",
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontSize: "0.8rem",
    lineHeight: "1.7",
    whiteSpace: "pre",
  },
  'pre[class*="language-"]': {
    color: "#1e293b",
    background: "#f8fafc",
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontSize: "0.8rem",
    lineHeight: "1.7",
    margin: "0",
    padding: "1rem 1.25rem",
    overflow: "auto",
  },
  comment:       { color: "#94a3b8", fontStyle: "italic" },
  prolog:        { color: "#94a3b8" },
  punctuation:   { color: "#94a3b8" },
  keyword:       { color: "#7c3aed", fontWeight: "600" }, // purple — SELECT, FROM, WHERE
  function:      { color: "#0369a1" },                    // blue   — COUNT(), SUM()
  string:        { color: "#15803d" },                    // green  — 'literals'
  number:        { color: "#c2410c" },                    // orange — numbers
  boolean:       { color: "#be185d" },                    // pink   — TRUE, FALSE, NULL
  operator:      { color: "#b45309" },                    // amber  — =, >, AND, OR
  "class-name":  { color: "#1d4ed8" },
  symbol:        { color: "#1e293b" },
  inserted:      { color: "#15803d" },
  deleted:       { color: "#dc2626" },
};

interface SqlBlockProps {
  code: string;
}

export function SqlBlock({ code }: SqlBlockProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Avoid hydration mismatch — only render theme-aware content after mount
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;
  const headerBg = isDark ? "#070a10" : "#f1f5f9";
  const headerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const labelColor = isDark ? "#a78bfa" : "#7c3aed";
  const copyColor = isDark ? "#64748b" : "#94a3b8";

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="relative overflow-hidden border border-border/60 my-1"
      style={{ borderRadius: 0 }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ background: headerBg, borderColor: headerBorder }}
      >
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: labelColor }}
        >
          SQL
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] transition-colors hover:text-foreground"
          style={{ color: copyColor }}
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Highlighted code */}
      <SyntaxHighlighter
        language="sql"
        style={theme}
        showLineNumbers={code.trim().split("\n").length > 3}
        lineNumberStyle={{
          color: isDark ? "#2d3748" : "#cbd5e1",
          fontSize: "0.7rem",
          minWidth: "2.2em",
          paddingRight: "1em",
          userSelect: "none",
        }}
        wrapLongLines={false}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
}
