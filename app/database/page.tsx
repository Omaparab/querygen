'use client'

import { Sidebar } from '@/components/sidebar'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const TABLES = {
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-18' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-02-01' },
  ],
  orders: [
    { id: 101, user_id: 1, total: 250.50, status: 'completed', created_at: '2024-02-03' },
    { id: 102, user_id: 2, total: 125.00, status: 'pending', created_at: '2024-02-04' },
    { id: 103, user_id: 1, total: 89.99, status: 'completed', created_at: '2024-02-05' },
  ],
  products: [
    { id: 1, name: 'Laptop', category: 'Electronics', price: 999.99, stock: 15 },
    { id: 2, name: 'Mouse', category: 'Electronics', price: 29.99, stock: 150 },
    { id: 3, name: 'Keyboard', category: 'Electronics', price: 79.99, stock: 45 },
  ],
}

export default function Database() {
  const { isLoading } = useAuth()
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const tableNames = Object.keys(TABLES)

  if (isLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Database</h1>
          <p className="mt-2 text-muted-foreground">View all tables and their data</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl space-y-4">
            {tableNames.map((tableName) => (
              <div key={tableName} className="border border-border">
                {/* Table header */}
                <button
                  onClick={() =>
                    setExpandedTable(
                      expandedTable === tableName ? null : tableName
                    )
                  }
                  className="flex w-full items-center gap-4 border-b border-border bg-secondary px-6 py-4 hover:bg-primary/10"
                >
                  {expandedTable === tableName ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <div className="flex-1 text-left">
                    <h2 className="font-semibold tracking-tight">
                      {tableName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {TABLES[tableName as keyof typeof TABLES].length} rows
                    </p>
                  </div>
                </button>

                {/* Table data */}
                {expandedTable === tableName && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary">
                          {Object.keys(
                            TABLES[tableName as keyof typeof TABLES][0]
                          ).map((column) => (
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
                        {TABLES[tableName as keyof typeof TABLES].map(
                          (row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-border hover:bg-secondary/50"
                            >
                              {Object.values(row).map((value, idx) => (
                                <td key={idx} className="px-6 py-3">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
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
