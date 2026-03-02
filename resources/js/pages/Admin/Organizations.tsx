import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

interface Org {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    users_count: number;
    created_at: string;
    deleted_at: string | null;
}

interface PaginatedOrgs {
    data: Org[];
    total: number;
    current_page: number;
    last_page: number;
}

export default function AdminOrganizations() {
    const [result, setResult] = useState<PaginatedOrgs | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editOrg, setEditOrg] = useState<Org | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<Org | null>(null);

    const fetchOrgs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/organizations', { params: { search, page } });
            setResult(data);
        } catch {
            toast.error('Failed to load organizations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrgs(); }, [search, page]);

    const handleSaveEdit = async () => {
        if (!editOrg) return;
        try {
            await api.patch(`/admin/organizations/${editOrg.id}`, { name: editName });
            toast.success('Organization updated');
            setEditOrg(null);
            fetchOrgs();
        } catch {
            toast.error('Failed to update organization');
        }
    };

    const handleToggleActive = async (org: Org) => {
        try {
            await api.patch(`/admin/organizations/${org.id}`, { is_active: !org.is_active });
            toast.success(`Organization ${org.is_active ? 'suspended' : 'activated'}`);
            fetchOrgs();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await api.delete(`/admin/organizations/${confirmDelete.id}`);
            toast.success('Organization permanently deleted');
            setConfirmDelete(null);
            fetchOrgs();
        } catch {
            toast.error('Failed to delete organization');
        }
    };

    const handleRestore = async (org: Org) => {
        try {
            await api.post(`/admin/organizations/${org.id}/restore`);
            toast.success('Organization restored');
            fetchOrgs();
        } catch {
            toast.error('Failed to restore organization');
        }
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
                <input
                    type="text"
                    placeholder="Search organizations..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Members</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                        ) : result?.data.map(org => (
                            <tr key={org.id} className={org.deleted_at ? 'bg-red-50 opacity-70' : ''}>
                                <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{org.slug}</td>
                                <td className="px-4 py-3 text-gray-700">{org.users_count}</td>
                                <td className="px-4 py-3">
                                    {org.deleted_at ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Deleted</span>
                                    ) : org.is_active ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Active</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Suspended</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(org.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                    {org.deleted_at ? (
                                        <button onClick={() => handleRestore(org)} className="text-blue-600 hover:underline text-xs">Restore</button>
                                    ) : (
                                        <>
                                            <button onClick={() => { setEditOrg(org); setEditName(org.name); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                                            <button onClick={() => handleToggleActive(org)} className="text-yellow-600 hover:underline text-xs">
                                                {org.is_active ? 'Suspend' : 'Activate'}
                                            </button>
                                            <button onClick={() => setConfirmDelete(org)} className="text-red-600 hover:underline text-xs">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
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

            {/* Edit Modal */}
            {editOrg && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Edit Organization</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditOrg(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-2 text-red-700">Permanently Delete Organization</h3>
                        <p className="text-gray-600 mb-4">This will permanently delete <strong>{confirmDelete.name}</strong> and all its data. This cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete Permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
