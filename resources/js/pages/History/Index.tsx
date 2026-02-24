import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import VehicleMap from '../../components/Map/VehicleMap';
import toast from 'react-hot-toast';

interface Trip {
    id: number;
    vehicle_id: number;
    started_at: string;
    ended_at: string;
    distance: number;
    duration: number;
    max_speed: number;
    average_speed: number;
    stops_count: number;
    vehicle?: { id: number; name: string; type: string };
}

interface Location {
    id: number;
    latitude: number | string;
    longitude: number | string;
    speed: number | string | null;
    heading: number | string | null;
    recorded_at: string;
}

interface InterpolatedState {
    position: [number, number];
    heading: number;
    speed: number;
    travelledRoute: Array<{ lng: number; lat: number }>;
}

interface ShareModal {
    tripId: number;
    url: string;
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolate(locations: Location[], virtualMs: number): InterpolatedState {
    if (locations.length === 0) return { position: [0, 0], heading: 0, speed: 0, travelledRoute: [] };

    const startMs = new Date(locations[0].recorded_at).getTime();
    const targetMs = startMs + virtualMs;

    let segmentIdx = locations.length - 2;
    for (let i = 0; i < locations.length - 1; i++) {
        const t1 = new Date(locations[i + 1].recorded_at).getTime();
        if (targetMs <= t1) { segmentIdx = i; break; }
    }

    const from = locations[segmentIdx];
    const to = locations[segmentIdx + 1];
    const t0 = new Date(from.recorded_at).getTime();
    const t1 = new Date(to.recorded_at).getTime();
    const progress = t1 > t0 ? Math.min(1, Math.max(0, (targetMs - t0) / (t1 - t0))) : 1;

    const lng = parseFloat(from.longitude as any) + (parseFloat(to.longitude as any) - parseFloat(from.longitude as any)) * progress;
    const lat = parseFloat(from.latitude as any) + (parseFloat(to.latitude as any) - parseFloat(from.latitude as any)) * progress;

    const segDistM = haversineDistanceMeters(
        parseFloat(from.latitude as any), parseFloat(from.longitude as any),
        parseFloat(to.latitude as any), parseFloat(to.longitude as any)
    );
    const segDurationSec = (t1 - t0) / 1000;
    const speed = segDurationSec > 0 ? (segDistM / segDurationSec) * 3.6 : 0;

    const travelledRoute = [
        ...locations.slice(0, segmentIdx + 1).map(l => ({
            lng: parseFloat(l.longitude as any),
            lat: parseFloat(l.latitude as any),
        })),
        { lng, lat },
    ];

    return {
        position: [lng, lat],
        heading: parseFloat(from.heading as any) || 0,
        speed,
        travelledRoute,
    };
}

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const SPEEDS = [1, 2, 5, 10, 30];

export default function HistoryIndex() {
    const { currentOrganization } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(5);
    const [virtualMs, setVirtualMs] = useState(0);
    const [interpolated, setInterpolated] = useState<InterpolatedState | null>(null);
    const [shareModal, setShareModal] = useState<ShareModal | null>(null);
    const [sharingTripId, setSharingTripId] = useState<number | null>(null);

    const rafRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);
    const virtualMsRef = useRef(0);
    const isPlayingRef = useRef(false);
    const playbackSpeedRef = useRef(playbackSpeed);
    const locationsRef = useRef(locations);

    playbackSpeedRef.current = playbackSpeed;
    locationsRef.current = locations;
    isPlayingRef.current = isPlaying;

    const totalMs = locations.length >= 2
        ? new Date(locations[locations.length - 1].recorded_at).getTime() - new Date(locations[0].recorded_at).getTime()
        : 0;

    const seek = useCallback((ms: number) => {
        virtualMsRef.current = ms;
        setVirtualMs(ms);
        if (locationsRef.current.length >= 2) {
            setInterpolated(interpolate(locationsRef.current, ms));
        }
    }, []);

    const animate = useCallback((timestamp: number) => {
        if (!isPlayingRef.current) return;
        if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
        const delta = (timestamp - lastTimestampRef.current) * playbackSpeedRef.current;
        lastTimestampRef.current = timestamp;
        const locs = locationsRef.current;
        const total = locs.length >= 2
            ? new Date(locs[locs.length - 1].recorded_at).getTime() - new Date(locs[0].recorded_at).getTime()
            : 0;
        const next = Math.min(virtualMsRef.current + delta, total);
        virtualMsRef.current = next;
        setVirtualMs(next);
        if (locs.length >= 2) setInterpolated(interpolate(locs, next));
        if (next >= total) { setIsPlaying(false); return; }
        rafRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        if (isPlaying) {
            lastTimestampRef.current = null;
            rafRef.current = requestAnimationFrame(animate);
        } else {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            lastTimestampRef.current = null;
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [isPlaying, animate]);

    useEffect(() => { if (currentOrganization) fetchVehicles(); }, [currentOrganization]);
    useEffect(() => { if (selectedVehicleId) fetchTrips(); }, [selectedVehicleId, dateFrom, dateTo]);
    useEffect(() => { if (selectedTrip) fetchTripLocations(selectedTrip.id); }, [selectedTrip]);

    const fetchVehicles = async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles`);
            setVehicles(data.data);
        } catch (e) { console.error(e); }
    };

    const fetchTrips = async () => {
        if (!currentOrganization || !selectedVehicleId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles/${selectedVehicleId}/trips`, {
                params: { start_date: dateFrom, end_date: dateTo },
            });
            setTrips(data.data || []);
        } catch (e) { console.error(e); setTrips([]); } finally { setLoading(false); }
    };

    const fetchTripLocations = async (tripId: number) => {
        setLoading(true);
        setIsPlaying(false);
        setLocations([]);
        setInterpolated(null);
        seek(0);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization!.id}/trips/${tripId}/locations`);
            const locs: Location[] = data.data || [];
            setLocations(locs);
            if (locs.length >= 2) setInterpolated(interpolate(locs, 0));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const updateTripLabel = async (tripId: number, label: string) => {
        if (!currentOrganization) return;
        try {
            await api.patch(`/organizations/${currentOrganization.id}/trips/${tripId}`, { label });
            setTrips(prev => prev.map(t => t.id === tripId ? { ...t, label } as any : t));
            if (selectedTrip?.id === tripId) setSelectedTrip(prev => prev ? { ...prev, label } as any : prev);
        } catch (e) { console.error(e); }
    };

    const handleShare = async (tripId: number) => {
        if (!currentOrganization) return;
        setSharingTripId(tripId);
        try {
            const { data } = await api.post(`/organizations/${currentOrganization.id}/trips/${tripId}/share`);
            const shareUrl = data.url || `${window.location.origin}/share/${data.token}`;
            setShareModal({ tripId, url: shareUrl });
        } catch (e) {
            console.error(e);
            toast.error('Failed to create share link');
        } finally {
            setSharingTripId(null);
        }
    };

    const handleRevoke = async () => {
        if (!currentOrganization || !shareModal) return;
        try {
            await api.delete(`/organizations/${currentOrganization.id}/trips/${shareModal.tripId}/share`);
            setShareModal(null);
            toast.success('Share link revoked');
        } catch (e) {
            console.error(e);
            toast.error('Failed to revoke share link');
        }
    };

    const handleCopyLink = () => {
        if (!shareModal) return;
        navigator.clipboard.writeText(shareModal.url)
            .then(() => toast.success('Link copied to clipboard!'))
            .catch(() => toast.error('Failed to copy link'));
    };

    const exportCsv = async () => {
        if (!currentOrganization || !selectedVehicleId) return;
        const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo });
        if (selectedVehicleId) params.append('vehicle_id', String(selectedVehicleId));
        window.open(`/api/organizations/${currentOrganization.id}/trips/export?${params}`, '_blank');
    };

    const fullRoute = locations.map(l => ({ lng: parseFloat(l.longitude as any), lat: parseFloat(l.latitude as any) }));

    const mapVehicle = interpolated && selectedTrip ? [{
        id: selectedTrip.vehicle_id,
        name: selectedTrip.vehicle?.name || 'Vehicle',
        type: selectedTrip.vehicle?.type || 'vehicle',
        is_active: true,
        organization_id: currentOrganization?.id || 0,
        tracker_id: null,
        created_at: '', updated_at: '',
        latest_location: {
            id: 0, tracker_id: 0, vehicle_id: selectedTrip.vehicle_id,
            organization_id: currentOrganization?.id || 0,
            latitude: interpolated.position[1],
            longitude: interpolated.position[0],
            heading: interpolated.heading,
            speed: interpolated.speed,
            recorded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        },
    }] : [];

    const progressPct = totalMs > 0 ? (virtualMs / totalMs) * 100 : 0;
    const currentTimeLabel = locations.length >= 2
        ? new Date(new Date(locations[0].recorded_at).getTime() + virtualMs).toLocaleTimeString()
        : '--:--:--';

    return (
        <div className="relative h-full w-full">
            {/* Map */}
            <div className="absolute inset-0">
                <VehicleMap
                    vehicles={(mapVehicle ?? []) as any}
                    fullRoute={fullRoute.length >= 2 ? fullRoute : undefined}
                    route={interpolated?.travelledRoute}
                    disableAutoBounds={!!selectedTrip}
                />
            </div>

            {/* Left panel: filters + trip list */}
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => setPanelOpen(o => !o)}
                    className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <span>📜</span>
                    <span>Trips{trips.length > 0 ? ` (${trips.length})` : ''}</span>
                    <svg className={`h-4 w-4 text-gray-500 transition-transform ${panelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {panelOpen && (
                    <div className="mt-2 w-72 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
                        {/* Filters */}
                        <div className="p-3 border-b border-gray-100 space-y-2">
                            <select
                                value={selectedVehicleId || ''}
                                onChange={e => { setSelectedVehicleId(e.target.value ? parseInt(e.target.value) : null); setSelectedTrip(null); setLocations([]); setInterpolated(null); }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select vehicle…</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            {selectedVehicleId && (
                                <button onClick={exportCsv}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
                                    ⬇️ Export CSV
                                </button>
                            )}
                        </div>

                        {/* Trip list */}
                        <div className="overflow-y-auto flex-1">
                            {loading && !selectedTrip ? (
                                <div className="p-6 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div></div>
                            ) : trips.length === 0 ? (
                                <div className="p-6 text-center text-sm text-gray-400">
                                    {selectedVehicleId ? 'No trips found for selected period' : 'Select a vehicle to see trips'}
                                </div>
                            ) : trips.map(trip => (
                                <div key={trip.id}
                                    className={`border-b border-gray-50 ${selectedTrip?.id === trip.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                                    {/* Trip summary row — clickable */}
                                    <div
                                        onClick={() => setSelectedTrip(trip)}
                                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-semibold text-gray-800">{new Date(trip.started_at).toLocaleDateString()}</span>
                                            <span className="text-xs text-gray-500">{formatDuration(trip.duration)}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                            <div>🕐 {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(trip.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            <div>📏 {parseFloat(trip.distance as any || 0).toFixed(1)} km · ⏸️ {trip.stops_count} stops</div>
                                            {(trip as any).label && (
                                                <div className="mt-0.5">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                                        (trip as any).label === 'business' ? 'bg-blue-100 text-blue-700' :
                                                        (trip as any).label === 'personal' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>{(trip as any).label}</span>
                                                </div>
                                            )}
                                            {(trip as any).driver_score != null && (
                                                <div className="mt-0.5">
                                                    <span className={`text-xs font-medium ${
                                                        (trip as any).driver_score >= 80 ? 'text-green-600' :
                                                        (trip as any).driver_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>Score: {(trip as any).driver_score}/100</span>
                                                </div>
                                            )}
                                            {((trip as any).cost_km != null || (trip as any).co2_kg != null) && (
                                                <div className="flex gap-2 mt-0.5">
                                                    {(trip as any).cost_km != null && (
                                                        <span className="text-xs text-gray-400">💰 £{parseFloat((trip as any).cost_km).toFixed(2)}</span>
                                                    )}
                                                    {(trip as any).co2_kg != null && (
                                                        <span className="text-xs text-gray-400">🌿 {parseFloat((trip as any).co2_kg).toFixed(1)} kg</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Share button row */}
                                    <div className="px-3 pb-2 flex justify-end">
                                        <button
                                            onClick={e => { e.stopPropagation(); handleShare(trip.id); }}
                                            disabled={sharingTripId === trip.id}
                                            className="text-xs text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {sharingTripId === trip.id ? (
                                                <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            ) : '🔗'} Share
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Trip stats (top right) */}
            {selectedTrip && (
                <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3 text-xs w-52">
                    <div className="font-semibold text-gray-800 mb-2 text-sm truncate">
                        {selectedTrip.vehicle?.name || 'Trip'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-blue-600">{parseFloat(selectedTrip.distance as any || 0).toFixed(1)}</div>
                            <div className="text-gray-500">km</div>
                        </div>
                        <div className="bg-green-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-green-600">{formatDuration(selectedTrip.duration)}</div>
                            <div className="text-gray-500">duration</div>
                        </div>
                        <div className="bg-orange-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-orange-500">{parseFloat(selectedTrip.max_speed as any || 0).toFixed(0)}</div>
                            <div className="text-gray-500">max km/h</div>
                        </div>
                        <div className="bg-purple-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-purple-600">{selectedTrip.stops_count}</div>
                            <div className="text-gray-500">stops</div>
                        </div>
                        <div className="col-span-2 mt-1">
                            <label className="block text-xs text-gray-500 mb-1">Trip label</label>
                            <select
                                value={(selectedTrip as any).label || ''}
                                onChange={e => updateTripLabel(selectedTrip.id, e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">None</option>
                                <option value="business">Business</option>
                                <option value="personal">Personal</option>
                                <option value="commute">Commute</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Playback bar (bottom) */}
            {selectedTrip && locations.length >= 2 && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
                    {/* Scrubber */}
                    <div className="mb-2 relative">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full relative overflow-visible">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                        <input type="range" min={0} max={totalMs} value={virtualMs} step={1000}
                            onChange={e => { setIsPlaying(false); seek(parseInt(e.target.value)); }}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 -top-1.5" />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-3">
                        {/* Reset */}
                        <button onClick={() => { setIsPlaying(false); seek(0); }}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Reset">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {/* Play/Pause */}
                        <button onClick={() => setIsPlaying(p => !p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                            {isPlaying ? (
                                <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> Pause</>
                            ) : (
                                <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> Play</>
                            )}
                        </button>

                        {/* Speed selector */}
                        <div className="flex items-center gap-1">
                            {SPEEDS.map(s => (
                                <button key={s} onClick={() => setPlaybackSpeed(s)}
                                    className={`px-2 py-1 rounded text-xs font-medium ${playbackSpeed === s ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {s}×
                                </button>
                            ))}
                        </div>

                        <div className="flex-1" />

                        {/* Time + speed display */}
                        <div className="text-xs text-gray-500 text-right">
                            <span className="font-mono">{currentTimeLabel}</span>
                            {interpolated && (
                                <span className="ml-3 font-medium text-gray-700">{interpolated.speed.toFixed(1)} km/h</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!selectedTrip && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 rounded-xl shadow-lg p-8 text-center max-w-xs pointer-events-auto">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p className="text-gray-500 text-sm">Open the <strong>Trips</strong> panel, select a vehicle and date range, then pick a trip to replay it.</p>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {shareModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Share Trip</h2>
                            <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-gray-600">Anyone with this link can view the trip route and stats (no login required).</p>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={shareModal.url}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onFocus={e => e.target.select()}
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 whitespace-nowrap"
                                >
                                    Copy Link
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-4 border-t">
                            <button
                                onClick={handleRevoke}
                                className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50"
                            >
                                Revoke Link
                            </button>
                            <button
                                onClick={() => setShareModal(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
