'use client'

import { Sidebar } from '@/components/sidebar'
import {
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  fetchHistory,
  deleteQuery,
  type SessionGroup,
} from '@/app/api/backend/history'

function formatDate(raw: string) {
  const d = new Date(raw)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Truncate text to a max length, adding ellipsis if needed */
function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export default function History() {
  const { isLoading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<SessionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [activeSession, setActiveSession] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchHistory()
      if (!res.success) throw new Error(res.error)
      setSessions(res.sessions ?? [])
      // Auto-select the most recent session
      if (res.sessions && res.sessions.length > 0) {
        setActiveSession(res.sessions[0].session_id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) loadHistory()
  }, [authLoading, loadHistory])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (historyId: number) => {
    const res = await deleteQuery(historyId)
    if (res.success) {
      setSessions((prev) => {
        const updated = prev
          .map((s) => ({
            ...s,
            queries: s.queries.filter((q) => q.history_id !== historyId),
          }))
          .filter((s) => s.queries.length > 0)

        // If the active session was removed, select the first remaining one
        if (!updated.find((s) => s.session_id === activeSession)) {
          setActiveSession(updated.length > 0 ? updated[0].session_id : null)
        }

        return updated
      })
    }
  }

  const selectedSession = sessions.find(
    (s) => s.session_id === activeSession
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Query History</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage your previously generated queries
          </p>
        </div>

        {/* Two-panel content */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left panel: Session list ── */}
          <div className="w-80 flex-shrink-0 border-r border-border overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse p-3">
                    <div className="h-4 w-3/4 bg-secondary rounded" />
                    <div className="mt-2 h-3 w-1/2 bg-secondary rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={loadHistory}
                  className="mt-3 text-xs border border-border px-3 py-1.5 hover:bg-secondary"
                >
                  Retry
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare
                  size={32}
                  className="mx-auto text-muted-foreground mb-3"
                />
                <p className="text-sm text-muted-foreground">
                  No sessions yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit queries on the home page to get started
                </p>
              </div>
            ) : (
              <div className="py-2">
                {sessions.map((session) => {
                  const isActive = activeSession === session.session_id
                  const sessionName =
                    session.queries[0]?.query_text ?? 'Untitled session'

                  return (
                    <button
                      key={session.session_id}
                      onClick={() => setActiveSession(session.session_id)}
                      className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                        isActive
                          ? 'bg-secondary border-l-primary'
                          : 'border-l-transparent hover:bg-secondary/50'
                      }`}
                    >
                      <p
                        className={`text-sm leading-snug ${
                          isActive ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {truncate(sessionName, 60)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>{formatDate(session.started_at)}</span>
                        <span className="text-border">·</span>
                        <span>
                          {session.queries.length}{' '}
                          {session.queries.length === 1 ? 'query' : 'queries'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right panel: Conversation detail ── */}
          <div className="flex-1 overflow-y-auto">
            {!selectedSession ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare size={48} className="mb-4 opacity-40" />
                <p className="text-lg font-medium">
                  {sessions.length === 0
                    ? 'No query history yet'
                    : 'Select a session'}
                </p>
                <p className="text-sm mt-1">
                  {sessions.length === 0
                    ? 'Your sessions will appear here'
                    : 'Click a session on the left to view its queries'}
                </p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-8 py-6 space-y-4">
                {/* Session title header */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold leading-snug">
                    {truncate(
                      selectedSession.queries[0]?.query_text ??
                        'Untitled session',
                      120
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Started {formatDate(selectedSession.started_at)} ·{' '}
                    {selectedSession.queries.length}{' '}
                    {selectedSession.queries.length === 1
                      ? 'query'
                      : 'queries'}
                  </p>
                </div>

                {/* Query cards */}
                {selectedSession.queries.map((q, idx) => (
                  <div
                    key={q.history_id}
                    className="border border-border rounded-sm"
                  >
                    {/* Query card header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{formatDate(q.created_at)}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            handleCopy(q.history_id, q.query_text)
                          }
                          className={`p-1.5 rounded-sm transition-colors ${
                            copiedId === q.history_id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-secondary border border-border'
                          }`}
                          title={
                            copiedId === q.history_id ? 'Copied!' : 'Copy query'
                          }
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(q.history_id)}
                          className="p-1.5 rounded-sm border border-border hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete query"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Query text */}
                    <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                      {q.query_text}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
