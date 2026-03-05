"use client";

import { Sidebar } from "@/components/sidebar";
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const schema = `users(id, email), query_sessions(session_id, user_id, started_at, ended_at), nl_query_history(history_id, user_id, query_text, session_id, created_at), generated_sql(sql_id, history_id, sql_text, is_valid, generated_at, executed), sql_approvals(approval_id, sql_id, user_id, approval_status, approved_at), audit_logs(log_id, user_id, history_id, generated_sql, approval_status, execution_status, logged_at), feedback(feedback_id, history_id, rating, comments, submitted_at), schema_metadata(table_name, column_name, data_type, is_primary_key, is_foreign_key), performance_metrics(metric_id, exact_match_accuracy, logical_accuracy, execution_accuracy, precision, recall, f1_score, recorded_at), url_history(user_id, database_url)`;

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
