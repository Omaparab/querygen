'use client'

import { Sidebar } from '@/components/sidebar'
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const DUMMY_QUERIES = [
  'SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY);',
  'SELECT users.id, users.name, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id;',
  'UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0;',
]

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m QueryGen, your AI-powered MySQL query builder. Describe what data you need, and I\'ll generate the SQL for you.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate API response
    setTimeout(() => {
      const randomQuery = DUMMY_QUERIES[Math.floor(Math.random() * DUMMY_QUERIES.length)]
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Here's the SQL query for your request:\n\n${randomQuery}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main content */}
      <main className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Query Generator</h1>
          <p className="mt-2 text-muted-foreground">
            Ask me to generate any MySQL query you need
          </p>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 px-8 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-secondary text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
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
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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
  )
}
