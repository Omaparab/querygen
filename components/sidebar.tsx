'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Database, History, Settings, BarChart3, LogOut, ShieldCheck } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

type UserRole = "admin" | "auditor_read" | "auditor_write" | "viewer";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  auditor_read: "Auditor (RO)",
  auditor_write: "Auditor (RW)",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "text-red-400 border-red-500/40",
  auditor_write: "text-amber-400 border-amber-500/40",
  auditor_read: "text-blue-400 border-blue-500/40",
  viewer: "text-zinc-400 border-zinc-500/40",
};

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = ((session?.user as any)?.role ?? "viewer") as UserRole;
  const isAdmin = role === "admin";

  const links = [
    { href: '/', label: 'Query', icon: Home },
    { href: '/database', label: 'Database', icon: Database },
    { href: '/history', label: 'History', icon: History },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-border px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">QueryGen</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI Query Builder</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            const isAdminLink = href === '/admin'
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 font-medium transition-colors ${
                  isActive
                    ? isAdminLink
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-primary text-primary-foreground'
                    : isAdminLink
                    ? 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User info and logout */}
        <div className="border-t border-border px-6 py-4 space-y-4">
          {session?.user && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Logged in as</p>
                <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user.email}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
