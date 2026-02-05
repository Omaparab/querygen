'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Database, History, Settings, BarChart3 } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Query', icon: Home },
    { href: '/database', label: 'Database', icon: Database },
    { href: '/history', label: 'History', icon: History },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
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
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
