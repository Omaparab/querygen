"use client";

import { Sidebar } from "@/components/sidebar";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  listUsers, updateUserRole, listExecutionLogs,
  type UserRecord, type ExecutionLogRecord,
} from "@/app/api/backend/admin";
import type { UserRole } from "@/app/api/backend/rbac";
import {
  listRowPolicies, createRowPolicy, deleteRowPolicy,
  type RowPolicy,
} from "@/app/api/backend/rls";
import { getFeedbackStats, type FeedbackStats } from "@/app/api/backend/feedback";
import {
  Users, ShieldCheck, Activity, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Lock,
  Plus, Trash2, ThumbsUp, ThumbsDown, MessageSquare,
} from "lucide-react";

const ROLES: UserRole[] = ["admin", "auditor_read", "auditor_write", "viewer"];
const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  auditor_read: "Auditor (Read-Only)",
  auditor_write: "Auditor (Read-Write)",
  viewer: "Viewer",
};
const ROLE_COLORS: Record<UserRole, string> = {
  admin:         "text-red-400 bg-red-500/15 border-red-500/30",
  auditor_write: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  auditor_read:  "text-blue-400 bg-blue-500/15 border-blue-500/30",
  viewer:        "text-zinc-400 bg-zinc-500/15 border-zinc-500/30",
};
const STATUS_COLORS: Record<string, string> = {
  success: "text-emerald-400",
  denied:  "text-red-400",
  error:   "text-amber-400",
};

type Tab = "users" | "rls" | "feedback" | "logs";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers]                 = useState<UserRecord[]>([]);
  const [logs, setLogs]                   = useState<ExecutionLogRecord[]>([]);
  const [policies, setPolicies]           = useState<RowPolicy[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

  const [loadingUsers, setLoadingUsers]           = useState(true);
  const [loadingLogs, setLoadingLogs]             = useState(true);
  const [loadingPolicies, setLoadingPolicies]     = useState(true);
  const [loadingFeedback, setLoadingFeedback]     = useState(true);

  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus]     = useState<Record<number, "success" | "error">>({});
  const [activeTab, setActiveTab]           = useState<Tab>("users");

  // New policy form state
  const [newPolicy, setNewPolicy] = useState({
    role: "auditor_read" as UserRole,
    table_name: "",
    filter_col: "",
    filter_val: "",
  });
  const [policyError, setPolicyError]   = useState("");
  const [policySuccess, setPolicySuccess] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [deletingPolicyId, setDeletingPolicyId] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "admin") { router.push("/"); return; }
      fetchAll();
    }
  }, [status, session, router]);

  const fetchAll = async () => {
    setLoadingUsers(true); setLoadingLogs(true);
    setLoadingPolicies(true); setLoadingFeedback(true);

    const [usersRes, logsRes, policiesRes, feedbackRes] = await Promise.all([
      listUsers(),
      listExecutionLogs(100),
      listRowPolicies(),
      getFeedbackStats(),
    ]);

    if (usersRes.success && usersRes.users) setUsers(usersRes.users);
    setLoadingUsers(false);

    if (logsRes.success && logsRes.logs) setLogs(logsRes.logs);
    setLoadingLogs(false);

    if (policiesRes.success && policiesRes.policies) setPolicies(policiesRes.policies);
    setLoadingPolicies(false);

    if (feedbackRes.success && feedbackRes.stats) setFeedbackStats(feedbackRes.stats);
    setLoadingFeedback(false);
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setUpdatingUserId(userId);
    const res = await updateUserRole(userId, newRole);
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setUpdateStatus(prev => ({ ...prev, [userId]: "success" }));
    } else {
      setUpdateStatus(prev => ({ ...prev, [userId]: "error" }));
    }
    setUpdatingUserId(null);
    setTimeout(() => setUpdateStatus(prev => { const n = { ...prev }; delete n[userId]; return n; }), 2000);
  };

  const handleCreatePolicy = async () => {
    setPolicyError(""); setPolicySuccess(""); setSavingPolicy(true);
    const res = await createRowPolicy(
      newPolicy.role, newPolicy.table_name, newPolicy.filter_col, newPolicy.filter_val
    );
    setSavingPolicy(false);
    if (res.success && res.policy) {
      setPolicies(prev => {
        const filtered = prev.filter(
          p => !(p.role === res.policy!.role && p.table_name === res.policy!.table_name && p.filter_col === res.policy!.filter_col)
        );
        return [...filtered, res.policy!];
      });
      setNewPolicy(p => ({ ...p, table_name: "", filter_col: "", filter_val: "" }));
      setPolicySuccess("Policy saved.");
      setTimeout(() => setPolicySuccess(""), 3000);
    } else {
      setPolicyError(res.error ?? "Failed to save policy.");
    }
  };

  const handleDeletePolicy = async (policyId: number) => {
    setDeletingPolicyId(policyId);
    const res = await deleteRowPolicy(policyId);
    if (res.success) setPolicies(prev => prev.filter(p => p.policy_id !== policyId));
    setDeletingPolicyId(null);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading…</div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "users",    label: "User Management" },
    { id: "rls",      label: "Row Policies" },
    { id: "feedback", label: "Feedback & Accuracy" },
    { id: "logs",     label: "Execution Logs" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="ml-64 flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={28} className="text-red-400" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
                <p className="mt-1 text-muted-foreground">
                  Manage users, row-level security policies, and monitor activity
                </p>
              </div>
            </div>
            <button onClick={fetchAll} className="flex items-center gap-2 border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-5 gap-4">
            <StatCard label="Total Users" value={users.length}
              icon={<Users size={18} className="text-blue-400" />} color="border-blue-500/30 bg-blue-500/5" />
            <StatCard label="Admins" value={users.filter(u => u.role === "admin").length}
              icon={<ShieldCheck size={18} className="text-red-400" />} color="border-red-500/30 bg-red-500/5" />
            <StatCard label="Auditors" value={users.filter(u => u.role.startsWith("auditor")).length}
              icon={<Activity size={18} className="text-amber-400" />} color="border-amber-500/30 bg-amber-500/5" />
            <StatCard label="Row Policies" value={policies.length}
              icon={<Lock size={18} className="text-violet-400" />} color="border-violet-500/30 bg-violet-500/5" />
            <StatCard label="AI Accuracy"
              value={feedbackStats ? feedbackStats.accuracy_pct : 0}
              suffix="%"
              icon={<ThumbsUp size={18} className="text-emerald-400" />}
              color="border-emerald-500/30 bg-emerald-500/5" />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-8">
          <div className="flex gap-6">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── User Management ── */}
          {activeTab === "users" && (
            loadingUsers ? <Loading /> : (
              <DataTable
                headers={["ID", "Email", "Current Role", "Change Role", "Status"]}
                empty={users.length === 0 ? "No users found" : undefined}
              >
                {users.map((user, i) => (
                  <tr key={user.id} className={rowCls(i)}>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{user.id}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={updatingUserId === user.id || user.email === session?.user?.email}
                        className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {user.email === session?.user?.email
                        ? <span className="text-xs text-muted-foreground italic">You</span>
                        : updatingUserId === user.id
                        ? <span className="text-xs text-muted-foreground">Saving…</span>
                        : updateStatus[user.id] === "success"
                        ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Saved</span>
                        : updateStatus[user.id] === "error"
                        ? <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} /> Failed</span>
                        : null}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )
          )}

          {/* ── Row Policies ── */}
          {activeTab === "rls" && (
            <div className="space-y-6">
              {/* Add policy form */}
              <div className="border border-border p-6 bg-secondary/20">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Plus size={14} /> Add Row-Level Security Policy
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Define a filter that limits which rows a role can see in a specific table.
                  For example: <span className="font-mono text-foreground">auditor_read</span> on table{" "}
                  <span className="font-mono text-foreground">employees</span>, column{" "}
                  <span className="font-mono text-foreground">department</span> = <span className="font-mono text-foreground">Finance</span>.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Role</label>
                    <select value={newPolicy.role}
                      onChange={e => setNewPolicy(p => ({ ...p, role: e.target.value as UserRole }))}
                      className="w-full border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {(["auditor_read", "auditor_write", "viewer"] as UserRole[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Table Name</label>
                    <input type="text" placeholder="employees" value={newPolicy.table_name}
                      onChange={e => setNewPolicy(p => ({ ...p, table_name: e.target.value }))}
                      className="w-full border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Filter Column</label>
                    <input type="text" placeholder="department" value={newPolicy.filter_col}
                      onChange={e => setNewPolicy(p => ({ ...p, filter_col: e.target.value }))}
                      className="w-full border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Filter Value</label>
                    <input type="text" placeholder="Finance" value={newPolicy.filter_val}
                      onChange={e => setNewPolicy(p => ({ ...p, filter_val: e.target.value }))}
                      className="w-full border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={handleCreatePolicy} disabled={savingPolicy}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    {savingPolicy ? "Saving…" : "Add Policy"}
                  </button>
                  {policySuccess && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} />{policySuccess}</span>}
                  {policyError   && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} />{policyError}</span>}
                </div>
              </div>

              {/* Policy table */}
              {loadingPolicies ? <Loading /> : (
                <DataTable
                  headers={["Policy ID", "Role", "Table", "Column", "Restricted To", "Actions"]}
                  empty={policies.length === 0 ? "No row policies defined. All roles see all rows." : undefined}
                >
                  {policies.map((p, i) => (
                    <tr key={p.policy_id} className={rowCls(i)}>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{p.policy_id}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[p.role]}`}>
                          {ROLE_LABELS[p.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{p.table_name}</td>
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{p.filter_col}</td>
                      <td className="px-4 py-3 font-mono text-sm text-emerald-400">'{p.filter_val}'</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeletePolicy(p.policy_id)}
                          disabled={deletingPolicyId === p.policy_id}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {deletingPolicyId === p.policy_id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}

          {/* ── Feedback & Accuracy ── */}
          {activeTab === "feedback" && (
            loadingFeedback ? <Loading /> : feedbackStats ? (
              <div className="space-y-6">
                {/* Accuracy gauge */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-emerald-500/30 bg-emerald-500/5 px-6 py-5 flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6"
                          className="text-emerald-400"
                          strokeDasharray={`${(feedbackStats.accuracy_pct / 100) * 163.4} 163.4`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-400">
                        {feedbackStats.accuracy_pct}%
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{feedbackStats.accuracy_pct}%</p>
                      <p className="text-xs text-muted-foreground">AI Accuracy</p>
                    </div>
                  </div>
                  <div className="border border-emerald-500/30 bg-emerald-500/5 px-6 py-5 flex items-center gap-3">
                    <ThumbsUp size={20} className="text-emerald-400" />
                    <div>
                      <p className="text-2xl font-bold">{feedbackStats.positive}</p>
                      <p className="text-xs text-muted-foreground">Positive ratings</p>
                    </div>
                  </div>
                  <div className="border border-red-500/30 bg-red-500/5 px-6 py-5 flex items-center gap-3">
                    <ThumbsDown size={20} className="text-red-400" />
                    <div>
                      <p className="text-2xl font-bold">{feedbackStats.negative}</p>
                      <p className="text-xs text-muted-foreground">Negative ratings</p>
                    </div>
                  </div>
                </div>

                {/* Top failure comments */}
                {feedbackStats.top_failure_comments.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare size={14} /> Common Failure Reasons
                    </h2>
                    <div className="space-y-2">
                      {feedbackStats.top_failure_comments.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 border border-border px-4 py-2">
                          <span className="text-xs text-muted-foreground w-6 text-right">{item.count}×</span>
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-red-500/50 rounded-full"
                              style={{ width: `${Math.min(100, (item.count / feedbackStats.negative) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-foreground">{item.comment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent feedback */}
                <div>
                  <h2 className="text-sm font-semibold mb-3">Recent Feedback</h2>
                  <DataTable
                    headers={["User", "Query", "Rating", "Comment", "Date"]}
                    empty={feedbackStats.recent.length === 0 ? "No feedback yet" : undefined}
                  >
                    {feedbackStats.recent.map((fb, i) => (
                      <tr key={fb.feedback_id} className={rowCls(i)}>
                        <td className="px-4 py-3 text-xs text-foreground">{fb.user_email}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{fb.query_text}</td>
                        <td className="px-4 py-3">
                          {fb.rating === 1
                            ? <span className="flex items-center gap-1 text-xs text-emerald-400"><ThumbsUp size={11} /> Positive</span>
                            : <span className="flex items-center gap-1 text-xs text-red-400"><ThumbsDown size={11} /> Negative</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fb.comments ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(fb.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              </div>
            ) : <p className="text-muted-foreground text-sm">No feedback data available.</p>
          )}

          {/* ── Execution Logs ── */}
          {activeTab === "logs" && (
            loadingLogs ? <Loading /> : (
              <DataTable
                headers={["Time", "User", "Type", "Status", "SQL", "Details"]}
                empty={logs.length === 0 ? "No execution logs yet" : undefined}
              >
                {logs.map((log, i) => (
                  <tr key={log.log_id} className={rowCls(i)}>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {new Date(log.executed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">{log.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                        log.query_type === "SELECT" ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {log.query_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-semibold ${STATUS_COLORS[log.exec_status] ?? "text-foreground"}`}>
                        {log.exec_status === "success" && <CheckCircle size={12} />}
                        {log.exec_status === "denied"  && <XCircle size={12} />}
                        {log.exec_status === "error"   && <AlertTriangle size={12} />}
                        {log.exec_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                      {log.sql_text}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.exec_status === "success" ? `${log.rows_affected ?? 0} rows` : log.error_msg ?? "—"}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Loading() {
  return <div className="text-muted-foreground text-sm">Loading…</div>;
}

function rowCls(i: number) {
  return `border-b border-border/50 hover:bg-secondary/40 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/20"}`;
}

function DataTable({
  headers, children, empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary border-b border-border">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {empty && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  label, value, suffix = "", icon, color,
}: {
  label: string; value: number; suffix?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`border ${color} px-4 py-4 flex items-center gap-3`}>
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}{suffix}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
