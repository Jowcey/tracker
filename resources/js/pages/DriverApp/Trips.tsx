import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Trip {
    id: number;
    vehicle_id: number;
    started_at: string;
    ended_at: string;
    distance: number;
    duration: number;
    driver_score?: number | null;
    cost_km?: number | null;
    vehicle?: { id: number; name: string; type: string };
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
    if (score == null) return null;
    const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>;
}

function groupByDate(trips: Trip[]): Record<string, Trip[]> {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groups: Record<string, Trip[]> = {};
    for (const trip of trips) {
        const dateStr = trip.started_at?.split('T')[0] ?? '';
        let label: string;
        if (dateStr === todayStr) label = 'Today';
        else if (dateStr === yesterdayStr) label = 'Yesterday';
        else label = new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' });
        if (!groups[label]) groups[label] = [];
        groups[label].push(trip);
    }
    return groups;
}

export default function DriverAppTrips() {
    const { currentOrganization } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const PAGE_SIZE = 20;

    const fetchTrips = async (p: number) => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/trips`, {
                params: { per_page: PAGE_SIZE, page: p },
            });
            const newTrips: Trip[] = data.data || [];
            setTrips(prev => p === 1 ? newTrips : [...prev, ...newTrips]);
            setHasMore(newTrips.length === PAGE_SIZE);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { setPage(1); fetchTrips(1); }, [currentOrganization]);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchTrips(next);
    };

    const grouped = groupByDate(trips);

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">All Trips</h2>

            {loading && trips.length === 0 ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
            ) : trips.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-2">🗺️</p>
                    <p className="text-sm">No trips yet</p>
                </div>
            ) : (
                <>
                    {Object.entries(grouped).map(([label, dayTrips]) => (
                        <div key={label}>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</h3>
                            <div className="space-y-2">
                                {dayTrips.map(trip => (
                                    <div key={trip.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl mt-0.5">🚙</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{trip.vehicle?.name || 'Vehicle'}</p>
                                                    <ScoreBadge score={trip.driver_score} />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {' → '}
                                                    {new Date(trip.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span>📏 {parseFloat(trip.distance as any || 0).toFixed(1)} km</span>
                                                    <span>⏱ {formatDuration(trip.duration)}</span>
                                                    {trip.cost_km != null && (
                                                        <span>💰 £{parseFloat(trip.cost_km as any).toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {hasMore && (
                        <button onClick={loadMore} disabled={loading}
                            className="w-full py-3 text-sm text-blue-600 font-medium border border-blue-200 rounded-xl hover:bg-blue-50 disabled:opacity-50">
                            {loading ? 'Loading…' : 'Show more'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
