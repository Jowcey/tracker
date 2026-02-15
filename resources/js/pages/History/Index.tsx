import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import VehicleMap from '../../components/Map/VehicleMap';

interface Trip {
    id: number;
    vehicle_id: number;
    started_at: string;
    ended_at: string;
    distance: number;  // in kilometers
    duration: number;  // in seconds
    stops_count: number;
    vehicle?: {
        id: number;
        name: string;
        type: string;
    };
}

interface Location {
    id: number;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    recorded_at: string;
}

export default function HistoryIndex() {
    const { currentOrganization } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [tripLocations, setTripLocations] = useState<Location[]>([]);
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    useEffect(() => {
        if (currentOrganization) {
            fetchVehicles();
        }
    }, [currentOrganization]);

    useEffect(() => {
        if (selectedVehicle) {
            fetchTrips();
        }
    }, [selectedVehicle, dateFrom, dateTo]);

    useEffect(() => {
        if (selectedTrip) {
            fetchTripLocations(selectedTrip.id);
        }
    }, [selectedTrip]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && tripLocations.length > 0) {
            interval = setInterval(() => {
                setPlaybackIndex(prev => {
                    if (prev >= tripLocations.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000 / playbackSpeed);
        }
        return () => clearInterval(interval);
    }, [isPlaying, tripLocations.length, playbackSpeed]);

    const fetchVehicles = async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/vehicles`);
            setVehicles(data.data);
        } catch (error) {
            console.error('Failed to load vehicles:', error);
        }
    };

    const fetchTrips = async () => {
        if (!currentOrganization || !selectedVehicle) return;
        
        setLoading(true);
        try {
            const { data } = await api.get(
                `/organizations/${currentOrganization.id}/vehicles/${selectedVehicle}/trips`,
                {
                    params: {
                        start_date: dateFrom,
                        end_date: dateTo,
                    }
                }
            );
            setTrips(data.data || []);
        } catch (error) {
            console.error('Failed to load trips:', error);
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTripLocations = async (tripId: number) => {
        if (!currentOrganization) return;
        
        setLoading(true);
        try {
            const { data } = await api.get(
                `/organizations/${currentOrganization.id}/trips/${tripId}/locations`
            );
            setTripLocations(data.data || []);
            setPlaybackIndex(0);
        } catch (error) {
            console.error('Failed to load trip locations:', error);
            setTripLocations([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setPlaybackIndex(0);
        setIsPlaying(false);
    };

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed);
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const currentLocation = tripLocations[playbackIndex];
    const routeCoordinates = tripLocations.slice(0, playbackIndex + 1).map(loc => ({
        lng: parseFloat(loc.longitude as any),
        lat: parseFloat(loc.latitude as any)
    }));

    return (
        <>
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Trip History</h1>
                    <p className="text-gray-600 mt-1">View and replay historical trips</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Filters & Trip List */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow p-4 space-y-4">
                            <h3 className="font-semibold text-gray-900">Filters</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vehicle
                                </label>
                                <select
                                    value={selectedVehicle || ''}
                                    onChange={(e) => {
                                        setSelectedVehicle(e.target.value ? parseInt(e.target.value) : null);
                                        setSelectedTrip(null);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a vehicle</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    From
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    To
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Trip List */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b">
                                <h3 className="font-semibold text-gray-900">
                                    Trips ({trips.length})
                                </h3>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                    </div>
                                ) : trips.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <p>No trips found for selected period</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {trips.map(trip => (
                                            <button
                                                key={trip.id}
                                                onClick={() => setSelectedTrip(trip)}
                                                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                                                    selectedTrip?.id === trip.id ? 'bg-blue-50' : ''
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {new Date(trip.started_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatDuration(trip.duration)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <div>🕐 {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    <div>📏 {(trip.distance || 0).toFixed(1)} km</div>
                                                    <div>⏸️ {trip.stops_count} stops</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Map & Playback */}
                    <div className="lg:col-span-2 space-y-4">
                        {selectedTrip && tripLocations.length > 0 ? (
                            <>
                                {/* Playback Controls */}
                                <div className="bg-white rounded-lg shadow p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                Trip Playback
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(selectedTrip.started_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={handleReset}
                                                className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                                                title="Reset"
                                            >
                                                ⏮️
                                            </button>
                                            <button
                                                onClick={handlePlayPause}
                                                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                                            </button>
                                            <select
                                                value={playbackSpeed}
                                                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="0.5">0.5x</option>
                                                <option value="1">1x</option>
                                                <option value="2">2x</option>
                                                <option value="5">5x</option>
                                                <option value="10">10x</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max={tripLocations.length - 1}
                                            value={playbackIndex}
                                            onChange={(e) => {
                                                setPlaybackIndex(parseInt(e.target.value));
                                                setIsPlaying(false);
                                            }}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>{playbackIndex + 1} / {tripLocations.length}</span>
                                            {currentLocation && (
                                                <span>
                                                    Speed: {parseFloat(currentLocation.speed as any).toFixed(1)} km/h | 
                                                    {' '}{formatDate(currentLocation.recorded_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Trip Stats */}
                                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {(selectedTrip.distance || 0).toFixed(1)}
                                            </div>
                                            <div className="text-xs text-gray-500">Distance (km)</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {formatDuration(selectedTrip.duration)}
                                            </div>
                                            <div className="text-xs text-gray-500">Duration</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {selectedTrip.stops_count}
                                            </div>
                                            <div className="text-xs text-gray-500">Stops</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Map */}
                                <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
                                    {currentLocation && (
                                        <VehicleMap
                                            vehicles={[{
                                                id: selectedTrip.vehicle_id,
                                                name: selectedTrip.vehicle?.name || 'Vehicle',
                                                type: selectedTrip.vehicle?.type || 'vehicle',
                                                lat: parseFloat(currentLocation.latitude as any),
                                                lng: parseFloat(currentLocation.longitude as any),
                                                speed: parseFloat(currentLocation.speed as any),
                                                heading: parseFloat(currentLocation.heading as any),
                                                latest_location: currentLocation,
                                                is_active: true,
                                                organization_id: currentOrganization?.id || 0,
                                                tracker_id: null,
                                                created_at: '',
                                                updated_at: '',
                                            }]}
                                            center={[
                                                parseFloat(currentLocation.longitude as any),
                                                parseFloat(currentLocation.latitude as any)
                                            ]}
                                            route={routeCoordinates}
                                        />
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                <h3 className="text-lg font-medium mb-1">Select a trip to view</h3>
                                <p className="text-sm">Choose a vehicle and date range to see historical trips</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
