import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Vehicle } from '../../types';

interface VehicleMapProps {
    vehicles: Vehicle[];
    onVehicleClick?: (vehicle: Vehicle) => void;
    selectedVehicleId?: number;
    center?: [number, number];
    route?: Array<{ lng: number; lat: number }>;
}

type MapStyle = 'dark' | 'light' | 'satellite';

const MAP_STYLES: Record<MapStyle, { label: string; tiles: string[] }> = {
    dark: {
        label: '🌙 Dark',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
    },
    light: {
        label: '☀️ Light',
        tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
    },
    satellite: {
        label: '🛰️ Satellite',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    },
};

function speedColor(speed: number | null | undefined): { bg: string; border: string; ring: string } {
    const s = parseFloat(speed as any) || 0;
    if (s >= 60) return { bg: '#ef4444', border: '#fca5a5', ring: 'bg-red-500' };
    if (s >= 20) return { bg: '#f97316', border: '#fdba74', ring: 'bg-orange-500' };
    if (s >= 5)  return { bg: '#22c55e', border: '#86efac', ring: 'bg-green-500' };
    return { bg: '#6b7280', border: '#d1d5db', ring: 'bg-gray-500' }; // stationary
}

function buildMarkerEl(vehicle: Vehicle, isSelected: boolean): HTMLDivElement {
    const loc = vehicle.latest_location;
    const heading = parseFloat(loc?.heading as any) || 0;
    const colors = speedColor(loc?.speed);

    const el = document.createElement('div');
    el.className = 'vehicle-marker';
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.cursor = 'pointer';

    const selectedRing = isSelected
        ? `box-shadow: 0 0 0 3px white, 0 0 0 5px ${colors.bg};`
        : '';

    el.innerHTML = `
        <div style="position:relative;width:36px;height:36px;">
            ${isSelected ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${colors.bg};opacity:0.3;animation:ping 1s cubic-bezier(0,0,.2,1) infinite;"></div>` : ''}
            <div style="
                position:relative;width:36px;height:36px;
                background:${colors.bg};border:2.5px solid ${colors.border};
                border-radius:50%;display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(0,0,0,0.4);
                ${selectedRing}
                transition: background 0.3s;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"
                    style="transform: rotate(${heading}deg); transition: transform 0.5s ease;">
                    <path d="M12 2L8 20l4-3 4 3z"/>
                </svg>
            </div>
        </div>
    `;
    return el;
}

export default function VehicleMap({ vehicles = [], onVehicleClick, selectedVehicleId, center, route }: VehicleMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const markersMap = useRef<globalThis.Map<number, { marker: maplibregl.Marker; el: HTMLDivElement }>>(new globalThis.Map());
    const vehiclesRef = useRef(vehicles);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
    const [styleMenuOpen, setStyleMenuOpen] = useState(false);

    vehiclesRef.current = vehicles;

    const applyStyle = useCallback((style: MapStyle, map: maplibregl.Map) => {
        const tiles = MAP_STYLES[style].tiles;
        if (map.getLayer('bg-layer')) map.removeLayer('bg-layer');
        if (map.getSource('bg-source')) map.removeSource('bg-source');
        map.addSource('bg-source', { type: 'raster', tiles, tileSize: 256 });
        map.addLayer({ id: 'bg-layer', type: 'raster', source: 'bg-source' }, map.getStyle().layers[0]?.id);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || mapInstance.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'bg-source': {
                        type: 'raster',
                        tiles: MAP_STYLES.dark.tiles,
                        tileSize: 256,
                    },
                },
                layers: [{
                    id: 'bg-layer',
                    type: 'raster',
                    source: 'bg-source',
                    minzoom: 0,
                    maxzoom: 22,
                }],
            },
            center: [-3.0357, 53.8175],
            zoom: 10,
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.on('load', () => setMapLoaded(true));
        map.on('error', (e) => console.error('[VehicleMap] error:', e));

        mapInstance.current = map;

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    // Change map style
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;
        applyStyle(mapStyle, mapInstance.current);
    }, [mapStyle, mapLoaded, applyStyle]);

    // Update markers with smooth animation + heading + speed colour
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;
        const map = mapInstance.current;
        const currentIds = new Set<number>();

        vehicles.forEach((vehicle) => {
            if (!vehicle?.latest_location) return;
            const loc = vehicle.latest_location;
            const id = vehicle.id;
            currentIds.add(id);
            const isSelected = id === selectedVehicleId;
            const existing = markersMap.current.get(id);

            if (!existing) {
                const el = buildMarkerEl(vehicle, isSelected);
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([parseFloat(loc.longitude as any), parseFloat(loc.latitude as any)])
                    .addTo(map);

                if (onVehicleClick) {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        onVehicleClick(vehicle);
                    });
                }
                markersMap.current.set(id, { marker, el });
            } else {
                // Smooth animated move
                const target: [number, number] = [parseFloat(loc.longitude as any), parseFloat(loc.latitude as any)];
                existing.marker.setLngLat(target);

                // Rebuild marker element to update heading/colour/selection
                const newEl = buildMarkerEl(vehicle, isSelected);
                if (onVehicleClick) {
                    newEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        onVehicleClick(vehicle);
                    });
                }
                existing.el.innerHTML = newEl.innerHTML;
            }
        });

        // Remove stale markers
        markersMap.current.forEach(({ marker }, id) => {
            if (!currentIds.has(id)) {
                marker.remove();
                markersMap.current.delete(id);
            }
        });
    }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick]);

    // Fly to selected vehicle
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded || !selectedVehicleId) return;
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        if (vehicle?.latest_location) {
            mapInstance.current.flyTo({
                center: [parseFloat(vehicle.latest_location.longitude as any), parseFloat(vehicle.latest_location.latitude as any)],
                zoom: Math.max(mapInstance.current.getZoom(), 14),
                speed: 1.2,
            });
        }
    }, [selectedVehicleId, mapLoaded]);

    // Fly to provided center
    useEffect(() => {
        if (mapInstance.current && center && mapLoaded) {
            mapInstance.current.flyTo({ center, zoom: 14 });
        }
    }, [center, mapLoaded]);

    // Draw route
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;
        const map = mapInstance.current;

        const cleanup = () => {
            try {
                if (map.getLayer('route-line')) map.removeLayer('route-line');
                if (map.getLayer('route-outline')) map.removeLayer('route-outline');
                if (map.getSource('route')) map.removeSource('route');
            } catch (_) {}
        };

        cleanup();

        if (!route || route.length === 0) return;

        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: route.map(r => [r.lng, r.lat]) },
            },
        });

        map.addLayer({ id: 'route-outline', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#1d4ed8', 'line-width': 7, 'line-opacity': 0.4 },
        });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.9 },
        });

        const bounds = new maplibregl.LngLatBounds();
        route.forEach(p => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: 60 });

        return cleanup;
    }, [route, mapLoaded]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

            {/* Map style switcher */}
            <div className="absolute bottom-8 left-4 z-10">
                <div className="relative">
                    <button
                        onClick={() => setStyleMenuOpen(o => !o)}
                        className="flex items-center gap-1.5 bg-white rounded-lg shadow-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        {MAP_STYLES[mapStyle].label}
                        <svg className={`h-3 w-3 text-gray-500 transition-transform ${styleMenuOpen ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {styleMenuOpen && (
                        <div className="absolute bottom-full mb-1 left-0 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                            {(Object.entries(MAP_STYLES) as [MapStyle, typeof MAP_STYLES[MapStyle]][]).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => { setMapStyle(key); setStyleMenuOpen(false); }}
                                    className={`block w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 whitespace-nowrap ${mapStyle === key ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                >
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                    <div className="text-white text-sm">Loading map…</div>
                </div>
            )}

            <style>{`
                @keyframes ping {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
