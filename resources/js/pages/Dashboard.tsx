import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';
import { useTranslation } from 'react-i18next';

interface AnalyticsSummary {
    period: string;
    total_trips: number;
    total_distance_km: number;
    total_drive_time_seconds: number;
    total_idle_seconds: number;
    average_trip_distance_km: number;
    average_trip_duration_seconds: number;
    average_driver_score: number | null;
    vehicles_total: number;
    vehicles_active: number;
    fleet_utilisation_pct: number;
    most_active_vehicle: { id: number; name: string; type: string } | null;
    daily_trips: { date: string; trips: number; distance: number }[];
    total_co2_kg?: number | null;
    total_fuel_cost?: number | null;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatCard({ title, value, sub, color }: { title: string; value: string | number; sub?: string; color: string }) {
    return (
        <div className={`bg-${color}-50 rounded-lg p-4`}>
            <p className={`text-sm font-medium text-${color}-700`}>{title}</p>
            <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
            {sub && <p className={`text-xs text-${color}-600 mt-0.5`}>{sub}</p>}
        </div>
    );
}

function SparkBar({ data }: { data: { date: string; trips: number }[] }) {
    const max = Math.max(...data.map(d => d.trips), 1);
    return (
        <div className="flex items-end gap-0.5 h-12">
            {data.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div
                        className="w-full bg-blue-400 rounded-sm transition-all hover:bg-blue-600"
                        style={{ height: `${Math.max(2, (d.trips / max) * 40)}px` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                        {d.date}: {d.trips} trips
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const { t } = useTranslation();
    const { currentOrganization } = useAuth();
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentOrganization) return;
        setLoading(true);
        api.get(`/organizations/${currentOrganization.id}/analytics?period=${period}`)
            .then(r => setData(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [currentOrganization, period]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Fleet overview for {currentOrganization?.name}</p>
                </div>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {(['week', 'month'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                            This {p}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" /></div>
            ) : data ? (
                <>
                    {/* Primary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard title="Total Trips" value={data.total_trips} color="blue" sub={`avg ${data.average_trip_distance_km} km`} />
                        <StatCard title="Distance" value={`${data.total_distance_km} km`} color="green" sub={`avg ${formatDuration(data.average_trip_duration_seconds)}/trip`} />
                        <StatCard title="Drive Time" value={formatDuration(data.total_drive_time_seconds)} color="purple" sub={`${formatDuration(data.total_idle_seconds)} idle`} />
                        <StatCard title="Fleet Usage" value={`${data.fleet_utilisation_pct}%`} color="orange" sub={`${data.vehicles_active} / ${data.vehicles_total} active`} />
                        <StatCard
                            title="Fleet CO₂"
                            value={data.total_co2_kg != null
                                ? data.total_co2_kg >= 1000
                                    ? `${(data.total_co2_kg / 1000).toFixed(1)} t`
                                    : `${Math.round(data.total_co2_kg)} kg`
                                : '—'}
                            color="teal"
                        />
                        <StatCard
                            title="Fuel Cost"
                            value={data.total_fuel_cost != null
                                ? `£${data.total_fuel_cost.toFixed(2)}`
                                : '—'}
                            color="yellow"
                        />
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Daily trips chart */}
                        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-700">Daily trips</h3>
                                <span className="text-xs text-gray-400">{data.daily_trips.length} days</span>
                            </div>
                            <SparkBar data={data.daily_trips} />
                            <div className="flex justify-between mt-2 text-xs text-gray-400">
                                <span>{data.daily_trips[0]?.date}</span>
                                <span>{data.daily_trips[data.daily_trips.length - 1]?.date}</span>
                            </div>
                        </div>

                        {/* Summary cards */}
                        <div className="space-y-3">
                            {data.average_driver_score !== null && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm font-medium text-gray-600">Avg Driver Score</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-2xl font-bold ${data.average_driver_score >= 80 ? 'text-green-600' : data.average_driver_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {data.average_driver_score}
                                        </span>
                                        <span className="text-gray-400 text-sm">/ 100</span>
                                    </div>
                                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${data.average_driver_score >= 80 ? 'bg-green-500' : data.average_driver_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${data.average_driver_score}%` }} />
                                    </div>
                                </div>
                            )}
                            {data.most_active_vehicle && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm font-medium text-gray-600">Most Active</p>
                                    <p className="text-base font-bold text-gray-900 mt-1">{data.most_active_vehicle.name}</p>
                                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{data.most_active_vehicle.type}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-16 text-gray-400">Select an organisation to view analytics</div>
            )}
        </div>
    );
}
