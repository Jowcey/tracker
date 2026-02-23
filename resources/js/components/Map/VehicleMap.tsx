import React, { useRef, useEffect, useState } from 'react';
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

export default function VehicleMap({ vehicles = [], onVehicleClick, selectedVehicleId, center, route }: VehicleMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const markersMap = useRef<globalThis.Map<number, maplibregl.Marker>>(new globalThis.Map());
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || mapInstance.current) return;

        console.log('[VehicleMap] Initializing map...');

        try {
            mapInstance.current = new maplibregl.Map({
                container: mapContainer.current,
                style: {
                    version: 8,
                    sources: {
                        'carto-dark': {
                            type: 'raster',
                            tiles: [
                                'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                            ],
                            tileSize: 256,
                        },
                    },
                    layers: [
                        {
                            id: 'carto-dark-layer',
                            type: 'raster',
                            source: 'carto-dark',
                            minzoom: 0,
                            maxzoom: 22,
                        },
                    ],
                },
                center: [-3.0357, 53.8175],
                zoom: 10,
            });

            mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right');
            mapInstance.current.on('load', () => {
                console.log('[VehicleMap] Map loaded successfully');
                setMapLoaded(true);
            });
            
            mapInstance.current.on('error', (e) => {
                console.error('[VehicleMap] Map error:', e);
            });

            console.log('[VehicleMap] Map instance created');
        } catch (error) {
            console.error('[VehicleMap] Failed to create map:', error);
        }

        return () => {
            console.log('[VehicleMap] Cleaning up map');
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Update markers
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded || !vehicles) return;

        const currentMarkers = new Set<number>();

        vehicles.forEach((vehicle) => {
            if (!vehicle?.latest_location) return;

            const location = vehicle.latest_location;
            const vehicleId = vehicle.id;
            currentMarkers.add(vehicleId);

            let marker = markersMap.current.get(vehicleId);

            if (!marker) {
                const el = document.createElement('div');
                el.className = 'vehicle-marker';
                el.style.width = '32px';
                el.style.height = '32px';
                el.style.cursor = 'pointer';
                el.innerHTML = `
                    <div class="relative">
                        <div class="absolute inset-0 rounded-full bg-blue-500 opacity-25 animate-ping"></div>
                        <div class="relative flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg">
                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                            </svg>
                        </div>
                    </div>
                `;

                marker = new maplibregl.Marker({ element: el })
                    .setLngLat([location.longitude, location.latitude])
                    .addTo(mapInstance.current!);

                if (onVehicleClick) {
                    el.addEventListener('click', () => onVehicleClick(vehicle));
                }

                markersMap.current.set(vehicleId, marker);
            } else {
                marker.setLngLat([location.longitude, location.latitude]);
            }
        });

        markersMap.current.forEach((marker, vehicleId) => {
            if (!currentMarkers.has(vehicleId)) {
                marker.remove();
                markersMap.current.delete(vehicleId);
            }
        });

        if (vehicles.length > 0 && vehicles.some((v) => v.latest_location)) {
            const bounds = new maplibregl.LngLatBounds();
            vehicles.forEach((vehicle) => {
                if (vehicle.latest_location) {
                    bounds.extend([vehicle.latest_location.longitude, vehicle.latest_location.latitude]);
                }
            });
            mapInstance.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
    }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick]);

    // Update center when provided
    useEffect(() => {
        if (mapInstance.current && center && mapLoaded) {
            mapInstance.current.flyTo({ center, zoom: 14 });
        }
    }, [center, mapLoaded]);

    // Draw route when provided
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded || !route || route.length === 0) return;

        const map = mapInstance.current;

        // Remove existing route if any
        if (map.getLayer('route')) {
            map.removeLayer('route');
        }
        if (map.getSource('route')) {
            map.removeSource('route');
        }

        // Add route
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: route.map(r => [r.lng, r.lat])
                }
            }
        });

        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3b82f6',
                'line-width': 4,
                'line-opacity': 0.8
            }
        });

        // Fit bounds to route
        if (route.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            route.forEach(point => bounds.extend([point.lng, point.lat]));
            map.fitBounds(bounds, { padding: 50 });
        }

        return () => {
            // Only clean up if map still exists and is not being destroyed
            if (mapInstance.current && mapInstance.current.getStyle()) {
                try {
                    if (mapInstance.current.getLayer('route')) {
                        mapInstance.current.removeLayer('route');
                    }
                    if (mapInstance.current.getSource('route')) {
                        mapInstance.current.removeSource('route');
                    }
                } catch (error) {
                    // Map is being destroyed, ignore cleanup errors
                    console.debug('[VehicleMap] Route cleanup skipped (map destroying)');
                }
            }
        };
    }, [route, mapLoaded]);

    return (
        <div className="relative w-full h-full" style={{ minHeight: '600px' }}>
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                    <div className="text-white">Loading map...</div>
                </div>
            )}
        </div>
    );
}
