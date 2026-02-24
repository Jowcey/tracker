import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Vehicle {
    id: number;
    name: string;
}

interface FuelLog {
    id: number;
    vehicle_id: number;
    filled_at: string;
    litres: number;
    cost_per_litre: number;
    total_cost: number;
    odometer_km?: number;
    full_tank: boolean;
    station?: string;
    notes?: string;
}

interface FuelSummary {
    total_litres: number;
    total_cost: number;
    avg_consumption: number;
    cost_per_km: number;
}

interface FuelForm {
    filled_at: string;
    litres: string;
    cost_per_litre: string;
    odometer_km: string;
    full_tank: boolean;
    station: string;
    notes: string;
}

const EMPTY_FORM: FuelForm = {
    filled_at: new Date().toISOString().slice(0, 16),
    litres: '',
    cost_per_litre: '',
    odometer_km: '',
    full_tank: true,
    station: '',
    notes: '',
};

export default function FuelIndex() {
    const { currentOrganization } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [logs, setLogs] = useState<FuelLog[]>([]);
    const [summary, setSummary] = useState<FuelSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<FuelForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentOrganization) fetchVehicles();
    }, [currentOrganization]);

    useEffect(() => {
        if (selectedVehicleId) {
            fetchLogs();
            fetchSummary();
        } else {
            setLogs([]);
            setSummary(null);
        }
    }, [selectedVehicleId]);

    const fetchVehicles = async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles`);
            setVehicles(data.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchLogs = async () => {
        if (!currentOrganization || !selectedVehicleId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles/${selectedVehicleId}/fuel-logs`);
            setLogs(data.data || data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchSummary = async () => {
        if (!currentOrganization || !selectedVehicleId) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles/${selectedVehicleId}/fuel-summary`);
            setSummary(data);
        } catch (e) { console.error(e); }
    };

    const save = async () => {
        if (!currentOrganization || !selectedVehicleId) return;
        setSaving(true);
        try {
            await api.post(`/organizations/${currentOrganization.id}/vehicles/${selectedVehicleId}/fuel-logs`, {
                filled_at: form.filled_at,
                litres: parseFloat(form.litres),
                cost_per_litre: parseFloat(form.cost_per_litre),
                odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : undefined,
                full_tank: form.full_tank,
                station: form.station || undefined,
                notes: form.notes || undefined,
            });
            setShowModal(false);
            setForm(EMPTY_FORM);
            fetchLogs();
            fetchSummary();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const deleteLog = async (id: number) => {
        if (!currentOrganization || !selectedVehicleId || !confirm('Delete this fuel log?')) return;
        try {
            await api.delete(`/organizations/${currentOrganization.id}/vehicles/${selectedVehicleId}/fuel-logs/${id}`);
            setLogs(prev => prev.filter(l => l.id !== id));
            fetchSummary();
        } catch (e) { console.error(e); }
    };

    const fmt = (n: number | undefined | null, dec = 2) =>
        n != null ? parseFloat(String(n)).toFixed(dec) : '—';

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Fuel Logs</h1>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedVehicleId || ''}
                        onChange={e => setSelectedVehicleId(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select vehicle…</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    {selectedVehicleId && (
                        <button onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                            + Add Fill-up
                        </button>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-blue-600">{fmt(summary.total_litres, 1)} L</div>
                        <div className="text-sm text-gray-500 mt-1">Total Litres</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">£{fmt(summary.total_cost)}</div>
                        <div className="text-sm text-gray-500 mt-1">Total Cost</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-orange-500">{fmt(summary.avg_consumption, 1)}</div>
                        <div className="text-sm text-gray-500 mt-1">Avg L/100km</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-purple-600">£{fmt(summary.cost_per_km, 3)}</div>
                        <div className="text-sm text-gray-500 mt-1">Cost per km</div>
                    </div>
                </div>
            )}

            {/* Fuel log table */}
            {!selectedVehicleId ? (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                    Select a vehicle to view fuel logs.
                </div>
            ) : loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow">
                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No fuel logs found. Add your first fill-up.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Litres</th>
                                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">£/L</th>
                                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Odometer</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Station</th>
                                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Full Tank</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-700">
                                                {new Date(log.filled_at).toLocaleDateString()}{' '}
                                                <span className="text-xs text-gray-400">
                                                    {new Date(log.filled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">{fmt(log.litres, 1)} L</td>
                                            <td className="px-4 py-3 text-right text-gray-700">£{fmt(log.cost_per_litre, 3)}</td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900">£{fmt(log.total_cost)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">
                                                {log.odometer_km ? `${fmt(log.odometer_km, 0)} km` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{log.station || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {log.full_tank
                                                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Full</span>
                                                    : <span className="text-xs text-gray-400">Partial</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => deleteLog(log.id)}
                                                    className="text-xs text-red-400 hover:text-red-600">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add Fill-up Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
                            <h2 className="text-lg font-semibold">Add Fill-up</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                <input type="datetime-local" value={form.filled_at} onChange={e => setForm(f => ({ ...f, filled_at: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Litres</label>
                                    <input type="number" step="0.01" value={form.litres} onChange={e => setForm(f => ({ ...f, litres: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="50.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">£ per Litre</label>
                                    <input type="number" step="0.001" value={form.cost_per_litre} onChange={e => setForm(f => ({ ...f, cost_per_litre: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="1.500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
                                <input type="number" value={form.odometer_km} onChange={e => setForm(f => ({ ...f, odometer_km: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                                <input value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="BP, Shell, etc." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.full_tank} onChange={e => setForm(f => ({ ...f, full_tank: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-700">Full tank</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={save} disabled={saving || !form.litres || !form.cost_per_litre}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
