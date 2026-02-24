import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

type Period = 'week' | 'month' | 'custom';
type Tab = 'fleet' | 'vehicle' | 'driver';

interface FleetSummary {
    total_trips: number;
    total_distance: number;
    fleet_utilisation: number;
    avg_score: number | null;
    total_harsh_events: number;
}

interface VehicleRow {
    id: number;
    name: string;
    trips: number;
    distance: number;
    avg_score: number | null;
    harsh_events: number;
}

interface DailyPoint {
    date: string;
    trips: number;
}

interface FleetReport {
    summary: FleetSummary;
    vehicles: VehicleRow[];
    daily: DailyPoint[];
}

interface Vehicle { id: number; name: string; }
interface Driver { id: number; name: string; }

interface Trip {
    id: number;
    started_at: string;
    ended_at: string;
    distance: number;
    duration: number;
    driver_score?: number | null;
    label?: string;
    vehicle?: { name: string };
    driver?: { name: string };
}

interface EntityReport {
    summary: { trips: number; distance: number; avg_score: number | null; harsh_events: number };
    trips: Trip[];
    score_history?: Array<{ date: string; score: number }>;
}

function ScoreBadge({ score }: { score?: number | null }) {
    if (score == null) return <span className="text-xs text-gray-400">—</span>;
    const cls = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}/100</span>;
}

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmt(n: number | undefined | null, dec = 1) {
    return n != null ? parseFloat(String(n)).toFixed(dec) : '—';
}

export default function ReportsIndex() {
    const { currentOrganization } = useAuth();
    const [period, setPeriod] = useState<Period>('week');
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [tab, setTab] = useState<Tab>('fleet');

    const [fleetReport, setFleetReport] = useState<FleetReport | null>(null);
    const [fleetLoading, setFleetLoading] = useState(false);

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [entityReport, setEntityReport] = useState<EntityReport | null>(null);
    const [entityLoading, setEntityLoading] = useState(false);

    useEffect(() => {
        if (currentOrganization) {
            fetchFleet();
            fetchVehicles();
            fetchDrivers();
        }
    }, [currentOrganization, period, dateFrom, dateTo]);

    useEffect(() => {
        if (selectedVehicleId && tab === 'vehicle') fetchEntityReport('vehicle', selectedVehicleId);
    }, [selectedVehicleId, tab]);

    useEffect(() => {
        if (selectedDriverId && tab === 'driver') fetchEntityReport('driver', selectedDriverId);
    }, [selectedDriverId, tab]);

    const periodParams = () => {
        if (period === 'custom') return { period, from: dateFrom, to: dateTo };
        return { period };
    };

    const fetchFleet = async () => {
        if (!currentOrganization) return;
        setFleetLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/reports/fleet`, { params: periodParams() });
            setFleetReport(data);
        } catch (e) { console.error(e); } finally { setFleetLoading(false); }
    };

    const fetchVehicles = async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles`);
            setVehicles(data.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchDrivers = async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/drivers`);
            setDrivers(data.data || data || []);
        } catch (e) { console.error(e); }
    };

    const fetchEntityReport = async (type: 'vehicle' | 'driver', id: number) => {
        if (!currentOrganization) return;
        setEntityLoading(true);
        try {
            const { data } = await api.get(
                `/organizations/${currentOrganization.id}/reports/${type}/${id}`,
                { params: periodParams() }
            );
            setEntityReport(data);
        } catch (e) { console.error(e); } finally { setEntityLoading(false); }
    };

    const exportCsv = () => {
        if (!currentOrganization) return;
        const params = new URLSearchParams({ period, ...(period === 'custom' ? { from: dateFrom, to: dateTo } : {}) });
        window.location.href = `/api/organizations/${currentOrganization.id}/reports/export?${params}`;
    };

    // Simple bar chart
    const maxTrips = fleetReport?.daily ? Math.max(...fleetReport.daily.map(d => d.trips), 1) : 1;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Period selector */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                        {(['week', 'month', 'custom'] as Period[]).map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Custom'}
                            </button>
                        ))}
                    </div>
                    {period === 'custom' && (
                        <>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span className="text-gray-400 text-sm">to</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </>
                    )}
                    <button onClick={exportCsv}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                        ⬇️ Export CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-200">
                {([['fleet', '🚛 Fleet'], ['vehicle', '🚗 By Vehicle'], ['driver', '👤 By Driver']] as [Tab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Fleet Tab */}
            {tab === 'fleet' && (
                fleetLoading ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                ) : fleetReport ? (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                            {[
                                { label: 'Total Trips', value: String(fleetReport.summary.total_trips), color: 'text-blue-600' },
                                { label: 'Distance', value: `${fmt(fleetReport.summary.total_distance)} km`, color: 'text-green-600' },
                                { label: 'Fleet Utilisation', value: `${fmt(fleetReport.summary.fleet_utilisation)}%`, color: 'text-purple-600' },
                                { label: 'Avg Score', value: fleetReport.summary.avg_score != null ? `${fmt(fleetReport.summary.avg_score)}/100` : '—', color: 'text-orange-500' },
                                { label: 'Harsh Events', value: String(fleetReport.summary.total_harsh_events), color: 'text-red-500' },
                            ].map(card => (
                                <div key={card.label} className="bg-white rounded-lg shadow p-4">
                                    <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                                    <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Daily bar chart */}
                        {fleetReport.daily.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-4 mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Trips</h3>
                                <div className="flex items-end gap-1 h-24 overflow-x-auto pb-4">
                                    {fleetReport.daily.map(d => (
                                        <div key={d.date} className="flex flex-col items-center gap-1 min-w-[28px]">
                                            <span className="text-xs text-gray-500">{d.trips || ''}</span>
                                            <div
                                                className="w-6 bg-blue-400 rounded-t transition-all"
                                                style={{ height: `${Math.max(4, (d.trips / maxTrips) * 64)}px` }}
                                                title={`${d.date}: ${d.trips} trips`}
                                            />
                                            <span className="text-xs text-gray-400 rotate-45 origin-left w-8 overflow-hidden whitespace-nowrap">
                                                {new Date(d.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Vehicles table */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700">By Vehicle</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Trips</th>
                                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Distance</th>
                                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Harsh Events</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fleetReport.vehicles.map(v => (
                                            <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">{v.name}</td>
                                                <td className="px-6 py-3 text-right text-gray-700">{v.trips}</td>
                                                <td className="px-6 py-3 text-right text-gray-700">{fmt(v.distance)} km</td>
                                                <td className="px-6 py-3 text-center"><ScoreBadge score={v.avg_score} /></td>
                                                <td className="px-6 py-3 text-right text-gray-700">{v.harsh_events}</td>
                                            </tr>
                                        ))}
                                        {fleetReport.vehicles.length === 0 && (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No data for this period</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-400">No fleet data available.</div>
                )
            )}

            {/* By Vehicle Tab */}
            {tab === 'vehicle' && (
                <div>
                    <div className="mb-4">
                        <select value={selectedVehicleId || ''} onChange={e => { setSelectedVehicleId(e.target.value ? parseInt(e.target.value) : null); setEntityReport(null); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select vehicle…</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <EntityReportView report={entityReport} loading={entityLoading} type="vehicle" />
                </div>
            )}

            {/* By Driver Tab */}
            {tab === 'driver' && (
                <div>
                    <div className="mb-4">
                        <select value={selectedDriverId || ''} onChange={e => { setSelectedDriverId(e.target.value ? parseInt(e.target.value) : null); setEntityReport(null); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select driver…</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <EntityReportView report={entityReport} loading={entityLoading} type="driver" />
                </div>
            )}
        </div>
    );
}

function EntityReportView({ report, loading, type }: { report: EntityReport | null; loading: boolean; type: 'vehicle' | 'driver' }) {
    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
    if (!report) return <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">Select a {type} to view report.</div>;

    const maxScore = report.score_history ? Math.max(...report.score_history.map(s => s.score), 1) : 100;

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Trips', value: String(report.summary.trips), color: 'text-blue-600' },
                    { label: 'Distance', value: `${parseFloat(String(report.summary.distance || 0)).toFixed(1)} km`, color: 'text-green-600' },
                    { label: 'Avg Score', value: report.summary.avg_score != null ? `${report.summary.avg_score}/100` : '—', color: 'text-orange-500' },
                    { label: 'Harsh Events', value: String(report.summary.harsh_events || 0), color: 'text-red-500' },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-lg shadow p-4">
                        <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Score history chart (driver only) */}
            {type === 'driver' && report.score_history && report.score_history.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Score History</h3>
                    <div className="flex items-end gap-2 h-20">
                        {report.score_history.map(s => (
                            <div key={s.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                <div
                                    className={`w-full rounded-t transition-all ${s.score >= 80 ? 'bg-green-400' : s.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                    style={{ height: `${Math.max(4, (s.score / maxScore) * 60)}px` }}
                                    title={`${s.date}: ${s.score}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trips table */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Trips</h3>
                </div>
                {report.trips.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No trips in this period.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    {type === 'driver' && <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>}
                                    {type === 'vehicle' && <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Driver</th>}
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Distance</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.trips.map(trip => (
                                    <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-700">{new Date(trip.started_at).toLocaleDateString()}</td>
                                        {type === 'driver' && <td className="px-6 py-3 text-gray-500">{trip.vehicle?.name || '—'}</td>}
                                        {type === 'vehicle' && <td className="px-6 py-3 text-gray-500">{trip.driver?.name || '—'}</td>}
                                        <td className="px-6 py-3 text-right text-gray-700">{parseFloat(String(trip.distance || 0)).toFixed(1)} km</td>
                                        <td className="px-6 py-3 text-right text-gray-700">
                                            {formatDuration(trip.duration)}
                                        </td>
                                        <td className="px-6 py-3 text-center"><ScoreBadge score={trip.driver_score} /></td>
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
