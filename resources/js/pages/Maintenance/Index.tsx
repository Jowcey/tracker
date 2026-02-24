import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Vehicle { id: number; name: string; }
interface Reminder {
    id: number; vehicle_id: number; type: string; description: string;
    due_at_km?: number; due_at_date?: string;
    last_serviced_at_km?: number; last_serviced_at_date?: string;
    is_resolved: boolean; resolved_at?: string;
    vehicle?: Vehicle;
}

const TYPE_LABELS: Record<string, string> = {
    oil_change: '🛢️ Oil Change', tyre_rotation: '🔄 Tyre Rotation',
    service: '🔧 Service', inspection: '📋 Inspection', custom: '⚙️ Custom',
};

const DEFAULT_FORM = { vehicle_id: '', type: 'service', description: '', due_at_km: '', due_at_date: '', last_serviced_at_km: '' };

export default function MaintenanceIndex() {
    const { currentOrganization } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [odometers, setOdometers] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...DEFAULT_FORM });
    const [saving, setSaving] = useState(false);
    const [showResolved, setShowResolved] = useState(false);

    const fetchData = useCallback(async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const [mainRes, vehRes] = await Promise.all([
                api.get(`/organizations/${currentOrganization.id}/maintenance`),
                api.get(`/organizations/${currentOrganization.id}/vehicles`),
            ]);
            setReminders(mainRes.data.data || []);
            setOdometers(mainRes.data.vehicle_odometers || {});
            setVehicles(vehRes.data.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [currentOrganization]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrganization) return;
        setSaving(true);
        try {
            await api.post(`/organizations/${currentOrganization.id}/maintenance`, {
                vehicle_id: parseInt(form.vehicle_id),
                type: form.type,
                description: form.description,
                due_at_km: form.due_at_km ? parseInt(form.due_at_km) : null,
                due_at_date: form.due_at_date || null,
                last_serviced_at_km: form.last_serviced_at_km ? parseInt(form.last_serviced_at_km) : null,
            });
            setShowForm(false);
            setForm({ ...DEFAULT_FORM });
            fetchData();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const resolve = async (id: number) => {
        if (!currentOrganization) return;
        await api.patch(`/organizations/${currentOrganization.id}/maintenance/${id}`, { is_resolved: true });
        fetchData();
    };

    const deleteReminder = async (id: number) => {
        if (!currentOrganization || !confirm('Delete this reminder?')) return;
        await api.delete(`/organizations/${currentOrganization.id}/maintenance/${id}`);
        fetchData();
    };

    const visible = reminders.filter(r => showResolved ? r.is_resolved : !r.is_resolved);

    const isOverdue = (r: Reminder): boolean => {
        const odometer = odometers[r.vehicle_id] || 0;
        if (r.due_at_km && odometer >= r.due_at_km) return true;
        if (r.due_at_date && new Date(r.due_at_date) < new Date()) return true;
        return false;
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track service reminders and maintenance schedules</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowResolved(s => !s)}
                        className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2">
                        {showResolved ? 'Show pending' : 'Show resolved'}
                    </button>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                        <span>＋</span> Add Reminder
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
            ) : visible.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-4xl mb-3">🔧</p>
                    <p className="text-gray-500">{showResolved ? 'No resolved reminders.' : 'No pending maintenance reminders.'}</p>
                    {!showResolved && <button onClick={() => setShowForm(true)} className="mt-4 text-blue-600 hover:underline text-sm">Add your first reminder →</button>}
                </div>
            ) : (
                <div className="space-y-3">
                    {visible.map(r => {
                        const overdue = !r.is_resolved && isOverdue(r);
                        const odo = odometers[r.vehicle_id] || 0;
                        return (
                            <div key={r.id} className={`bg-white rounded-lg border p-4 flex items-start gap-4 ${overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                                <div className="text-2xl mt-0.5">{TYPE_LABELS[r.type]?.split(' ')[0] || '⚙️'}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900 text-sm">{r.description}</span>
                                        {overdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>}
                                        {r.is_resolved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Resolved</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{r.vehicle?.name} · {TYPE_LABELS[r.type] || r.type}</p>
                                    <div className="mt-1.5 text-xs text-gray-500 space-x-3">
                                        {r.due_at_km && <span>Due at: <strong>{r.due_at_km.toLocaleString()} km</strong> (now: {odo.toLocaleString()} km)</span>}
                                        {r.due_at_date && <span>Due by: <strong>{new Date(r.due_at_date).toLocaleDateString()}</strong></span>}
                                    </div>
                                </div>
                                {!r.is_resolved && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => resolve(r.id)} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">✓ Done</button>
                                        <button onClick={() => deleteReminder(r.id)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">✕</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Add Maintenance Reminder</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select vehicle…</option>
                                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                                    placeholder="e.g. Oil & filter change"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due at km</label>
                                    <input type="number" value={form.due_at_km} onChange={e => setForm(f => ({ ...f, due_at_km: e.target.value }))}
                                        placeholder="e.g. 10000"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due by date</label>
                                    <input type="date" value={form.due_at_date} onChange={e => setForm(f => ({ ...f, due_at_date: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current odometer km</label>
                                <input type="number" value={form.last_serviced_at_km} onChange={e => setForm(f => ({ ...f, last_serviced_at_km: e.target.value }))}
                                    placeholder="Optional"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving…' : 'Add Reminder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
