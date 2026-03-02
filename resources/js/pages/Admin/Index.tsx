import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';

interface Stats {
    organizations: number;
    organizations_active: number;
    users: number;
    users_super_admin: number;
}

export default function AdminIndex() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/stats')
            .then(({ data }) => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    const cards = stats ? [
        { label: 'Total Organizations', value: stats.organizations, sub: `${stats.organizations_active} active`, color: 'blue' },
        { label: 'Total Users', value: stats.users, sub: `${stats.users_super_admin} super admins`, color: 'purple' },
    ] : [];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
                <p className="text-gray-500 mt-1">Platform-wide overview</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {cards.map(c => (
                        <div key={c.label} className={`bg-white rounded-xl shadow p-6 border-l-4 border-${c.color}-500`}>
                            <div className={`text-3xl font-bold text-${c.color}-600`}>{c.value}</div>
                            <div className="text-lg font-medium text-gray-800 mt-1">{c.label}</div>
                            <div className="text-sm text-gray-500 mt-0.5">{c.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/admin/organizations" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
                    <div className="text-lg font-semibold text-gray-900">🏢 Manage Organizations</div>
                    <p className="text-sm text-gray-500 mt-1">View, edit, suspend or delete organizations across the platform.</p>
                </Link>
                <Link to="/admin/users" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
                    <div className="text-lg font-semibold text-gray-900">👥 Manage Users</div>
                    <p className="text-sm text-gray-500 mt-1">Search, edit and manage user accounts and super admin privileges.</p>
                </Link>
            </div>
        </div>
    );
}
