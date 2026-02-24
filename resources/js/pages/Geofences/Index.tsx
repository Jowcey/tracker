import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Geofence {
    id: number;
    name: string;
    description?: string;
    type: 'circle' | 'polygon';
    center_latitude?: number;
    center_longitude?: number;
    radius?: number;
    coordinates?: number[][];
    color: string;
    is_active: boolean;
}

interface GeofenceForm {
    name: string;
    description: string;
    type: 'circle' | 'polygon';
    center_latitude: string;
    center_longitude: string;
    radius: string;
    color: string;
    is_active: boolean;
}

const DEFAULT_FORM: GeofenceForm = {
    name: '', description: '', type: 'circle',
    center_latitude: '', center_longitude: '', radius: '500',
    color: '#3b82f6', is_active: true,
};

export default function GeofencesIndex() {
    const { currentOrganization } = useAuth();
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Geofence | null>(null);
    const [form, setForm] = useState<GeofenceForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const fetchGeofences = useCallback(async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/geofences`);
            setGeofences(data.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [currentOrganization]);

    useEffect(() => { fetchGeofences(); }, [fetchGeofences]);

    const openCreate = () => { setEditing(null); setForm(DEFAULT_FORM); setShowForm(true); };
    const openEdit = (g: Geofence) => {
        setEditing(g);
        setForm({
            name: g.name, description: g.description || '',
            type: g.type,
            center_latitude: g.center_latitude?.toString() || '',
            center_longitude: g.center_longitude?.toString() || '',
            radius: g.radius?.toString() || '500',
            color: g.color, is_active: g.is_active,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrganization) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name, description: form.description || null,
                type: form.type, color: form.color, is_active: form.is_active,
            };
            if (form.type === 'circle') {
                payload.center_latitude = parseFloat(form.center_latitude);
                payload.center_longitude = parseFloat(form.center_longitude);
                payload.radius = parseInt(form.radius);
            }
            if (editing) {
                await api.put(`/organizations/${currentOrganization.id}/geofences/${editing.id}`, payload);
            } else {
                await api.post(`/organizations/${currentOrganization.id}/geofences`, payload);
            }
            setShowForm(false);
            fetchGeofences();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!currentOrganization || !confirm('Delete this geofence?')) return;
        await api.delete(`/organizations/${currentOrganization.id}/geofences/${id}`);
        fetchGeofences();
    };

    const toggleActive = async (g: Geofence) => {
        if (!currentOrganization) return;
        await api.put(`/organizations/${currentOrganization.id}/geofences/${g.id}`, { is_active: !g.is_active });
        fetchGeofences();
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Geofences</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Define zones to trigger alerts when vehicles enter or exit</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                    <span>＋</span> New Geofence
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
            ) : geofences.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-4xl mb-3">🗺️</p>
                    <p className="text-gray-500">No geofences yet. Create one to start receiving alerts.</p>
                    <button onClick={openCreate} className="mt-4 text-blue-600 hover:underline text-sm">Create your first geofence →</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {geofences.map(g => (
                        <div key={g.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                                    <h3 className="font-semibold text-gray-900 text-sm">{g.name}</h3>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {g.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                            <div className="text-xs text-gray-500 space-y-0.5">
                                <div>Type: <span className="capitalize font-medium text-gray-700">{g.type}</span></div>
                                {g.type === 'circle' && g.radius && (
                                    <div>Radius: <span className="font-medium text-gray-700">{g.radius >= 1000 ? `${(g.radius/1000).toFixed(1)} km` : `${g.radius} m`}</span></div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                                <button onClick={() => toggleActive(g)} className="flex-1 text-xs py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                                    {g.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => openEdit(g)} className="flex-1 text-xs py-1.5 rounded border border-blue-200 hover:bg-blue-50 text-blue-600">
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(g.id)} className="flex-1 text-xs py-1.5 rounded border border-red-200 hover:bg-red-50 text-red-600">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Geofence' : 'New Geofence'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'circle' | 'polygon' }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="circle">Circle</option>
                                    <option value="polygon">Polygon (coordinates)</option>
                                </select>
                            </div>
                            {form.type === 'circle' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
                                            <input type="number" step="any" value={form.center_latitude} onChange={e => setForm(f => ({ ...f, center_latitude: e.target.value }))} required
                                                placeholder="e.g. 40.7128"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
                                            <input type="number" step="any" value={form.center_longitude} onChange={e => setForm(f => ({ ...f, center_longitude: e.target.value }))} required
                                                placeholder="e.g. -74.006"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Radius (metres) *</label>
                                        <input type="number" min="50" max="50000" value={form.radius} onChange={e => setForm(f => ({ ...f, radius: e.target.value }))} required
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
                                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer" />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                            className="rounded border-gray-300" />
                                        <span className="text-sm font-medium text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
