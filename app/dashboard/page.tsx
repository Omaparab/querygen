'use client'

import { Sidebar } from '@/components/sidebar'
import { Activity, TrendingUp, Zap, Target } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const STATS = [
  {
    label: 'Total Queries',
    value: '1,247',
    icon: Activity,
    change: '+12% from last week',
  },
  {
    label: 'Success Rate',
    value: '98.5%',
    icon: TrendingUp,
    change: '+2.3% from last week',
  },
  {
    label: 'Avg Response Time',
    value: '240ms',
    icon: Zap,
    change: '-15ms from last week',
  },
  {
    label: 'Model Accuracy',
    value: '96.8%',
    icon: Target,
    change: '+1.2% from last week',
  },
]

const PERFORMANCE_DATA = [
  { period: 'Mon', queries: 180, accuracy: 95 },
  { period: 'Tue', queries: 220, accuracy: 96 },
  { period: 'Wed', queries: 200, accuracy: 97 },
  { period: 'Thu', queries: 250, accuracy: 96.5 },
  { period: 'Fri', queries: 280, accuracy: 98 },
  { period: 'Sat', queries: 150, accuracy: 98.2 },
  { period: 'Sun', queries: 167, queries: 97.8 },
]

const RECENT_LOGS = [
  {
    id: 1,
    timestamp: '2024-02-05 14:32:45',
    query_type: 'SELECT',
    status: 'success',
    time: '142ms',
  },
  {
    id: 2,
    timestamp: '2024-02-05 14:31:12',
    query_type: 'JOIN',
    status: 'success',
    time: '387ms',
  },
  {
    id: 3,
    timestamp: '2024-02-05 14:29:58',
    query_type: 'UPDATE',
    status: 'success',
    time: '98ms',
  },
  {
    id: 4,
    timestamp: '2024-02-05 14:28:33',
    query_type: 'AGGREGATE',
    status: 'success',
    time: '265ms',
  },
  {
    id: 5,
    timestamp: '2024-02-05 14:27:01',
    query_type: 'SELECT',
    status: 'error',
    time: '45ms',
  },
]

export default function Dashboard() {
  const { isLoading } = useAuth()

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

      <main className="ml-64 flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border bg-background px-8 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor your model performance and query statistics
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="border border-border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {stat.change}
                      </p>
                    </div>
                    <Icon size={32} className="text-muted-foreground" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Performance Chart */}
          <div className="mb-8 border border-border p-6">
            <h2 className="mb-6 text-xl font-bold">Weekly Performance</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Queries Generated</h3>
                <div className="flex items-end gap-2 h-48">
                  {PERFORMANCE_DATA.map((data) => (
                    <div key={data.period} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full justify-center">
                        <div
                          className="w-full border border-foreground"
                          style={{ height: `${(data.queries / 300) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs">{data.period}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Logs */}
          <div className="border border-border">
            <div className="border-b border-border bg-secondary px-6 py-4">
              <h2 className="font-bold">Recent Query Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left font-semibold">Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">
                      Response Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_LOGS.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="px-6 py-3">{log.timestamp}</td>
                      <td className="px-6 py-3">
                        <span className="border border-border px-2 py-1 text-xs font-mono">
                          {log.query_type}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium ${
                            log.status === 'success'
                              ? 'border border-green-600 text-green-600'
                              : 'border border-red-600 text-red-600'
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
