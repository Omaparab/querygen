"use client";

import { Sidebar } from "@/components/sidebar";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  listUsers,
  updateUserRole,
  listExecutionLogs,
  type UserRecord,
  type ExecutionLogRecord,
} from "@/app/api/backend/admin";
import type { UserRole } from "@/app/api/backend/rbac";
import {
  Users,
  ShieldCheck,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const ROLES: UserRole[] = ["admin", "auditor_read", "auditor_write", "viewer"];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  auditor_read: "Auditor (Read-Only)",
  auditor_write: "Auditor (Read-Write)",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "text-red-400 bg-red-500/15 border-red-500/30",
  auditor_write: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  auditor_read: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  viewer: "text-zinc-400 bg-zinc-500/15 border-zinc-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-emerald-400",
  denied: "text-red-400",
  error: "text-amber-400",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<ExecutionLogRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<Record<number, "success" | "error">>({});
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "admin") {
        router.push("/");
        return;
      }
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    setLoadingUsers(true);
    setLoadingLogs(true);

    const [usersRes, logsRes] = await Promise.all([listUsers(), listExecutionLogs(100)]);

    if (usersRes.success && usersRes.users) setUsers(usersRes.users);
    setLoadingUsers(false);

    if (logsRes.success && logsRes.logs) setLogs(logsRes.logs);
    setLoadingLogs(false);
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setUpdatingUserId(userId);
    const res = await updateUserRole(userId, newRole);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setUpdateStatus((prev) => ({ ...prev, [userId]: "success" }));
    } else {
      setUpdateStatus((prev) => ({ ...prev, [userId]: "error" }));
    }
    setUpdatingUserId(null);
    setTimeout(() => {
      setUpdateStatus((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }, 2000);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading…</div>
      </div>
    );
  }

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
                  Manage users, roles, and monitor query execution activity
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={users.length}
              icon={<Users size={18} className="text-blue-400" />}
              color="border-blue-500/30 bg-blue-500/5"
            />
            <StatCard
              label="Admins"
              value={users.filter((u) => u.role === "admin").length}
              icon={<ShieldCheck size={18} className="text-red-400" />}
              color="border-red-500/30 bg-red-500/5"
            />
            <StatCard
              label="Auditors"
              value={users.filter((u) => u.role.startsWith("auditor")).length}
              icon={<Activity size={18} className="text-amber-400" />}
              color="border-amber-500/30 bg-amber-500/5"
            />
            <StatCard
              label="Executions Logged"
              value={logs.length}
              icon={<Activity size={18} className="text-emerald-400" />}
              color="border-emerald-500/30 bg-emerald-500/5"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-8">
          <div className="flex gap-6">
            {(["users", "logs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "users" ? "User Management" : "Execution Logs"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === "users" && (
            <div>
              {loadingUsers ? (
                <div className="text-muted-foreground text-sm">Loading users…</div>
              ) : (
                <div className="border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">ID</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Email</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Current Role</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Change Role</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, i) => (
                        <tr
                          key={user.id}
                          className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                            i % 2 === 0 ? "" : "bg-secondary/20"
                          }`}
                        >
                          <td className="px-4 py-3 text-muted-foreground font-mono">{user.id}</td>
                          <td className="px-4 py-3 text-foreground font-medium">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                              {ROLE_LABELS[user.role]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                              disabled={updatingUserId === user.id || user.email === session?.user?.email}
                              className="border border-border bg-background text-foreground text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {user.email === session?.user?.email ? (
                              <span className="text-xs text-muted-foreground italic">You</span>
                            ) : updatingUserId === user.id ? (
                              <span className="text-xs text-muted-foreground">Saving…</span>
                            ) : updateStatus[user.id] === "success" ? (
                              <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={12} /> Saved
                              </span>
                            ) : updateStatus[user.id] === "error" ? (
                              <span className="text-xs text-red-400 flex items-center gap-1">
                                <XCircle size={12} /> Failed
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              {loadingLogs ? (
                <div className="text-muted-foreground text-sm">Loading logs…</div>
              ) : (
                <div className="border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Time</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">User</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Type</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Status</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">SQL</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase text-xs tracking-wide">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr
                          key={log.log_id}
                          className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                            i % 2 === 0 ? "" : "bg-secondary/20"
                          }`}
                        >
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {new Date(log.executed_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-foreground text-xs">{log.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                              log.query_type === "SELECT"
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}>
                              {log.query_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 text-xs font-semibold ${STATUS_COLORS[log.exec_status] ?? "text-foreground"}`}>
                              {log.exec_status === "success" && <CheckCircle size={12} />}
                              {log.exec_status === "denied" && <XCircle size={12} />}
                              {log.exec_status === "error" && <AlertTriangle size={12} />}
                              {log.exec_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                            {log.sql_text}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {log.exec_status === "success"
                              ? `${log.rows_affected ?? 0} rows`
                              : log.error_msg ?? "—"}
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No execution logs yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`border ${color} px-4 py-4 flex items-center gap-3`}>
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
