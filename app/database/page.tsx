'use client'

import { Sidebar } from '@/components/sidebar'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle, Database as DatabaseIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { fetchTables, type TableInfo } from '@/app/api/backend/database'

export default function Database() {
  const { isLoading: authLoading } = useAuth()
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [databaseUrl, setDatabaseUrl] = useState<string | null>(null)

  const loadTables = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchTables()
      if (result.success && result.tables) {
        setTables(result.tables)
        setDatabaseUrl(result.databaseUrl || null)
      } else {
        setError(result.error || 'Failed to fetch tables')
        setTables([])
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setTables([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTables()
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Database</h1>
              <p className="mt-2 text-muted-foreground">
                View all tables and their data
              </p>
              {databaseUrl && !isLoading && !error && (
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  Connected to: {databaseUrl}
                </p>
              )}
            </div>
            <button
              onClick={loadTables}
              disabled={isLoading}
              className="flex items-center gap-2 border border-border px-4 py-2 hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <RefreshCw size={32} className="animate-spin mb-4" />
                <p className="text-lg font-medium">Connecting to database...</p>
                <p className="text-sm mt-1">Fetching tables and data</p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center py-20 border border-red-600/30 bg-red-600/5 p-8">
                <AlertCircle size={32} className="text-red-500 mb-4" />
                <p className="text-lg font-medium text-red-500">Connection Failed</p>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                  {error}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Check your database URL in{' '}
                  <a href="/settings" className="text-primary underline hover:text-primary/80">
                    Settings
                  </a>
                </p>
                <button
                  onClick={loadTables}
                  className="mt-4 border border-border px-4 py-2 hover:bg-secondary"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && tables.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <DatabaseIcon size={32} className="mb-4" />
                <p className="text-lg font-medium">No tables found</p>
                <p className="text-sm mt-1">
                  The connected database has no tables in the public schema.
                </p>
              </div>
            )}

            {/* Tables */}
            {!isLoading && !error && tables.map((table) => (
              <div key={table.tableName} className="border border-border">
                {/* Table header */}
                <button
                  onClick={() =>
                    setExpandedTable(
                      expandedTable === table.tableName ? null : table.tableName
                    )
                  }
                  className="flex w-full items-center gap-4 border-b border-border bg-secondary px-6 py-4 hover:bg-primary/10"
                >
                  {expandedTable === table.tableName ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <div className="flex-1 text-left">
                    <h2 className="font-semibold tracking-tight">
                      {table.tableName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {table.rowCount} {table.rowCount === 1 ? 'row' : 'rows'} · {table.columns.length} columns
                    </p>
                  </div>
                </button>

                {/* Table data */}
                {expandedTable === table.tableName && (
                  <div className="overflow-x-auto">
                    {table.rows.length > 0 ? (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-secondary">
                            {table.columns.map((column) => (
                              <th
                                key={column}
                                className="px-6 py-3 text-left font-semibold"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-border hover:bg-secondary/50"
                            >
                              {table.columns.map((column) => (
                                <td key={column} className="px-6 py-3">
                                  {row[column] === null
                                    ? <span className="text-muted-foreground italic">NULL</span>
                                    : String(row[column])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-6 py-8 text-center text-muted-foreground">
                        This table has no data.
                      </div>
                    )}
                    {table.rowCount > 100 && (
                      <div className="px-6 py-3 text-sm text-muted-foreground border-t border-border bg-secondary/50">
                        Showing first 100 of {table.rowCount} rows
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
