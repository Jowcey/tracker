import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Document {
    id: number;
    vehicle_id: number;
    type: string;
    title: string;
    issued_date?: string | null;
    expiry_date?: string | null;
    file_url?: string | null;
    notes?: string | null;
    status?: 'expired' | 'expiring_soon' | 'valid' | 'no_expiry';
    days_until_expiry?: number | null;
    vehicle?: { id: number; name: string };
}

interface Vehicle {
    id: number;
    name: string;
}

interface DocumentForm {
    vehicle_id: number | '';
    type: string;
    title: string;
    issued_date: string;
    expiry_date: string;
    file_url: string;
    notes: string;
}

const DEFAULT_FORM: DocumentForm = {
    vehicle_id: '', type: 'mot', title: '',
    issued_date: '', expiry_date: '', file_url: '', notes: '',
};

const TYPE_LABELS: Record<string, string> = {
    mot: 'MOT', insurance: 'Insurance', registration: 'Registration',
    service: 'Service', tax: 'Tax', other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
    mot: 'bg-blue-100 text-blue-700',
    insurance: 'bg-green-100 text-green-700',
    registration: 'bg-purple-100 text-purple-700',
    service: 'bg-orange-100 text-orange-700',
    tax: 'bg-teal-100 text-teal-700',
    other: 'bg-gray-100 text-gray-600',
};

function computeStatus(doc: Document): { label: string; className: string } {
    const status = doc.status;
    const days = doc.days_until_expiry;

    if (status === 'expired' || (doc.expiry_date && days != null && days < 0)) {
        const ago = days != null ? Math.abs(days) : '?';
        return { label: `Expired ${ago} day(s) ago`, className: 'bg-red-100 text-red-700' };
    }
    if (status === 'expiring_soon' || (doc.expiry_date && days != null && days <= 30 && days >= 0)) {
        return { label: `Expires in ${days} day(s)`, className: 'bg-amber-100 text-amber-700' };
    }
    if (doc.expiry_date) {
        const formatted = new Date(doc.expiry_date).toLocaleDateString();
        return { label: `Valid until ${formatted}`, className: 'bg-green-100 text-green-700' };
    }
    return { label: 'No expiry', className: 'bg-gray-100 text-gray-500' };
}

export default function DocumentsIndex() {
    const { currentOrganization } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [vehicleFilter, setVehicleFilter] = useState<number | ''>('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Document | null>(null);
    const [form, setForm] = useState<DocumentForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const params: Record<string, unknown> = {};
            if (vehicleFilter) params.vehicle_id = vehicleFilter;
            const { data } = await api.get(`/organizations/${currentOrganization.id}/documents`, { params });
            setDocuments(data.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [currentOrganization, vehicleFilter]);

    const fetchVehicles = useCallback(async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles`);
            setVehicles(data.data || []);
        } catch (e) { console.error(e); }
    }, [currentOrganization]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);
    useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

    const openCreate = () => { setEditing(null); setForm(DEFAULT_FORM); setShowForm(true); };
    const openEdit = (doc: Document) => {
        setEditing(doc);
        setForm({
            vehicle_id: doc.vehicle_id,
            type: doc.type,
            title: doc.title,
            issued_date: doc.issued_date || '',
            expiry_date: doc.expiry_date || '',
            file_url: doc.file_url || '',
            notes: doc.notes || '',
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrganization) return;
        setSaving(true);
        try {
            const payload = {
                vehicle_id: form.vehicle_id || undefined,
                type: form.type,
                title: form.title,
                issued_date: form.issued_date || null,
                expiry_date: form.expiry_date || null,
                file_url: form.file_url || null,
                notes: form.notes || null,
            };
            if (editing) {
                await api.put(`/organizations/${currentOrganization.id}/documents/${editing.id}`, payload);
            } else {
                await api.post(`/organizations/${currentOrganization.id}/documents`, payload);
            }
            setShowForm(false);
            fetchDocuments();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!currentOrganization || !confirm('Delete this document?')) return;
        await api.delete(`/organizations/${currentOrganization.id}/documents/${id}`);
        fetchDocuments();
    };

    // Group by vehicle name
    const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
        const key = doc.vehicle?.name || `Vehicle #${doc.vehicle_id}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(doc);
        return acc;
    }, {});

    const attentionCount = documents.filter(d => d.status === 'expired' || d.status === 'expiring_soon' ||
        (d.expiry_date && d.days_until_expiry != null && d.days_until_expiry <= 30)).length;

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage vehicle documents, MOTs, insurance and more</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                    <span>＋</span> Add Document
                </button>
            </div>

            {/* Attention banner */}
            {attentionCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
                    <span>⚠️</span>
                    <span><strong>{attentionCount} document(s)</strong> require attention</span>
                </div>
            )}

            {/* Vehicle filter */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Filter by vehicle:</label>
                <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value ? parseInt(e.target.value) : '')}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All vehicles</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
            ) : documents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-4xl mb-3">📄</p>
                    <p className="text-gray-500">No documents found. Add one to start tracking.</p>
                    <button onClick={openCreate} className="mt-4 text-blue-600 hover:underline text-sm">Add your first document →</button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([vehicleName, docs]) => (
                        <div key={vehicleName}>
                            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <span>🚗</span> {vehicleName}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {docs.map(doc => {
                                    const statusInfo = computeStatus(doc);
                                    return (
                                        <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">{doc.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}>
                                                    {TYPE_LABELS[doc.type] || doc.type}
                                                </span>
                                            </div>

                                            <div className="text-xs text-gray-500 space-y-1">
                                                {doc.issued_date && (
                                                    <div>Issued: <span className="text-gray-700">{new Date(doc.issued_date).toLocaleDateString()}</span></div>
                                                )}
                                                <div>
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {doc.notes && <p className="text-xs text-gray-400 italic">{doc.notes}</p>}

                                            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 flex-wrap">
                                                {doc.file_url && (
                                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mr-auto">
                                                        📎 View Document
                                                    </a>
                                                )}
                                                <button onClick={() => openEdit(doc)}
                                                    className="text-xs py-1 px-3 rounded border border-blue-200 hover:bg-blue-50 text-blue-600">
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)}
                                                    className="text-xs py-1 px-3 rounded border border-red-200 hover:bg-red-50 text-red-600">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Document' : 'Add Document'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value ? parseInt(e.target.value) : '' }))}
                                    required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select vehicle…</option>
                                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="mot">MOT</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="registration">Registration</option>
                                    <option value="service">Service</option>
                                    <option value="tax">Tax</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                                    placeholder="e.g. MOT Certificate 2025"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                                    <input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                    <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                                <input type="url" value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                                    placeholder="https://…"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
