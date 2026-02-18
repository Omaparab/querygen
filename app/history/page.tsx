'use client'

import { Sidebar } from '@/components/sidebar'
import { Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface HistoryItem {
  id: string
  query: string
  timestamp: Date
  description: string
}

const DUMMY_HISTORY: HistoryItem[] = [
  {
    id: '1',
    description: 'Get all users created in last 30 days',
    query: 'SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY);',
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: '2',
    description: 'Count orders per user',
    query:
      'SELECT users.id, users.name, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id;',
    timestamp: new Date(Date.now() - 25 * 60000),
  },
  {
    id: '3',
    description: 'Update product stock',
    query: 'UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0;',
    timestamp: new Date(Date.now() - 60 * 60000),
  },
  {
    id: '4',
    description: 'Get expensive products',
    query: 'SELECT * FROM products WHERE price > 100 ORDER BY price DESC;',
    timestamp: new Date(Date.now() - 120 * 60000),
  },
  {
    id: '5',
    description: 'Find pending orders',
    query: 'SELECT * FROM orders WHERE status = "pending" ORDER BY created_at ASC;',
    timestamp: new Date(Date.now() - 180 * 60000),
  },
]

function formatTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

export default function History() {
  const { isLoading } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>(DUMMY_HISTORY)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  const handleCopy = (id: string, query: string) => {
    navigator.clipboard.writeText(query)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (id: string) => {
    setHistory(history.filter((item) => item.id !== id))
  }

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl space-y-3">
            {history.length === 0 ? (
              <div className="border border-border border-dashed px-6 py-12 text-center">
                <p className="text-muted-foreground">No query history yet</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border border-border p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{item.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(item.timestamp)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(item.id, item.query)}
                        className={`p-2 transition-colors ${
                          copiedId === item.id
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border hover:bg-secondary'
                        }`}
                        title="Copy query"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="border border-border p-2 hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <pre className="overflow-x-auto border border-border bg-secondary p-4 font-mono text-xs leading-relaxed">
                    {item.query}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
