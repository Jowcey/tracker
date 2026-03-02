import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

interface OrgMember {
    id: number;
    name: string;
    email: string;
    pivot: { role: string; created_at: string };
}

interface Org {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    timezone: string;
    locale: string;
    settings: { speed_unit?: 'mph' | 'kmh' } | null;
    is_active: boolean;
    users_count: number;
    vehicles_count: number;
    trackers_count: number;
    trips_count: number;
    created_at: string;
    deleted_at: string | null;
    users?: OrgMember[];
}

interface PaginatedOrgs { data: Org[]; total: number; current_page: number; last_page: number; }

const ROLES = ['owner', 'admin', 'manager', 'viewer'] as const;
const TIMEZONES = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Toronto', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata',
    'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];
const LOCALES = [
    { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' }, { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' }, { value: 'nl', label: 'Dutch' },
    { value: 'it', label: 'Italian' }, { value: 'pl', label: 'Polish' },
];

function OrgEditPanel({ org, onClose, onSaved }: { org: Org; onClose: () => void; onSaved: (o: Org) => void }) {
    const [form, setForm] = useState({
        name: org.name,
        slug: org.slug,
        description: org.description ?? '',
        timezone: org.timezone ?? 'UTC',
        locale: org.locale ?? 'en',
        speed_unit: org.settings?.speed_unit ?? 'mph',
        is_active: org.is_active,
    });
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState<OrgMember[]>(org.users ?? []);
    const [loadingMembers, setLoadingMembers] = useState(!org.users);
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<string>('viewer');
    const [searchResult, setSearchResult] = useState<{ id: number; name: string; email: string } | null>(null);
    const [searching, setSearching] = useState(false);
    const [tab, setTab] = useState<'details' | 'members'>('details');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmForce, setConfirmForce] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    useEffect(() => {
        if (!org.users) {
            api.get(`/admin/organizations/${org.id}/users`)
                .then(({ data }) => setMembers(data))
                .finally(() => setLoadingMembers(false));
        }
    }, [org.id]);

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await api.patch(`/admin/organizations/${org.id}`, {
                ...form,
                settings: { speed_unit: form.speed_unit },
            });
            toast.success('Organization saved');
            onSaved(data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleRoleChange = async (userId: number, role: string) => {
        try {
            await api.patch(`/admin/organizations/${org.id}/users/${userId}/role`, { role });
            setMembers(m => m.map(u => u.id === userId ? { ...u, pivot: { ...u.pivot, role } } : u));
            toast.success('Role updated');
        } catch {
            toast.error('Failed to update role');
        }
    };

    const handleRemoveMember = async (userId: number, name: string) => {
        if (!confirm(`Remove ${name} from this organization?`)) return;
        try {
            await api.delete(`/admin/organizations/${org.id}/users/${userId}`);
            setMembers(m => m.filter(u => u.id !== userId));
            toast.success(`${name} removed`);
        } catch {
            toast.error('Failed to remove member');
        }
    };

    const handleSearchUser = async () => {
        if (!addEmail) return;
        setSearching(true);
        setSearchResult(null);
        try {
            const { data } = await api.get('/admin/organizations/search-users', { params: { email: addEmail } });
            if (members.find(m => m.id === data.id)) {
                toast.error('User is already a member');
            } else {
                setSearchResult(data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'User not found');
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async () => {
        if (!searchResult) return;
        try {
            await api.post(`/admin/organizations/${org.id}/users`, { user_id: searchResult.id, role: addRole });
            const { data } = await api.get(`/admin/organizations/${org.id}/users`);
            setMembers(data);
            setSearchResult(null);
            setAddEmail('');
            toast.success(`${searchResult.name} added as ${addRole}`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to add user');
        }
    };

    const handleSoftDelete = async () => {
        try {
            await api.delete(`/admin/organizations/${org.id}/soft`);
            toast.success('Organization suspended');
            onSaved({ ...org, deleted_at: new Date().toISOString(), is_active: false });
            setConfirmDelete(false);
            onClose();
        } catch {
            toast.error('Failed to suspend');
        }
    };

    const handleForceDelete = async () => {
        if (confirmText !== org.name) return;
        try {
            await api.delete(`/admin/organizations/${org.id}/force`);
            toast.success('Organization permanently deleted');
            setConfirmForce(false);
            onClose();
            onSaved({ ...org, deleted_at: 'deleted' });
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleRestore = async () => {
        try {
            const { data } = await api.post(`/admin/organizations/${org.id}/restore`);
            toast.success('Organization restored');
            onSaved(data);
        } catch {
            toast.error('Failed to restore');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
            <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{org.name}</h2>
                        <p className="text-xs text-gray-500 font-mono">{org.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {org.deleted_at ? (
                            <button onClick={handleRestore} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">Restore</button>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200">Suspend</button>
                        )}
                        <button onClick={() => setConfirmForce(true)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">Delete</button>
                        <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-white">
                    {[
                        { label: 'Members', value: org.users_count },
                        { label: 'Vehicles', value: org.vehicles_count },
                        { label: 'Trackers', value: org.trackers_count },
                        { label: 'Trips', value: org.trips_count },
                    ].map(s => (
                        <div key={s.label} className="py-3 text-center">
                            <div className="text-xl font-bold text-gray-900">{s.value ?? 0}</div>
                            <div className="text-xs text-gray-500">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    {(['details', 'members'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px capitalize ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'details' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input value={form.name} onChange={e => set('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                                    <input value={form.slug} onChange={e => set('slug', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                    <select value={form.timezone} onChange={e => set('timezone', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                        {!TIMEZONES.includes(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Locale / Language</label>
                                    <select value={form.locale} onChange={e => set('locale', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                        {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Speed Unit</label>
                                    <select value={form.speed_unit} onChange={e => set('speed_unit', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                        <option value="mph">MPH (miles per hour)</option>
                                        <option value="kmh">KM/H (kilometres per hour)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select value={form.is_active ? 'active' : 'suspended'} onChange={e => set('is_active', e.target.value === 'active')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <div className="text-xs text-gray-400 pt-2">
                                Created: {new Date(org.created_at).toLocaleString()}
                                {org.deleted_at && <span className="ml-4 text-red-500">Deleted: {new Date(org.deleted_at).toLocaleString()}</span>}
                            </div>
                        </div>
                    )}

                    {tab === 'members' && (
                        <div>
                            {/* Add member */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Add member by email</p>
                                <div className="flex gap-2 mb-2">
                                    <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                                        placeholder="user@example.com" className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                                    <button onClick={handleSearchUser} disabled={searching}
                                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm disabled:opacity-50">
                                        {searching ? '…' : 'Search'}
                                    </button>
                                </div>
                                {searchResult && (
                                    <div className="flex items-center gap-3 mt-2 p-2 bg-white border border-green-200 rounded">
                                        <div className="flex-1">
                                            <span className="font-medium text-sm">{searchResult.name}</span>
                                            <span className="text-gray-500 text-sm ml-2">{searchResult.email}</span>
                                        </div>
                                        <select value={addRole} onChange={e => setAddRole(e.target.value)}
                                            className="px-2 py-1 border border-gray-300 rounded text-sm">
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <button onClick={handleAddMember} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Add</button>
                                    </div>
                                )}
                            </div>

                            {loadingMembers ? (
                                <div className="text-sm text-gray-400 text-center py-4">Loading members…</div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{m.name}</div>
                                                <div className="text-xs text-gray-500">{m.email}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select value={m.pivot.role} onChange={e => handleRoleChange(m.id, e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm">
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                <button onClick={() => handleRemoveMember(m.id, m.name)}
                                                    className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                                            </div>
                                        </div>
                                    ))}
                                    {members.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No members</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {tab === 'details' && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md text-sm">Cancel</button>
                        <button onClick={handleSave} disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Confirm Suspend */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-80">
                        <h3 className="font-semibold text-gray-900 mb-2">Suspend Organization?</h3>
                        <p className="text-sm text-gray-600 mb-4">This will mark <strong>{org.name}</strong> as inactive. It can be restored later.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded text-sm">Cancel</button>
                            <button onClick={handleSoftDelete} className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">Suspend</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Force Delete */}
            {confirmForce && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-96">
                        <h3 className="font-semibold text-red-700 mb-2">Permanently Delete Organization</h3>
                        <p className="text-sm text-gray-600 mb-3">This will permanently destroy <strong>{org.name}</strong> and all its data. Type the name to confirm.</p>
                        <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={org.name}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setConfirmForce(false); setConfirmText(''); }} className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded text-sm">Cancel</button>
                            <button onClick={handleForceDelete} disabled={confirmText !== org.name}
                                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-40">Delete Permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminOrganizations() {
    const [result, setResult] = useState<PaginatedOrgs | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editOrg, setEditOrg] = useState<Org | null>(null);

    const fetchOrgs = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/organizations', { params: { search, page } });
            setResult(data);
        } catch {
            toast.error('Failed to load organizations');
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

    const handleEditClick = async (org: Org) => {
        // Load full org with users
        const { data } = await api.get(`/admin/organizations/${org.id}`);
        setEditOrg(data);
    };

    const handleSaved = (updated: Org) => {
        if (updated.deleted_at === 'deleted') {
            // permanently deleted — remove from list
            setResult(r => r ? { ...r, data: r.data.filter(o => o.id !== updated.id) } : r);
            setEditOrg(null);
            return;
        }
        setResult(r => r ? { ...r, data: r.data.map(o => o.id === updated.id ? { ...o, ...updated } : o) } : r);
        setEditOrg(prev => prev ? { ...prev, ...updated } : prev);
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
                    <p className="text-gray-500 mt-1">{result?.total ?? '—'} total</p>
                </div>
            </div>

            <div className="mb-4">
                <input type="text" placeholder="Search organizations…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Organization</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Members</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Vehicles</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Trips</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td></tr>
                        ) : result?.data.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No organizations found</td></tr>
                        ) : result?.data.map(org => (
                            <tr key={org.id} className={org.deleted_at ? 'bg-red-50 opacity-60' : !org.is_active ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{org.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{org.slug}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{org.users_count}</td>
                                <td className="px-4 py-3 text-gray-700">{org.vehicles_count}</td>
                                <td className="px-4 py-3 text-gray-700">{org.trips_count}</td>
                                <td className="px-4 py-3">
                                    {org.deleted_at
                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Deleted</span>
                                        : org.is_active
                                            ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Active</span>
                                            : <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Suspended</span>}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(org.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleEditClick(org)}
                                        className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {result && result.last_page > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: result.last_page }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                            className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {editOrg && (
                <OrgEditPanel
                    org={editOrg}
                    onClose={() => setEditOrg(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
