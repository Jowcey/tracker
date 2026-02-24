import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface AuditLog {
    id: number;
    user?: { id: number; name: string; email: string };
    event: string;
    auditable_type?: string;
    description?: string;
    ip_address?: string;
    created_at: string;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

export default function AuditLogIndex() {
    const { currentOrganization } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ event: '', user: '', dateFrom: '', dateTo: '' });

    useEffect(() => { if (currentOrganization) fetchLogs(); }, [currentOrganization, page, filters]);

    const fetchLogs = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page };
            if (filters.event) params.event = filters.event;
            if (filters.user) params.user = filters.user;
            if (filters.dateFrom) params.from = filters.dateFrom;
            if (filters.dateTo) params.to = filters.dateTo;

            const { data } = await api.get(`/organizations/${currentOrganization.id}/audit-logs`, { params });
            setLogs(data.data || []);
            setMeta({
                current_page: data.current_page,
                last_page: data.last_page,
                total: data.total,
                per_page: data.per_page,
            });
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const applyFilters = (newFilters: typeof filters) => {
        setFilters(newFilters);
        setPage(1);
    };

    const modelLabel = (type?: string) => {
        if (!type) return '—';
        return type.split('\\').pop() || type;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
                {meta && <span className="text-sm text-gray-500">{meta.total} entries</span>}
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Filter by event…"
                        value={filters.event}
                        onChange={e => applyFilters({ ...filters, event: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                    />
                    <input
                        type="text"
                        placeholder="Filter by user…"
                        value={filters.user}
                        onChange={e => applyFilters({ ...filters, user: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={e => applyFilters({ ...filters, dateFrom: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={e => applyFilters({ ...filters, dateTo: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {(filters.event || filters.user || filters.dateFrom || filters.dateTo) && (
                        <button onClick={() => applyFilters({ event: '', user: '', dateFrom: '', dateTo: '' })}
                            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No audit log entries found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Timestamp</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {log.user ? (
                                                <div>
                                                    <div className="font-medium">{log.user.name}</div>
                                                    <div className="text-xs text-gray-400">{log.user.email}</div>
                                                </div>
                                            ) : <span className="text-gray-400">System</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                                {log.event}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{modelLabel(log.auditable_type)}</td>
                                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={log.description}>
                                            {log.description || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Page {meta.current_page} of {meta.last_page} ({meta.total} entries)
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={meta.current_page <= 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                                disabled={meta.current_page >= meta.last_page}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
