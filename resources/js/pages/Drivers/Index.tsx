import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Driver {
    id: number;
    name: string;
    license_number?: string;
    phone?: string;
    notes?: string;
    user_id?: number;
    is_active: boolean;
    trips_count?: number;
    average_score?: number | null;
    total_distance?: number;
}

interface DriverForm {
    name: string;
    license_number: string;
    phone: string;
    notes: string;
    user_id: string;
}

const EMPTY_FORM: DriverForm = { name: '', license_number: '', phone: '', notes: '', user_id: '' };

function ScoreBadge({ score }: { score?: number | null }) {
    if (score == null) return <span className="text-xs text-gray-400">No trips</span>;
    const cls = score >= 80
        ? 'bg-green-100 text-green-700'
        : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}/100</span>;
}

export default function DriversIndex() {
    const { currentOrganization } = useAuth();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Driver | null>(null);
    const [form, setForm] = useState<DriverForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (currentOrganization) fetchDrivers(); }, [currentOrganization]);

    const fetchDrivers = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/drivers`);
            setDrivers(data.data || data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
    const openEdit = (d: Driver) => {
        setEditing(d);
        setForm({ name: d.name, license_number: d.license_number || '', phone: d.phone || '', notes: d.notes || '', user_id: d.user_id ? String(d.user_id) : '' });
        setShowModal(true);
    };

    const save = async () => {
        if (!currentOrganization || !form.name.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, user_id: form.user_id ? parseInt(form.user_id) : undefined };
            if (editing) {
                await api.put(`/organizations/${currentOrganization.id}/drivers/${editing.id}`, payload);
            } else {
                await api.post(`/organizations/${currentOrganization.id}/drivers`, payload);
            }
            setShowModal(false);
            fetchDrivers();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const deleteDriver = async (id: number) => {
        if (!currentOrganization || !confirm('Delete this driver? This cannot be undone.')) return;
        try {
            await api.delete(`/organizations/${currentOrganization.id}/drivers/${id}`);
            setDrivers(prev => prev.filter(d => d.id !== id));
        } catch (e) { console.error(e); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
                <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    + Add Driver
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drivers.map(driver => (
                        <div key={driver.id} className="bg-white rounded-lg shadow p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">{driver.name}</h3>
                                    {driver.license_number && <p className="text-xs text-gray-500 mt-0.5">Licence: {driver.license_number}</p>}
                                    {driver.phone && <p className="text-xs text-gray-500">{driver.phone}</p>}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${driver.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {driver.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                <div className="bg-gray-50 rounded p-2">
                                    <div className="text-sm font-bold text-gray-800">{driver.trips_count ?? '—'}</div>
                                    <div className="text-xs text-gray-500">Trips</div>
                                </div>
                                <div className="bg-gray-50 rounded p-2 flex flex-col items-center justify-center">
                                    <ScoreBadge score={driver.average_score} />
                                    <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
                                </div>
                                <div className="bg-gray-50 rounded p-2">
                                    <div className="text-sm font-bold text-gray-800">
                                        {driver.total_distance != null ? `${parseFloat(String(driver.total_distance)).toFixed(0)} km` : '—'}
                                    </div>
                                    <div className="text-xs text-gray-500">Total</div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Link to={`/drivers/${driver.id}`}
                                    className="flex-1 text-center px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                                    View
                                </Link>
                                <button onClick={() => openEdit(driver)}
                                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium">
                                    Edit
                                </button>
                                <button onClick={() => deleteDriver(driver.id)}
                                    className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {!loading && drivers.length === 0 && (
                        <div className="col-span-3 text-center py-12 text-gray-400">No drivers found. Add your first driver.</div>
                    )}
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">{editing ? 'Edit Driver' : 'Add Driver'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Full name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Licence Number</label>
                                <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="DL123456" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+44..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Linked User ID</label>
                                <input type="number" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={save} disabled={saving || !form.name.trim()}
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
