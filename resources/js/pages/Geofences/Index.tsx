import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSpeedUnit } from '../../hooks/useSpeedUnit';
import api from '../../lib/axios';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import toast from 'react-hot-toast';

interface Geofence {
    id: number;
    name: string;
    description?: string;
    type: 'circle' | 'polygon';
    center_latitude?: number;
    center_longitude?: number;
    radius?: number;
    coordinates?: [number, number][];
    color: string;
    is_active: boolean;
    speed_limit_kmh?: number | null;
}

interface GeofenceForm {
    name: string;
    description: string;
    color: string;
    is_active: boolean;
    speed_limit_kmh: number | '';
    radius: number;
}

type DrawMode = 'select' | 'polygon' | 'rectangle' | 'circle';

function circleRing(lng: number, lat: number, radiusM: number, steps = 64): [number, number][] {
    const coords: [number, number][] = [];
    const latRad = lat * Math.PI / 180;
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusM / 111320) * Math.sin(angle);
        const dLng = (radiusM / (111320 * Math.cos(latRad))) * Math.cos(angle);
        coords.push([lng + dLng, lat + dLat]);
    }
    return coords;
}

function rectRing(a: [number, number], b: [number, number]): [number, number][] {
    return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]];
}

const DEFAULT_FORM: GeofenceForm = { name: '', description: '', color: '#3b82f6', is_active: true, speed_limit_kmh: '', radius: 500 };
const TILE_STYLE = {
    version: 8 as const,
    sources: { carto: { type: 'raster' as const, tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© CARTO' } },
    layers: [{ id: 'carto', type: 'raster' as const, source: 'carto' }],
};

export default function GeofencesIndex() {
    const { currentOrganization } = useAuth();
    const { convert: toSpeedUnit, toKmh, label: speedLabel } = useSpeedUnit();

    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [loading, setLoading] = useState(false);

    // Drawing state (refs for use inside map callbacks)
    const [drawMode, setDrawMode] = useState<DrawMode>('select');
    const drawModeRef = useRef<DrawMode>('select');
    const polyPointsRef = useRef<[number, number][]>([]);
    const [polyPoints, setPolyPoints] = useState<[number, number][]>([]);
    const rectStartRef = useRef<[number, number] | null>(null);
    const isDraggingRef = useRef(false);
    const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
    const circleCenterRef = useRef<[number, number] | null>(null);
    const [circleRadius, setCircleRadius] = useState(500);
    const circleRadiusRef = useRef(500);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [pendingShape, setPendingShape] = useState<
        | { type: 'circle'; center: [number, number]; radius: number }
        | { type: 'polygon'; coords: [number, number][] }
        | null
    >(null);
    const [form, setForm] = useState<GeofenceForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    // ── API ──────────────────────────────────────────────────────────────────
    const fetchGeofences = useCallback(async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/geofences`);
            setGeofences(data.data || []);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [currentOrganization]);

    useEffect(() => { fetchGeofences(); }, [fetchGeofences]);

    // ── Map init ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;
        const m = new maplibregl.Map({
            container: mapContainer.current,
            style: TILE_STYLE,
            center: [0, 20],
            zoom: 2,
        });
        m.addControl(new maplibregl.NavigationControl(), 'top-left');
        m.on('load', () => {
            // Preview layer
            m.addSource('draw-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            m.addLayer({ id: 'draw-preview-fill', type: 'fill', source: 'draw-preview', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 }, filter: ['==', '$type', 'Polygon'] });
            m.addLayer({ id: 'draw-preview-line', type: 'line', source: 'draw-preview', paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [4, 2] } });
            m.addSource('draw-vertices', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            m.addLayer({ id: 'draw-vertices-dots', type: 'circle', source: 'draw-vertices', paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-width': 2, 'circle-stroke-color': '#3b82f6' } });
            setMapLoaded(true);
        });
        mapRef.current = m;
        return () => { m.remove(); mapRef.current = null; };
    }, []);

    // ── Render geofences as map layers ───────────────────────────────────────
    useEffect(() => {
        const m = mapRef.current;
        if (!m || !mapLoaded) return;
        // Remove old layers
        [...m.getStyle().layers || []].forEach(l => {
            if (l.id.startsWith('gf-fill-') || l.id.startsWith('gf-line-')) try { m.removeLayer(l.id); } catch {}
        });
        [...Object.keys((m.getStyle().sources || {}))].forEach(s => {
            if (s.startsWith('gf-src-')) try { m.removeSource(s); } catch {}
        });
        geofences.forEach(gf => {
            let ring: [number, number][] = [];
            if (gf.type === 'circle' && gf.center_longitude != null && gf.center_latitude != null && gf.radius) {
                ring = circleRing(Number(gf.center_longitude), Number(gf.center_latitude), Number(gf.radius));
            } else if (gf.type === 'polygon' && gf.coordinates?.length) {
                ring = gf.coordinates as [number, number][];
            }
            if (!ring.length) return;
            const src = `gf-src-${gf.id}`;
            m.addSource(src, { type: 'geojson', data: { type: 'Feature', properties: { color: gf.color }, geometry: { type: 'Polygon', coordinates: [ring] } } });
            m.addLayer({ id: `gf-fill-${gf.id}`, type: 'fill', source: src, paint: { 'fill-color': gf.color, 'fill-opacity': gf.is_active ? 0.15 : 0.05 } }, 'draw-preview-fill');
            m.addLayer({ id: `gf-line-${gf.id}`, type: 'line', source: src, paint: { 'line-color': gf.color, 'line-width': 2, 'line-opacity': gf.is_active ? 1 : 0.4 } }, 'draw-preview-fill');
        });
    }, [geofences, mapLoaded]);

    // ── Preview update helper ─────────────────────────────────────────────────
    const updatePreview = useCallback((ring: [number, number][], color = '#3b82f6') => {
        const m = mapRef.current;
        if (!m || !m.getSource('draw-preview')) return;
        if (!ring.length) {
            (m.getSource('draw-preview') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
            (m.getSource('draw-vertices') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
            return;
        }
        (m.getSource('draw-preview') as maplibregl.GeoJSONSource).setData({
            type: 'Feature', properties: { color },
            geometry: { type: ring.length >= 3 ? 'Polygon' : 'LineString', coordinates: ring.length >= 3 ? [ring] : ring },
        } as any);
        (m.getSource('draw-vertices') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: ring.slice(0, -1).map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } })),
        });
    }, []);

    // ── Map cursor & drawing events ──────────────────────────────────────────
    useEffect(() => {
        const m = mapRef.current;
        if (!m || !mapLoaded) return;

        m.getCanvas().style.cursor = drawMode === 'select' ? '' : 'crosshair';

        const onMouseMove = (e: maplibregl.MapMouseEvent) => {
            const pos: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            const mode = drawModeRef.current;

            if (mode === 'polygon') {
                const pts = polyPointsRef.current;
                if (pts.length > 0) {
                    const preview = [...pts, pos];
                    if (pts.length >= 2) preview.push(pts[0]); // close
                    updatePreview(preview);
                }
            } else if (mode === 'rectangle' && isDraggingRef.current && rectStartRef.current) {
                updatePreview(rectRing(rectStartRef.current, pos));
            } else if (mode === 'circle' && circleCenterRef.current) {
                // Mouse distance as radius preview
                const dx = (pos[0] - circleCenterRef.current[0]) * 111320 * Math.cos(circleCenterRef.current[1] * Math.PI / 180);
                const dy = (pos[1] - circleCenterRef.current[1]) * 111320;
                const r = Math.max(50, Math.round(Math.sqrt(dx * dx + dy * dy)));
                circleRadiusRef.current = r;
                setCircleRadius(r);
                updatePreview(circleRing(circleCenterRef.current[0], circleCenterRef.current[1], r));
            }
        };

        const onClick = (e: maplibregl.MapMouseEvent) => {
            const pos: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            const mode = drawModeRef.current;

            if (mode === 'polygon') {
                const pts = [...polyPointsRef.current, pos];
                polyPointsRef.current = pts;
                setPolyPoints([...pts]);
                if (pts.length >= 3) updatePreview([...pts, pts[0]]);
            } else if (mode === 'circle') {
                if (!circleCenterRef.current) {
                    // First click = center
                    circleCenterRef.current = pos;
                    setCircleCenter(pos);
                    updatePreview(circleRing(pos[0], pos[1], circleRadiusRef.current));
                } else {
                    // Second click = confirm
                    finishCircle(circleCenterRef.current, circleRadiusRef.current);
                }
            }
        };

        const onDblClick = (e: maplibregl.MapMouseEvent) => {
            e.preventDefault();
            if (drawModeRef.current === 'polygon') {
                const pts = polyPointsRef.current;
                if (pts.length >= 3) finishPolygon(pts);
            }
        };

        const onMouseDown = (e: maplibregl.MapMouseEvent) => {
            if (drawModeRef.current !== 'rectangle') return;
            e.preventDefault();
            isDraggingRef.current = true;
            rectStartRef.current = [e.lngLat.lng, e.lngLat.lat];
        };

        const onMouseUp = (e: maplibregl.MapMouseEvent) => {
            if (drawModeRef.current !== 'rectangle' || !isDraggingRef.current || !rectStartRef.current) return;
            isDraggingRef.current = false;
            const end: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            const ring = rectRing(rectStartRef.current, end);
            if (Math.abs(ring[0][0] - ring[1][0]) > 0.0001 && Math.abs(ring[0][1] - ring[3][1]) > 0.0001) {
                finishPolygon(ring.slice(0, -1));
            }
            rectStartRef.current = null;
        };

        m.on('mousemove', onMouseMove);
        m.on('click', onClick);
        m.on('dblclick', onDblClick);
        m.on('mousedown', onMouseDown);
        m.on('mouseup', onMouseUp);
        return () => {
            m.off('mousemove', onMouseMove);
            m.off('click', onClick);
            m.off('dblclick', onDblClick);
            m.off('mousedown', onMouseDown);
            m.off('mouseup', onMouseUp);
        };
    }, [drawMode, mapLoaded, updatePreview]);

    // ── Finish drawing ────────────────────────────────────────────────────────
    const finishPolygon = (pts: [number, number][]) => {
        setPendingShape({ type: 'polygon', coords: pts });
        setForm({ ...DEFAULT_FORM });
        setEditingId(null);
        setShowForm(true);
        resetDraw('select');
        updatePreview([...pts, pts[0]]);
    };

    const finishCircle = (center: [number, number], radius: number) => {
        setPendingShape({ type: 'circle', center, radius });
        setForm({ ...DEFAULT_FORM, radius });
        setEditingId(null);
        setShowForm(true);
        updatePreview(circleRing(center[0], center[1], radius));
        setDrawMode('select');
        drawModeRef.current = 'select';
    };

    const resetDraw = (mode: DrawMode = 'select') => {
        polyPointsRef.current = [];
        setPolyPoints([]);
        rectStartRef.current = null;
        isDraggingRef.current = false;
        circleCenterRef.current = null;
        setCircleCenter(null);
        setDrawMode(mode);
        drawModeRef.current = mode;
    };

    const cancelDraw = () => {
        resetDraw('select');
        updatePreview([]);
    };

    const activateMode = (mode: DrawMode) => {
        setShowForm(false);
        setPendingShape(null);
        resetDraw(mode);
        updatePreview([]);
    };

    // ── Circle radius slider live update ──────────────────────────────────────
    useEffect(() => {
        if (!circleCenterRef.current || drawMode !== 'circle') return;
        circleRadiusRef.current = circleRadius;
        updatePreview(circleRing(circleCenterRef.current[0], circleCenterRef.current[1], circleRadius));
    }, [circleRadius, drawMode, updatePreview]);

    // ── Edit existing geofence ─────────────────────────────────────────────────
    const openEdit = (gf: Geofence) => {
        cancelDraw();
        setEditingId(gf.id);
        setForm({
            name: gf.name,
            description: gf.description || '',
            color: gf.color,
            is_active: gf.is_active,
            speed_limit_kmh: gf.speed_limit_kmh != null ? Math.round(toSpeedUnit(gf.speed_limit_kmh)) : '',
            radius: gf.radius || 500,
        });
        if (gf.type === 'circle' && gf.center_longitude != null && gf.center_latitude != null) {
            const shape: { type: 'circle'; center: [number, number]; radius: number } = {
                type: 'circle', center: [Number(gf.center_longitude), Number(gf.center_latitude)], radius: gf.radius || 500
            };
            setPendingShape(shape);
            updatePreview(circleRing(shape.center[0], shape.center[1], shape.radius), gf.color);
        } else if (gf.type === 'polygon' && gf.coordinates?.length) {
            const shape: { type: 'polygon'; coords: [number, number][] } = {
                type: 'polygon', coords: gf.coordinates as [number, number][]
            };
            setPendingShape(shape);
            updatePreview([...shape.coords, shape.coords[0]], gf.color);
        }
        setShowForm(true);
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrganization || !pendingShape) return;
        setSaving(true);
        try {
            const base = {
                name: form.name,
                description: form.description || null,
                color: form.color,
                is_active: form.is_active,
                speed_limit_kmh: form.speed_limit_kmh !== '' ? Math.round(toKmh(form.speed_limit_kmh as number)) : null,
            };
            let payload: Record<string, unknown>;
            if (pendingShape.type === 'circle') {
                payload = { ...base, type: 'circle', center_latitude: pendingShape.center[1], center_longitude: pendingShape.center[0], radius: form.radius };
            } else {
                payload = { ...base, type: 'polygon', coordinates: pendingShape.coords };
            }
            if (editingId) {
                await api.put(`/organizations/${currentOrganization.id}/geofences/${editingId}`, payload);
                toast.success('Geofence updated');
            } else {
                await api.post(`/organizations/${currentOrganization.id}/geofences`, payload);
                toast.success('Geofence created');
            }
            setShowForm(false);
            setPendingShape(null);
            setEditingId(null);
            updatePreview([]);
            fetchGeofences();
        } catch { toast.error('Failed to save geofence'); } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!currentOrganization || !confirm('Delete this geofence?')) return;
        await api.delete(`/organizations/${currentOrganization.id}/geofences/${id}`);
        toast.success('Geofence deleted');
        if (editingId === id) { setShowForm(false); setPendingShape(null); updatePreview([]); }
        fetchGeofences();
    };

    const toggleActive = async (gf: Geofence) => {
        if (!currentOrganization) return;
        await api.put(`/organizations/${currentOrganization.id}/geofences/${gf.id}`, { is_active: !gf.is_active });
        fetchGeofences();
    };

    const drawModeLabel: Record<DrawMode, string> = {
        select: 'Select', polygon: 'Drawing polygon…', rectangle: 'Drawing rectangle…', circle: circleCenter ? 'Click to confirm circle' : 'Click to place centre',
    };

    return (
        <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
            {/* ── Map ─────────────────────────────────────────────────── */}
            <div className="flex-1 relative">
                <div ref={mapContainer} className="w-full h-full" />

                {/* Draw toolbar */}
                <div className="absolute top-14 left-3 z-10 flex flex-col gap-1.5">
                    {(['select', 'polygon', 'rectangle', 'circle'] as DrawMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => activateMode(mode)}
                            title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                            className={`w-9 h-9 rounded-lg shadow flex items-center justify-center text-lg transition-colors ${
                                drawMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                            {mode === 'select' && '↖'}
                            {mode === 'polygon' && '⬡'}
                            {mode === 'rectangle' && '▭'}
                            {mode === 'circle' && '◯'}
                        </button>
                    ))}
                    {drawMode !== 'select' && (
                        <button onClick={cancelDraw}
                            className="w-9 h-9 rounded-lg shadow bg-red-500 text-white flex items-center justify-center text-lg hover:bg-red-600">
                            ✕
                        </button>
                    )}
                </div>

                {/* Draw mode hint */}
                {drawMode !== 'select' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur rounded-full px-4 py-1.5 shadow text-sm text-gray-700">
                        {drawModeLabel[drawMode]}
                        {drawMode === 'polygon' && polyPoints.length > 0 && ` (${polyPoints.length} points — double-click to finish)`}
                    </div>
                )}

                {/* Circle radius slider (shows when center is placed) */}
                {drawMode === 'circle' && circleCenter && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
                        <span className="text-sm text-gray-600 whitespace-nowrap">Radius:</span>
                        <input type="range" min="50" max="10000" step="50" value={circleRadius}
                            onChange={e => { const r = parseInt(e.target.value); setCircleRadius(r); circleRadiusRef.current = r; }}
                            className="w-40" />
                        <span className="text-sm font-medium text-gray-800 whitespace-nowrap w-20">
                            {circleRadius >= 1000 ? `${(circleRadius/1000).toFixed(1)} km` : `${circleRadius} m`}
                        </span>
                        <button onClick={() => finishCircle(circleCenter, circleRadius)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                            Confirm
                        </button>
                    </div>
                )}
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-semibold text-gray-900">Geofences</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Use the map tools to draw zones</p>
                    </div>
                    {loading && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                </div>

                {/* Form */}
                {showForm && pendingShape && (
                    <div className="border-b border-gray-200 bg-blue-50/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-900">{editingId ? 'Edit Geofence' : 'New Geofence'}</h2>
                            <button onClick={() => { setShowForm(false); updatePreview([]); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                    placeholder="e.g. Head Office"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            {pendingShape.type === 'circle' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Radius (metres)</label>
                                    <input type="number" min="50" max="50000" value={form.radius}
                                        onChange={e => {
                                            const r = parseInt(e.target.value) || 500;
                                            setForm(f => ({ ...f, radius: r }));
                                            if (pendingShape.type === 'circle') updatePreview(circleRing(pendingShape.center[0], pendingShape.center[1], r), form.color);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Speed Limit ({speedLabel})</label>
                                <input type="number" min="1" max="300" value={form.speed_limit_kmh}
                                    onChange={e => setForm(f => ({ ...f, speed_limit_kmh: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                    placeholder="Optional"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Colour</label>
                                    <input type="color" value={form.color}
                                        onChange={e => {
                                            const c = e.target.value;
                                            setForm(f => ({ ...f, color: c }));
                                            if (pendingShape.type === 'circle') updatePreview(circleRing(pendingShape.center[0], pendingShape.center[1], form.radius), c);
                                            else updatePreview([...pendingShape.coords, pendingShape.coords[0]], c);
                                        }}
                                        className="w-full h-8 border border-gray-300 rounded-lg cursor-pointer" />
                                </div>
                                <label className="flex items-center gap-1.5 mt-4 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300" />
                                    <span className="text-xs font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => { setShowForm(false); updatePreview([]); }}
                                    className="flex-1 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* No shape prompt */}
                {!showForm && drawMode === 'select' && (
                    <div className="p-4 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
                        Use the tools on the map to draw a <strong>polygon ⬡</strong>, <strong>rectangle ▭</strong>, or <strong>circle ◯</strong>, then fill in the details here.
                    </div>
                )}

                {/* Geofence list */}
                <div className="flex-1 overflow-y-auto">
                    {geofences.length === 0 && !loading ? (
                        <div className="p-6 text-center text-gray-400 text-sm">No geofences yet. Draw one on the map!</div>
                    ) : geofences.map(gf => (
                        <div key={gf.id} className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${editingId === gf.id ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: gf.color }} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{gf.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {gf.type === 'circle' ? `Circle · ${gf.radius && gf.radius >= 1000 ? `${(gf.radius/1000).toFixed(1)} km` : `${gf.radius} m`}` : 'Polygon'}
                                            {gf.speed_limit_kmh ? ` · ${Math.round(toSpeedUnit(gf.speed_limit_kmh))} ${speedLabel}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${gf.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {gf.is_active ? 'On' : 'Off'}
                                </span>
                            </div>
                            <div className="flex gap-1.5 mt-2">
                                <button onClick={() => toggleActive(gf)} className="flex-1 text-xs py-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-600">
                                    {gf.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => openEdit(gf)} className="flex-1 text-xs py-1 rounded border border-blue-200 hover:bg-blue-50 text-blue-600">
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(gf.id)} className="flex-1 text-xs py-1 rounded border border-red-200 hover:bg-red-50 text-red-600">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
