import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface AnalyticsSummary {
    total_trips: number;
    total_distance_km: number;
    average_driver_score: number | null;
    daily_trips: { date: string; trips: number; distance: number }[];
}

interface Trip {
    id: number;
    vehicle_id: number;
    started_at: string;
    ended_at: string;
    distance: number;
    duration: number;
    driver_score?: number | null;
    vehicle?: { id: number; name: string; type: string };
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
    if (score == null) return null;
    const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${color}`}>{score}</span>;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DriverAppHome() {
    const { user, currentOrganization } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);

    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => {
        if (!currentOrganization) return;
        setLoading(true);
        Promise.all([
            api.get(`/organizations/${currentOrganization.id}/analytics?period=week`),
            api.get(`/organizations/${currentOrganization.id}/trips`, { params: { per_page: 5 } }),
        ])
            .then(([analyticsRes, tripsRes]) => {
                setAnalytics(analyticsRes.data);
                const allTrips: Trip[] = tripsRes.data.data || [];
                const todayStr = new Date().toISOString().split('T')[0];
                const todayTrips = allTrips.filter(t => t.started_at?.startsWith(todayStr));
                setRecentTrips(todayTrips.length > 0 ? todayTrips : allTrips.slice(0, 5));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [currentOrganization]);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrips = recentTrips.filter(t => t.started_at?.startsWith(todayStr));
    const todayDistance = todayTrips.reduce((sum, t) => sum + parseFloat(t.distance as any || 0), 0);
    const avgScore = todayTrips.length > 0
        ? Math.round(todayTrips.filter(t => t.driver_score != null).reduce((s, t) => s + (t.driver_score ?? 0), 0) / Math.max(1, todayTrips.filter(t => t.driver_score != null).length))
        : null;

    return (
        <div className="p-4 space-y-5">
            {/* Welcome */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">👋 Hello, {user?.name?.split(' ')[0]}</h2>
                <p className="text-sm text-gray-500">{today}</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
            ) : (
                <>
                    {/* Today's stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">{todayTrips.length}</p>
                            <p className="text-xs text-blue-700 mt-0.5">Today's Trips</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{todayDistance.toFixed(1)}</p>
                            <p className="text-xs text-green-700 mt-0.5">km Today</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 text-center">
                            <p className={`text-2xl font-bold ${avgScore != null ? (avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-yellow-600' : 'text-red-500') : 'text-gray-400'}`}>
                                {avgScore ?? '—'}
                            </p>
                            <p className="text-xs text-purple-700 mt-0.5">Avg Score</p>
                        </div>
                    </div>

                    {/* Recent trips */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Trips</h3>
                        {recentTrips.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                                <p className="text-3xl mb-2">🚗</p>
                                <p className="text-sm text-gray-500">No trips recorded today</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentTrips.map(trip => (
                                    <div key={trip.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                        <span className="text-2xl">🚙</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{trip.vehicle?.name || 'Vehicle'}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' · '}{parseFloat(trip.distance as any || 0).toFixed(1)} km
                                                {' · '}{formatDuration(trip.duration)}
                                            </p>
                                        </div>
                                        <ScoreBadge score={trip.driver_score} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Weekly summary from analytics */}
                    {analytics && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">This Week</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{analytics.total_trips} trips</span>
                                <span className="text-gray-500">{analytics.total_distance_km} km</span>
                                {analytics.average_driver_score != null && (
                                    <span className="text-gray-500">Score: {analytics.average_driver_score}</span>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
