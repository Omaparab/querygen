"use client";

import { Sidebar } from '@/components/sidebar'
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { saveNLQuery } from "@/app/api/backend/query";
import { getDynamicSchema } from "@/app/api/backend/database";



interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sessionId = useRef<string>(crypto.randomUUID())

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

    // Fetch dynamic schema from user's database
    let schema = "";
    try {
      const schemaRes = await getDynamicSchema();
      if (!schemaRes.success || !schemaRes.schema) {
        throw new Error(schemaRes.error || "No schema found");
      }
      schema = schemaRes.schema;
    } catch (err: any) {
      console.error("Failed to fetch dynamic schema:", err);
      // Fallback or abort? We'll abort since AI needs the schema to work correctly.
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: input,
          schema: schema,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Save query to DB (non-blocking, errors logged only)
      saveNLQuery(queryText, sessionId.current).then((result) => {
        if (!result.success) {
          console.error('Failed to save query:', result.error)
        }
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Here's the SQL query for your request:\n\n${data.output}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error fetching query:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error while generating the query.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
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
                className={`flex gap-4 ${message.type === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 ${message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary text-foreground"
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
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
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
