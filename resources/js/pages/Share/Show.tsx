import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ShareData {
    vehicle: { name: string; type: string };
    trip: {
        distance: number;
        duration: number;
        started_at: string;
        ended_at: string;
        start_address?: string;
        end_address?: string;
        average_speed?: number;
        max_speed?: number;
        driver_score?: number | null;
    };
    route_coordinates: Array<[number, number]>;
}

function ScoreBadge({ score }: { score?: number | null }) {
    if (score == null) return <span className="text-sm text-gray-400">No score</span>;
    const cls = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`text-sm font-semibold px-3 py-1 rounded-full ${cls}`}>{score}/100</span>;
}

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function pinEl(color: string, label: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.width = '28px';
    el.style.height = '34px';
    el.innerHTML = `<div style="position:relative;text-align:center;">
        <div style="width:28px;height:28px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);font-size:11px;font-weight:bold;color:white;">${label}</span>
        </div>
    </div>`;
    return el;
}

export default function ShareShow() {
    const { token } = useParams<{ token: string }>();
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const [shareData, setShareData] = useState<ShareData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        fetch(`/api/share/${token}`, { headers: { Accept: 'application/json' } })
            .then(async res => {
                if (!res.ok) { setErrorCode(res.status); setLoading(false); return; }
                const data = await res.json();
                setShareData(data);
                setLoading(false);
            })
            .catch(() => { setErrorCode(500); setLoading(false); });
    }, [token]);

    // Init map
    useEffect(() => {
        if (!mapContainer.current || mapInstance.current || !shareData) return;
        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: { 'bg': { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'], tileSize: 256 } },
                layers: [{ id: 'bg', type: 'raster', source: 'bg', minzoom: 0, maxzoom: 22 }],
            },
            center: shareData.route_coordinates[0] || [0, 0],
            zoom: 12,
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.on('load', () => setMapLoaded(true));
        mapInstance.current = map;
        return () => { map.remove(); mapInstance.current = null; };
    }, [shareData]);

    // Render route + markers once map is loaded
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded || !shareData) return;
        const map = mapInstance.current;
        const coords = shareData.route_coordinates;
        if (coords.length < 2) return;

        map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
        });
        map.addLayer({ id: 'route-outline', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#1d4ed8', 'line-width': 7, 'line-opacity': 0.3 },
        });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3b82f6', 'line-width': 4 },
        });

        new maplibregl.Marker({ element: pinEl('#16a34a', 'A') }).setLngLat(coords[0] as [number, number]).addTo(map);
        new maplibregl.Marker({ element: pinEl('#dc2626', 'B') }).setLngLat(coords[coords.length - 1] as [number, number]).addTo(map);

        const bounds = new maplibregl.LngLatBounds();
        coords.forEach(c => bounds.extend(c as [number, number]));
        map.fitBounds(bounds, { padding: 60 });
    }, [mapLoaded, shareData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (errorCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
                    <div className="text-4xl mb-4">{errorCode === 410 ? '⏰' : '🔒'}</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        {errorCode === 410 ? 'Link Expired' : errorCode === 404 ? 'Link Not Found' : 'Something Went Wrong'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {errorCode === 410
                            ? 'This shared trip link has expired or been revoked.'
                            : errorCode === 404
                            ? 'This trip link does not exist. It may have been removed.'
                            : 'An unexpected error occurred. Please try again later.'}
                    </p>
                </div>
            </div>
        );
    }

    if (!shareData) return null;

    const { vehicle, trip } = shareData;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🚗</span>
                        <span className="text-lg font-bold text-gray-900">Vehicle Tracker</span>
                    </div>
                    <div className="text-sm text-gray-500">Shared Trip</div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
                {/* Vehicle + trip header */}
                <div className="bg-white rounded-xl shadow p-5 mb-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{vehicle.name}</h1>
                            <p className="text-sm text-gray-500 capitalize">{vehicle.type}</p>
                        </div>
                        <ScoreBadge score={trip.driver_score} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <div className="text-lg font-bold text-blue-600">{parseFloat(String(trip.distance || 0)).toFixed(1)} km</div>
                            <div className="text-xs text-gray-500">Distance</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-green-600">{formatDuration(trip.duration)}</div>
                            <div className="text-xs text-gray-500">Duration</div>
                        </div>
                        {trip.average_speed != null && (
                            <div>
                                <div className="text-lg font-bold text-orange-500">{parseFloat(String(trip.average_speed)).toFixed(0)} km/h</div>
                                <div className="text-xs text-gray-500">Avg Speed</div>
                            </div>
                        )}
                        {trip.max_speed != null && (
                            <div>
                                <div className="text-lg font-bold text-red-500">{parseFloat(String(trip.max_speed)).toFixed(0)} km/h</div>
                                <div className="text-xs text-gray-500">Max Speed</div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500">Started: </span>
                            <span className="font-medium">{new Date(trip.started_at).toLocaleString()}</span>
                            {trip.start_address && <p className="text-xs text-gray-400 mt-0.5">{trip.start_address}</p>}
                        </div>
                        <div>
                            <span className="text-gray-500">Ended: </span>
                            <span className="font-medium">{new Date(trip.ended_at).toLocaleString()}</span>
                            {trip.end_address && <p className="text-xs text-gray-400 mt-0.5">{trip.end_address}</p>}
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: '400px' }}>
                    <div ref={mapContainer} className="w-full h-full" />
                </div>
            </div>

            <footer className="bg-white border-t border-gray-100 py-3 text-center text-xs text-gray-400">
                Shared via Vehicle Tracker
            </footer>
        </div>
    );
}
