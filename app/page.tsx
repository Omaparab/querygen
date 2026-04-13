"use client";

import { Sidebar } from '@/components/sidebar'
import { useState, useRef, useEffect } from 'react'
import { Send, Play, AlertTriangle, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { saveNLQuery } from "@/app/api/backend/query";
import { getDynamicSchema } from "@/app/api/backend/database";
import { executeQuery, getPermissions, type QueryResult } from "@/app/api/backend/rbac";

interface QueryResultState {
  status: "idle" | "loading" | "success" | "denied" | "error";
  data?: QueryResult;
  error?: string;
  expanded: boolean;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sql?: string;
  timestamp: Date;
  queryResult?: QueryResultState;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm QueryGen, your AI-powered MySQL query builder. Describe what data you need, and I'll generate the SQL for you.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userPerms, setUserPerms] = useState<{ canExecute: boolean; canWrite: boolean; role: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      getPermissions().then(setUserPerms);
    }
  }, [status, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sessionId = useRef<string>(crypto.randomUUID())

  /** Extracts raw SQL from the AI response string */
  function extractSQL(content: string): string | undefined {
    const match = content.match(/```(?:sql)?\s*([\s\S]+?)```/i);
    if (match) return match[1].trim();
    // Fallback: try to grab a line starting with SELECT/INSERT/UPDATE etc.
    const lines = content.split('\n');
    const sqlLine = lines.find(l => /^\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|WITH)\b/i.test(l));
    return sqlLine?.trim();
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const queryText = input.trim()

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: queryText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let schema = "";
    try {
      const schemaRes = await getDynamicSchema();
      if (!schemaRes.success || !schemaRes.schema) {
        throw new Error(schemaRes.error || "No schema found");
      }
      schema = schemaRes.schema;
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: `Sorry, I couldn't connect to your database to read the schema. Please check your Database URL in Settings. Error: ${err.message}`,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input, schema }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      saveNLQuery(queryText, sessionId.current).then((result) => {
        if (!result.success) console.error('Failed to save query:', result.error)
      })

      const rawSQL = extractSQL(data.output) ?? data.output;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Here's the SQL query for your request:\n\n\`\`\`sql\n${data.output}\n\`\`\``,
        sql: rawSQL,
        timestamp: new Date(),
        queryResult: { status: "idle", expanded: false },
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error fetching query:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "Sorry, I encountered an error while generating the query.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (messageId: string, sql: string) => {
    // Set status to loading
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, queryResult: { status: "loading", expanded: true } }
          : m
      )
    );

    const result = await executeQuery(sql);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        if (result.denied) {
          return { ...m, queryResult: { status: "denied", error: result.error, expanded: true } };
        }
        if (!result.success) {
          return { ...m, queryResult: { status: "error", error: result.error, expanded: true } };
        }
        return { ...m, queryResult: { status: "success", data: result.data, expanded: true } };
      })
    );
  };

  const toggleExpanded = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.queryResult
          ? { ...m, queryResult: { ...m.queryResult, expanded: !m.queryResult.expanded } }
          : m
      )
    );
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Query Generator</h1>
              <p className="mt-2 text-muted-foreground">
                Ask me to generate any SQL query you need
              </p>
            </div>
            {userPerms && (
              <div className="flex items-center gap-2">
                <RoleBadge role={userPerms.role} />
                {!userPerms.canExecute && (
                  <span className="text-xs text-muted-foreground border border-border px-2 py-1 rounded">
                    Execution disabled for your role
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 px-8 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-3xl w-full ${message.type === "user" ? "flex justify-end" : ""}`}>
                  <div
                    className={`px-4 py-3 ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground max-w-2xl"
                        : "border border-border bg-secondary text-foreground w-full"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                      {message.content}
                    </p>

                    {/* Execute button for assistant messages with SQL */}
                    {message.type === "assistant" && message.sql && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <button
                          onClick={() => handleExecute(message.id, message.sql!)}
                          disabled={message.queryResult?.status === "loading"}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {message.queryResult?.status === "loading" ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Play size={13} />
                          )}
                          Execute Query
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Query Result Panel */}
                  {message.queryResult && message.queryResult.status !== "idle" && (
                    <QueryResultPanel
                      result={message.queryResult}
                      onToggle={() => toggleExpanded(message.id)}
                    />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="max-w-2xl border border-border bg-secondary px-4 py-3">
                  <div className="flex gap-2">
                    <div className="h-2 w-2 animate-pulse bg-foreground" />
                    <div className="h-2 w-2 animate-pulse bg-foreground delay-100" />
                    <div className="h-2 w-2 animate-pulse bg-foreground delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-background px-8 py-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe the data you need..."
                className="flex-1 border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="border border-primary bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    admin:         { label: "Admin",         className: "bg-red-500/15 text-red-400 border-red-500/30" },
    auditor_write: { label: "Auditor (RW)",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    auditor_read:  { label: "Auditor (RO)",  className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    viewer:        { label: "Viewer",         className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  };
  const c = config[role] ?? config.viewer;
  return (
    <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${c.className}`}>
      {c.label}
    </span>
  );
}

function QueryResultPanel({
  result,
  onToggle,
}: {
  result: QueryResultState;
  onToggle: () => void;
}) {
  if (result.status === "loading") {
    return (
      <div className="mt-2 border border-border bg-background px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Executing query…
      </div>
    );
  }

  if (result.status === "denied") {
    return (
      <div className="mt-2 border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-start gap-2 text-sm text-red-400">
        <XCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Access Denied</p>
          <p className="mt-0.5 text-xs opacity-80">{result.error}</p>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="mt-2 border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-2 text-sm text-amber-400">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Execution Error</p>
          <p className="mt-0.5 text-xs opacity-80 font-mono">{result.error}</p>
        </div>
      </div>
    );
  }

  if (result.status === "success" && result.data) {
    const { columns, rows, rowCount, rowsAffected } = result.data;
    const isSelectResult = columns.length > 0;

    return (
      <div className="mt-2 border border-emerald-500/40 bg-background">
        {/* Header row */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-2 bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={14} />
            <span className="font-semibold">
              {isSelectResult
                ? `${rowCount} row${rowCount !== 1 ? "s" : ""} returned`
                : `Query executed — ${rowsAffected} row${rowsAffected !== 1 ? "s" : ""} affected`}
            </span>
          </div>
          {isSelectResult && (
            result.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          )}
        </button>

        {/* Results table */}
        {isSelectResult && result.expanded && (
          <div className="overflow-auto max-h-72">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-foreground font-mono whitespace-nowrap max-w-xs truncate">
                        {row[col] === null
                          ? <span className="text-muted-foreground italic">NULL</span>
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                      No rows returned
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return null;
}
