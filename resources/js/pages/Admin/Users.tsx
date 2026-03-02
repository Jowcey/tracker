import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    is_super_admin: boolean;
    created_at: string;
    organizations: { id: number; name: string }[];
}

interface PaginatedUsers {
    data: AdminUser[];
    total: number;
    current_page: number;
    last_page: number;
}

export default function AdminUsers() {
    const [result, setResult] = useState<PaginatedUsers | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/users', { params: { search, page } });
            setResult(data);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [search, page]);

    const handleSaveEdit = async () => {
        if (!editUser) return;
        try {
            await api.patch(`/admin/users/${editUser.id}`, { name: editName });
            toast.success('User updated');
            setEditUser(null);
            fetchUsers();
        } catch {
            toast.error('Failed to update user');
        }
    };

    const handleToggleSuperAdmin = async (user: AdminUser) => {
        try {
            await api.patch(`/admin/users/${user.id}`, { is_super_admin: !user.is_super_admin });
            toast.success(`Super admin ${user.is_super_admin ? 'revoked' : 'granted'}`);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await api.delete(`/admin/users/${confirmDelete.id}`);
            toast.success('User deleted');
            setConfirmDelete(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                <p className="text-gray-500 mt-1">{result?.total ?? '—'} total</p>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by name or email..."
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
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Organizations</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                        ) : result?.data.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                    {user.organizations.length === 0 ? '—' : user.organizations.map(o => o.name).join(', ')}
                                </td>
                                <td className="px-4 py-3">
                                    {user.is_super_admin ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-semibold">Super Admin</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">User</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                    <button onClick={() => { setEditUser(user); setEditName(user.name); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                                    <button onClick={() => handleToggleSuperAdmin(user)}
                                        className={`text-xs hover:underline ${user.is_super_admin ? 'text-yellow-600' : 'text-purple-600'}`}>
                                        {user.is_super_admin ? 'Revoke Admin' : 'Make Admin'}
                                    </button>
                                    <button onClick={() => setConfirmDelete(user)} className="text-red-600 hover:underline text-xs">Delete</button>
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
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Edit User</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-2 text-red-700">Delete User</h3>
                        <p className="text-gray-600 mb-4">Delete <strong>{confirmDelete.name}</strong> ({confirmDelete.email})? This cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
