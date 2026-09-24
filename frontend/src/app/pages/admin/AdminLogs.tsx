import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock3, RefreshCw, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type AdminLogsResponse } from '../../services/api';
import { Badge } from '@/shared/ui/status-badge';
import { PaginatedTable } from '@/shared/ui/PaginatedTable';
import { StatCard } from '@/shared/ui/StatCard';

type LogTab = 'requests' | 'audit';

const emptyLogs: AdminLogsResponse = {
  requestSummary: {
    totalRequests: 0,
    failedRequests: 0,
    averageDurationMs: 0,
    uniqueUsers: 0,
    latestRequestAt: null,
  },
  requestLogs: [],
  auditSummary: {
    totalAuditEvents: 0,
    failedAuditEvents: 0,
    uniqueActors: 0,
    latestAuditAt: null,
  },
  auditLogs: [],
};

function formatDate(value: string | null): string {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

function statusVariant(statusCode: number): 'success' | 'warning' | 'error' | 'gray' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warning';
  if (statusCode >= 200 && statusCode < 300) return 'success';
  return 'gray';
}

export function AdminLogs() {
  const [data, setData] = useState<AdminLogsResponse>(emptyLogs);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<LogTab>('requests');

  const load = async () => {
    setLoading(true);
    try {
      setData(await adminApi.getLogs());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admin logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ScrollText className="h-6 w-6 text-gray-700" />
            System Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">Request and audit trails from the backend logging database.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="7d Requests" value={data.requestSummary.totalRequests} icon={Activity} />
        <StatCard title="Failed Requests" value={data.requestSummary.failedRequests} icon={AlertTriangle} iconBg="bg-rose-50" iconColor="text-rose-600" />
        <StatCard title="Avg Latency" value={`${data.requestSummary.averageDurationMs}ms`} icon={Clock3} />
        <StatCard title="Audit Actors" value={data.auditSummary.uniqueActors} icon={Users} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Operational Trail</h2>
            <p className="mt-1 text-xs text-gray-500">
              Latest request: {formatDate(data.requestSummary.latestRequestAt)}
            </p>
          </div>
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['requests', 'audit'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'requests' ? (
          <PaginatedTable
            items={data.requestLogs}
            colSpan={8}
            minWidthClassName="min-w-[1100px]"
            bodyClassName="divide-y divide-gray-100"
            header={(
              <thead className="bg-gray-50">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Time</th>
                  <th className="px-5 py-3 text-left font-medium">Method</th>
                  <th className="px-5 py-3 text-left font-medium">Path</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Duration</th>
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium">IP</th>
                  <th className="px-5 py-3 text-left font-medium">Error</th>
                </tr>
              </thead>
            )}
            emptyRow={<div className="px-5 py-10 text-center text-sm text-gray-400">No request logs found.</div>}
            renderRow={row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">{formatDate(row.createdAt)}</td>
                <td className="px-5 py-3"><Badge variant="gray">{row.method}</Badge></td>
                <td className="max-w-[280px] truncate px-5 py-3 font-mono text-xs text-gray-700" title={row.path}>{row.path}</td>
                <td className="px-5 py-3"><Badge variant={statusVariant(row.statusCode)}>{row.statusCode}</Badge></td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-700">{row.durationMs}ms</td>
                <td className="px-5 py-3 text-gray-500">{row.role ?? 'guest'}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{row.ipAddress ?? 'n/a'}</td>
                <td className="max-w-[240px] truncate px-5 py-3 text-xs text-rose-600" title={row.errorSummary ?? ''}>{row.errorSummary ?? '—'}</td>
              </tr>
            )}
          />
        ) : (
          <PaginatedTable
            items={data.auditLogs}
            colSpan={8}
            minWidthClassName="min-w-[1080px]"
            bodyClassName="divide-y divide-gray-100"
            header={(
              <thead className="bg-gray-50">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Time</th>
                  <th className="px-5 py-3 text-left font-medium">Action</th>
                  <th className="px-5 py-3 text-left font-medium">Resource</th>
                  <th className="px-5 py-3 text-left font-medium">Outcome</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Duration</th>
                  <th className="px-5 py-3 text-left font-medium">Actor</th>
                  <th className="px-5 py-3 text-left font-medium">Target</th>
                </tr>
              </thead>
            )}
            emptyRow={<div className="px-5 py-10 text-center text-sm text-gray-400">No audit logs found.</div>}
            renderRow={row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">{formatDate(row.createdAt)}</td>
                <td className="px-5 py-3"><Badge variant="gray">{row.actionMethod}</Badge></td>
                <td className="max-w-[280px] truncate px-5 py-3 font-mono text-xs text-gray-700" title={row.resourcePath}>{row.resourcePath}</td>
                <td className="px-5 py-3">
                  <Badge variant={row.outcome === 'success' ? 'success' : 'error'}>
                    {row.outcome}
                  </Badge>
                </td>
                <td className="px-5 py-3"><Badge variant={statusVariant(row.statusCode)}>{row.statusCode}</Badge></td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-700">{row.durationMs}ms</td>
                <td className="px-5 py-3 text-gray-500">{row.actorRole ?? 'guest'}</td>
                <td className="max-w-[180px] truncate px-5 py-3 font-mono text-xs text-gray-500">{row.targetId ?? '—'}</td>
              </tr>
            )}
          />
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-500">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <ShieldCheck className="h-4 w-4" />
          Log retention is still handled by the scheduled backend cron job.
        </div>
      </div>
    </div>
  );
}
