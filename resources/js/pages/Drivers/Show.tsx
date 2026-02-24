import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Driver {
    id: number;
    name: string;
    license_number?: string;
    phone?: string;
    notes?: string;
    is_active: boolean;
    average_score?: number | null;
    total_distance?: number;
    trips_count?: number;
}

interface Trip {
    id: number;
    started_at: string;
    ended_at: string;
    distance: number;
    duration: number;
    driver_score?: number | null;
    label?: string;
    vehicle?: { id: number; name: string; type: string };
}

function ScoreBadge({ score }: { score?: number | null }) {
    if (score == null) return <span className="text-xs text-gray-400">No score</span>;
    const cls = score >= 80
        ? 'bg-green-100 text-green-700'
        : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}/100</span>;
}

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];

export default function DriversShow() {
    const { id: driverId } = useParams<{ id: string }>();
    const { currentOrganization } = useAuth();
    const [driver, setDriver] = useState<Driver | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentOrganization && driverId) fetchDriver();
    }, [currentOrganization, driverId]);

    const fetchDriver = async () => {
        if (!currentOrganization || !driverId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/drivers/${driverId}`);
            setDriver(data.driver || data);
            setTrips(data.trips?.data || data.trips || []);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to load driver');
        } finally {
            setLoading(false);
        }
    };

    const avatarColor = driver ? AVATAR_COLORS[driver.id % AVATAR_COLORS.length] : 'bg-blue-500';

    if (loading) {
        return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
    }
    if (error || !driver) {
        return (
            <div className="text-center py-16">
                <p className="text-red-500 mb-4">{error || 'Driver not found'}</p>
                <Link to="/drivers" className="text-blue-600 hover:underline">← Back to Drivers</Link>
            </div>
        );
    }

    return (
        <div>
            {/* Back nav */}
            <Link to="/drivers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Drivers
            </Link>

            {/* Driver profile header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-start gap-5">
                    <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                        {initials(driver.name)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{driver.name}</h1>
                                {driver.license_number && <p className="text-sm text-gray-500 mt-0.5">Licence: {driver.license_number}</p>}
                                {driver.phone && <p className="text-sm text-gray-500">{driver.phone}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <ScoreBadge score={driver.average_score} />
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${driver.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {driver.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        {driver.notes && <p className="mt-2 text-sm text-gray-600">{driver.notes}</p>}
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{driver.trips_count ?? 0}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Total Trips</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {driver.total_distance != null ? `${parseFloat(String(driver.total_distance)).toFixed(0)}` : '0'} <span className="text-sm font-normal">km</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">Total Distance</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {driver.average_score != null ? driver.average_score : '—'}
                            {driver.average_score != null && <span className="text-sm font-normal">/100</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${driver.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                            {driver.is_active ? 'Active' : 'Inactive'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">Status</div>
                    </div>
                </div>
            </div>

            {/* Trip history */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Trip History</h2>
                </div>
                {trips.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No trips recorded for this driver yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Distance</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Label</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trips.map(trip => (
                                    <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-700">
                                            <div>{new Date(trip.started_at).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' → '}
                                                {new Date(trip.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-700">{trip.vehicle?.name || '—'}</td>
                                        <td className="px-6 py-3 text-right text-gray-700">
                                            {parseFloat(String(trip.distance || 0)).toFixed(1)} km
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-700">{formatDuration(trip.duration)}</td>
                                        <td className="px-6 py-3 text-center"><ScoreBadge score={trip.driver_score} /></td>
                                        <td className="px-6 py-3 text-center">
                                            {trip.label ? (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    trip.label === 'business' ? 'bg-blue-100 text-blue-700' :
                                                    trip.label === 'personal' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                                }`}>{trip.label}</span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
