'use client'

import { Sidebar } from '@/components/sidebar'
import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function Settings() {
  const { isLoading } = useAuth()
  const [theme, setTheme] = useState('dark')
  const [apiKey, setApiKey] = useState('***')
  const [autoSave, setAutoSave] = useState(true)
  const [notifications, setNotifications] = useState(true)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Customize your QueryGen experience
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="max-w-2xl space-y-6">
            {/* Theme */}
            <div className="border border-border p-6">
              <h2 className="mb-2 text-lg font-bold">Theme</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose your preferred color theme
              </p>
              <div className="flex gap-3">
                {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`border px-4 py-2 capitalize transition-colors ${
                      theme === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* API Configuration */}
            <div className="border border-border p-6">
              <h2 className="mb-2 text-lg font-bold">API Configuration</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Manage your API settings and credentials
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    readOnly
                    className="mt-2 w-full border border-border bg-input px-4 py-2"
                  />
                </div>
                <button className="border border-primary bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
                  Regenerate Key
                </button>
              </div>
            </div>

            {/* Behavior */}
            <div className="border border-border p-6">
              <h2 className="mb-2 text-lg font-bold">Behavior</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Configure how QueryGen behaves
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-save queries</label>
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`h-6 w-11 border transition-colors ${
                      autoSave
                        ? 'border-primary bg-primary'
                        : 'border-border bg-secondary'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 transition-transform ${
                        autoSave ? 'translate-x-5' : 'translate-x-1'
                      } border border-current`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Notifications</label>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`h-6 w-11 border transition-colors ${
                      notifications
                        ? 'border-primary bg-primary'
                        : 'border-border bg-secondary'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 transition-transform ${
                        notifications ? 'translate-x-5' : 'translate-x-1'
                      } border border-current`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-600 p-6">
              <h2 className="mb-2 text-lg font-bold text-red-600">Danger Zone</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Irreversible actions
              </p>
              <button className="border border-red-600 px-4 py-2 text-red-600 hover:bg-red-600/10">
                Clear All Query History
              </button>
            </div>

            {/* About */}
            <div className="border border-border p-6">
              <h2 className="mb-2 text-lg font-bold">About</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>QueryGen v1.0.0</p>
                <p>AI-powered MySQL Query Generator</p>
                <p className="mt-4">
                  Built with{' '}
                  <span className="font-semibold text-foreground">
                    Next.js, React, and TensorFlow
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
