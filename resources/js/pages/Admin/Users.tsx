import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

interface OrgMembership {
    id: number;
    name: string;
    slug: string;
    pivot: { role: string; created_at: string };
}

interface AdminUser {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_super_admin: boolean;
    created_at: string;
    organizations: OrgMembership[];
}

interface PaginatedUsers { data: AdminUser[]; total: number; current_page: number; last_page: number; }

const ROLES = ['owner', 'admin', 'manager', 'viewer'] as const;

function UserEditPanel({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (u: AdminUser) => void }) {
    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
        password: '',
        is_super_admin: user.is_super_admin,
        email_verified: !!user.email_verified_at,
    });
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [orgs, setOrgs] = useState<OrgMembership[]>(user.organizations ?? []);
    const [tab, setTab] = useState<'details' | 'organizations'>('details');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {
                name: form.name,
                email: form.email,
                is_super_admin: form.is_super_admin,
                email_verified: form.email_verified,
            };
            if (form.password) payload.password = form.password;

            const { data } = await api.patch(`/admin/users/${user.id}`, payload);
            toast.success('User saved');
            onSaved(data);
            setForm(f => ({ ...f, password: '' }));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleRoleChange = async (orgId: number, role: string) => {
        try {
            await api.patch(`/admin/organizations/${orgId}/users/${user.id}/role`, { role });
            setOrgs(o => o.map(org => org.id === orgId ? { ...org, pivot: { ...org.pivot, role } } : org));
            toast.success('Role updated');
        } catch {
            toast.error('Failed to update role');
        }
    };

    const handleRemoveFromOrg = async (orgId: number, orgName: string) => {
        if (!confirm(`Remove ${user.name} from ${orgName}?`)) return;
        try {
            await api.delete(`/admin/organizations/${orgId}/users/${user.id}`);
            setOrgs(o => o.filter(org => org.id !== orgId));
            toast.success(`Removed from ${orgName}`);
        } catch {
            toast.error('Failed to remove');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/admin/users/${user.id}`);
            toast.success('User deleted');
            onClose();
            onSaved({ ...user, id: -1 }); // signals deletion to parent
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
            <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                        <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">Delete User</button>
                        <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
                    </div>
                </div>

                {/* Meta bar */}
                <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-white text-xs text-gray-500">
                    <span>ID: <span className="font-mono text-gray-700">{user.id}</span></span>
                    <span>Joined: <span className="text-gray-700">{new Date(user.created_at).toLocaleDateString()}</span></span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${user.email_verified_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {user.email_verified_at ? 'Email verified' : 'Email not verified'}
                    </span>
                    {user.is_super_admin && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Super Admin</span>}
                    <span className="ml-auto">{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    {(['details', 'organizations'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px capitalize ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {t === 'organizations' ? `Organizations (${orgs.length})` : t}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'details' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input value={form.name} onChange={e => set('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                                </label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={form.password}
                                        onChange={e => set('password', e.target.value)}
                                        placeholder="Enter new password…"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm pr-16" />
                                    <button type="button" onClick={() => setShowPassword(s => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700">
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                {form.password && form.password.length < 8 && (
                                    <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                                <p className="text-sm font-medium text-gray-700">Account Flags</p>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`relative w-10 h-6 rounded-full transition-colors ${form.email_verified ? 'bg-green-500' : 'bg-gray-300'}`}
                                        onClick={() => set('email_verified', !form.email_verified)}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.email_verified ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">Email Verified</div>
                                        <div className="text-xs text-gray-500">
                                            {user.email_verified_at ? `Verified on ${new Date(user.email_verified_at).toLocaleDateString()}` : 'Not yet verified'}
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`relative w-10 h-6 rounded-full transition-colors ${form.is_super_admin ? 'bg-purple-500' : 'bg-gray-300'}`}
                                        onClick={() => set('is_super_admin', !form.is_super_admin)}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_super_admin ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">Super Admin</div>
                                        <div className="text-xs text-gray-500">Full platform access including this admin panel</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {tab === 'organizations' && (
                        <div>
                            {orgs.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">Not a member of any organization</p>
                            ) : (
                                <div className="space-y-2">
                                    {orgs.map(org => (
                                        <div key={org.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{org.slug}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    Joined {new Date(org.pivot.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select value={org.pivot.role} onChange={e => handleRoleChange(org.id, e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm">
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                <button onClick={() => handleRemoveFromOrg(org.id, org.name)}
                                                    className="text-red-500 hover:text-red-700 text-xs ml-1">Remove</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {tab === 'details' && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md text-sm">Cancel</button>
                        <button onClick={handleSave} disabled={saving || (!!form.password && form.password.length < 8)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Delete confirm */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-96">
                        <h3 className="font-semibold text-red-700 mb-2">Delete User</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Permanently delete <strong>{user.name}</strong> ({user.email})?
                            They will be removed from all organizations. This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded text-sm">Cancel</button>
                            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminUsers() {
    const [result, setResult] = useState<PaginatedUsers | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/users', { params: { search, page } });
            setResult(data);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleEditClick = async (user: AdminUser) => {
        const { data } = await api.get(`/admin/users/${user.id}`);
        setEditUser(data);
    };

    const handleSaved = (updated: AdminUser) => {
        if (updated.id === -1) {
            // deleted
            setResult(r => r ? { ...r, data: r.data.filter(u => u.id !== editUser?.id), total: (r.total ?? 1) - 1 } : r);
            setEditUser(null);
            return;
        }
        setResult(r => r ? { ...r, data: r.data.map(u => u.id === updated.id ? { ...u, ...updated } : u) } : r);
        setEditUser(prev => prev ? { ...prev, ...updated } : prev);
    };

    const handleCreated = (user: AdminUser) => {
        setResult(r => r ? { ...r, data: [user, ...r.data], total: (r.total ?? 0) + 1 } : r);
        setShowCreate(false);
        toast.success('User created');
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                    <p className="text-gray-500 mt-1">{result?.total ?? '—'} total</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                    + New User
                </button>
            </div>

            <div className="mb-4">
                <input type="text" placeholder="Search by name or email…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Organizations</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Verified</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
                        ) : result?.data.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No users found</td></tr>
                        ) : result?.data.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                    {user.organizations.length === 0 ? <span className="text-gray-400">None</span>
                                        : user.organizations.map(o => o.name).join(', ')}
                                </td>
                                <td className="px-4 py-3">
                                    {user.is_super_admin
                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-semibold">Super Admin</span>
                                        : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">User</span>}
                                </td>
                                <td className="px-4 py-3">
                                    {user.email_verified_at
                                        ? <span className="text-green-600 text-xs">✓ Verified</span>
                                        : <span className="text-yellow-600 text-xs">✗ Unverified</span>}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleEditClick(user)}
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

            {editUser && (
                <UserEditPanel user={editUser} onClose={() => setEditUser(null)} onSaved={handleSaved} />
            )}

            {showCreate && (
                <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
            )}
        </div>
    );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (user: AdminUser) => void }) {
    const [form, setForm] = useState({ name: '', email: '', password: '', is_super_admin: false });
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await api.post('/admin/users', form);
            onCreated(data);
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            const msg = errors ? Object.values(errors)[0] as string : err.response?.data?.message || 'Failed to create user';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">New User</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input required value={form.name} onChange={e => set('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Jane Smith" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                        <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="jane@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <div className="relative">
                            <input required type={showPassword ? 'text' : 'password'} value={form.password}
                                onChange={e => set('password', e.target.value)} minLength={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm pr-16" placeholder="Min. 8 characters" />
                            <button type="button" onClick={() => setShowPassword(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700">
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`relative w-10 h-6 rounded-full transition-colors ${form.is_super_admin ? 'bg-purple-500' : 'bg-gray-300'}`}
                            onClick={() => set('is_super_admin', !form.is_super_admin)}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_super_admin ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-800">Super Admin</div>
                            <div className="text-xs text-gray-500">Full platform access including admin panel</div>
                        </div>
                    </label>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Creating…' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
