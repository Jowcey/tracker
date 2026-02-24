import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Vehicle, Geofence } from '../../types';

interface VehicleMapProps {
    vehicles: Vehicle[];
    onVehicleClick?: (vehicle: Vehicle) => void;
    selectedVehicleId?: number;
    center?: [number, number];
    route?: Array<{ lng: number; lat: number }>;      // travelled portion (bright)
    fullRoute?: Array<{ lng: number; lat: number }>;  // full trip route (faint)
    disableAutoBounds?: boolean;
    geofences?: Geofence[];
    showGeofences?: boolean;
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

function speedColor(speed: number | null | undefined): { bg: string; border: string } {
    const s = parseFloat(speed as any) || 0;
    if (s >= 60) return { bg: '#ef4444', border: '#fca5a5' };
    if (s >= 20) return { bg: '#f97316', border: '#fdba74' };
    if (s >= 5)  return { bg: '#22c55e', border: '#86efac' };
    return { bg: '#6b7280', border: '#d1d5db' };
}

function buildMarkerEl(vehicle: Vehicle, isSelected: boolean): HTMLDivElement {
    const loc = vehicle.latest_location;
    const heading = parseFloat(loc?.heading as any) || 0;
    const colors = speedColor(loc?.speed);
    const el = document.createElement('div');
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.cursor = 'pointer';
    const ring = isSelected
        ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${colors.bg};opacity:0.3;animation:ping 1s cubic-bezier(0,0,.2,1) infinite;"></div>`
        : '';
    el.innerHTML = `<div style="position:relative;width:36px;height:36px;">
        ${ring}
        <div style="position:relative;width:36px;height:36px;background:${colors.bg};border:2.5px solid ${colors.border};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);${isSelected ? `box-shadow:0 0 0 3px white,0 0 0 5px ${colors.bg};` : ''}transition:background 0.3s;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="transform:rotate(${heading}deg);transition:transform 0.5s ease;">
                <path d="M12 2L8 20l4-3 4 3z"/>
            </svg>
        </div>
    </div>`;
    return el;
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

/** Generate a 64-point polygon approximating a circle on the map */
function circlePolygon(lng: number, lat: number, radiusMeters: number): [number, number][] {
    const n = 64;
    const coords: [number, number][] = [];
    const latRad = lat * Math.PI / 180;
    for (let i = 0; i <= n; i++) {
        const angle = (i / n) * 2 * Math.PI;
        const dLat = (radiusMeters / 111320) * Math.sin(angle);
        const dLng = (radiusMeters / (111320 * Math.cos(latRad))) * Math.cos(angle);
        coords.push([lng + dLng, lat + dLat]);
    }
    return coords;
}

export default function VehicleMap({
    vehicles = [], onVehicleClick, selectedVehicleId,
    center, route, fullRoute, disableAutoBounds = false,
    geofences = [], showGeofences = true,
}: VehicleMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const markersMap = useRef<globalThis.Map<number, { marker: maplibregl.Marker; el: HTMLDivElement }>>(new globalThis.Map());
    const startPin = useRef<maplibregl.Marker | null>(null);
    const endPin = useRef<maplibregl.Marker | null>(null);
    const hasFitBounds = useRef(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
    const [styleMenuOpen, setStyleMenuOpen] = useState(false);

    const applyStyle = useCallback((style: MapStyle, map: maplibregl.Map) => {
        const tiles = MAP_STYLES[style].tiles;
        try {
            if (map.getLayer('bg-layer')) map.removeLayer('bg-layer');
            if (map.getSource('bg-source')) map.removeSource('bg-source');
        } catch (_) {}
        map.addSource('bg-source', { type: 'raster', tiles, tileSize: 256 });
        map.addLayer({ id: 'bg-layer', type: 'raster', source: 'bg-source' }, map.getStyle().layers[0]?.id);
    }, []);

    useEffect(() => {
        if (!mapContainer.current || mapInstance.current) return;
        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: { 'bg-source': { type: 'raster', tiles: MAP_STYLES.dark.tiles, tileSize: 256 } },
                layers: [{ id: 'bg-layer', type: 'raster', source: 'bg-source', minzoom: 0, maxzoom: 22 }],
            },
            center: [-3.0357, 53.8175],
            zoom: 10,
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.on('load', () => setMapLoaded(true));
        map.on('error', (e) => console.error('[VehicleMap]', e));
        mapInstance.current = map;
        return () => { map.remove(); mapInstance.current = null; hasFitBounds.current = false; };
    }, []);

    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;
        applyStyle(mapStyle, mapInstance.current);
    }, [mapStyle, mapLoaded, applyStyle]);

    // Geofence rendering
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;
        const map = mapInstance.current;

        // Clean up existing geofence layers/sources
        const cleanup = () => {
            geofences.forEach(gf => {
                const fillId = `geofence-fill-${gf.id}`;
                const lineId = `geofence-line-${gf.id}`;
                const sourceId = `geofence-source-${gf.id}`;
                try { if (map.getLayer(lineId)) map.removeLayer(lineId); } catch (_) {}
                try { if (map.getLayer(fillId)) map.removeLayer(fillId); } catch (_) {}
                try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch (_) {}
            });
        };

        cleanup();

        geofences.forEach(gf => {
            let ring: [number, number][];
            if (gf.type === 'circle' && gf.center_longitude != null && gf.center_latitude != null && gf.radius) {
                ring = circlePolygon(Number(gf.center_longitude), Number(gf.center_latitude), Number(gf.radius));
            } else if (gf.type === 'polygon' && gf.coordinates?.length) {
                ring = gf.coordinates as [number, number][];
                // Ensure ring is closed
                if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
                    ring = [...ring, ring[0]];
                }
            } else {
                return;
            }

            const color = gf.color || '#3b82f6';
            const fillId = `geofence-fill-${gf.id}`;
            const lineId = `geofence-line-${gf.id}`;
            const sourceId = `geofence-source-${gf.id}`;
            const visibility = showGeofences ? 'visible' : 'none';

            map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: { name: gf.name },
                    geometry: { type: 'Polygon', coordinates: [ring] },
                },
            });
            map.addLayer({
                id: fillId, type: 'fill', source: sourceId,
                layout: { visibility },
                paint: { 'fill-color': color, 'fill-opacity': 0.15 },
            });
            map.addLayer({
                id: lineId, type: 'line', source: sourceId,
                layout: { visibility },
                paint: { 'line-color': color, 'line-width': 2 },
            });
        });

        return cleanup;
    }, [geofences, mapLoaded]);

    // Toggle geofence visibility
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded || !geofences.length) return;
        const map = mapInstance.current;
        const visibility = showGeofences ? 'visible' : 'none';
        geofences.forEach(gf => {
            try { if (map.getLayer(`geofence-fill-${gf.id}`)) map.setLayoutProperty(`geofence-fill-${gf.id}`, 'visibility', visibility); } catch (_) {}
            try { if (map.getLayer(`geofence-line-${gf.id}`)) map.setLayoutProperty(`geofence-line-${gf.id}`, 'visibility', visibility); } catch (_) {}
        });
    }, [showGeofences, mapLoaded, geofences]);

    // Full route (faint dashed) + start/end pins
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;
        const map = mapInstance.current;

        // Remove old full route
        try {
            if (map.getLayer('full-route-line')) map.removeLayer('full-route-line');
            if (map.getSource('full-route')) map.removeSource('full-route');
        } catch (_) {}

        startPin.current?.remove(); startPin.current = null;
        endPin.current?.remove(); endPin.current = null;

        if (!fullRoute || fullRoute.length < 2) return;

        map.addSource('full-route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: fullRoute.map(p => [p.lng, p.lat]) } },
        });
        map.addLayer({ id: 'full-route-line', type: 'line', source: 'full-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#94a3b8', 'line-width': 3, 'line-opacity': 0.4, 'line-dasharray': [2, 2] },
        });

        // Start pin (green A) and end pin (red B)
        startPin.current = new maplibregl.Marker({ element: pinEl('#16a34a', 'A') })
            .setLngLat([fullRoute[0].lng, fullRoute[0].lat]).addTo(map);
        endPin.current = new maplibregl.Marker({ element: pinEl('#dc2626', 'B') })
            .setLngLat([fullRoute[fullRoute.length - 1].lng, fullRoute[fullRoute.length - 1].lat]).addTo(map);

        // Fit to full route once
        if (!hasFitBounds.current) {
            const bounds = new maplibregl.LngLatBounds();
            fullRoute.forEach(p => bounds.extend([p.lng, p.lat]));
            map.fitBounds(bounds, { padding: 80 });
            hasFitBounds.current = true;
        }

        return () => {
            try {
                if (map.getLayer('full-route-line')) map.removeLayer('full-route-line');
                if (map.getSource('full-route')) map.removeSource('full-route');
            } catch (_) {}
            startPin.current?.remove(); startPin.current = null;
            endPin.current?.remove(); endPin.current = null;
        };
    }, [fullRoute, mapLoaded]);

    // Travelled route (bright)
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
        if (!route || route.length < 2) return;

        map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.map(r => [r.lng, r.lat]) } },
        });
        map.addLayer({ id: 'route-outline', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#1d4ed8', 'line-width': 7, 'line-opacity': 0.35 },
        });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.9 },
        });

        // Fit to full route if no fullRoute (live tracking route)
        if (!fullRoute && !disableAutoBounds) {
            const bounds = new maplibregl.LngLatBounds();
            route.forEach(p => bounds.extend([p.lng, p.lat]));
            map.fitBounds(bounds, { padding: 60 });
        }
        return cleanup;
    }, [route, mapLoaded, fullRoute, disableAutoBounds]);

    // Vehicle markers
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
            const lngLat: [number, number] = [parseFloat(loc.longitude as any), parseFloat(loc.latitude as any)];
            const existing = markersMap.current.get(id);

            if (!existing) {
                const el = buildMarkerEl(vehicle, isSelected);
                const marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
                if (onVehicleClick) el.addEventListener('click', (e) => { e.stopPropagation(); onVehicleClick(vehicle); });
                markersMap.current.set(id, { marker, el });
            } else {
                existing.marker.setLngLat(lngLat);
                const newEl = buildMarkerEl(vehicle, isSelected);
                if (onVehicleClick) newEl.addEventListener('click', (e) => { e.stopPropagation(); onVehicleClick(vehicle); });
                existing.el.innerHTML = newEl.innerHTML;
            }
        });

        markersMap.current.forEach(({ marker }, id) => {
            if (!currentIds.has(id)) { marker.remove(); markersMap.current.delete(id); }
        });

        // Auto-fit only on first load (live tracking, no fullRoute)
        if (!disableAutoBounds && !hasFitBounds.current && vehicles.some(v => v.latest_location)) {
            const bounds = new maplibregl.LngLatBounds();
            vehicles.forEach(v => { if (v.latest_location) bounds.extend([parseFloat(v.latest_location.longitude as any), parseFloat(v.latest_location.latitude as any)]); });
            map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
            hasFitBounds.current = true;
        }
    }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick, disableAutoBounds, fullRoute]);

    // Fly to selected vehicle
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded || !selectedVehicleId || disableAutoBounds) return;
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        if (vehicle?.latest_location) {
            mapInstance.current.flyTo({
                center: [parseFloat(vehicle.latest_location.longitude as any), parseFloat(vehicle.latest_location.latitude as any)],
                zoom: Math.max(mapInstance.current.getZoom(), 14),
                speed: 1.2,
            });
        }
    }, [selectedVehicleId, mapLoaded, disableAutoBounds]);

    useEffect(() => {
        if (mapInstance.current && center && mapLoaded) {
            mapInstance.current.flyTo({ center, zoom: 14 });
        }
    }, [center, mapLoaded]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            <div className="absolute bottom-8 left-4 z-10">
                <div className="relative">
                    <button onClick={() => setStyleMenuOpen(o => !o)}
                        className="flex items-center gap-1.5 bg-white rounded-lg shadow-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        {MAP_STYLES[mapStyle].label}
                        <svg className={`h-3 w-3 text-gray-500 transition-transform ${styleMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {styleMenuOpen && (
                        <div className="absolute bottom-full mb-1 left-0 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                            {(Object.entries(MAP_STYLES) as [MapStyle, typeof MAP_STYLES[MapStyle]][]).map(([key, val]) => (
                                <button key={key} onClick={() => { setMapStyle(key); setStyleMenuOpen(false); }}
                                    className={`block w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 whitespace-nowrap ${mapStyle === key ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
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
            <style>{`@keyframes ping { 75%,100% { transform:scale(2);opacity:0; } }`}</style>
        </div>
    );
}
