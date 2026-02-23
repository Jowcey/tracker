import { useState, useCallback, useEffect } from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useLocationUpdates } from '../../hooks/useLocationUpdates';
import VehicleMap from '../../components/Map/VehicleMap';
import { Vehicle, LocationUpdateEvent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function LiveTracking() {
    const { currentOrganization } = useAuth();
    const { vehicles, loading, error } = useVehicles();
    const [liveVehicles, setLiveVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [vehiclePanelOpen, setVehiclePanelOpen] = useState(true);

    // Debug logging
    useEffect(() => {
        console.log('[LiveTracking] Mount', {
            currentOrganization: currentOrganization?.id,
            vehiclesCount: vehicles?.length,
            loading,
            error
        });
    }, [currentOrganization, vehicles, loading, error]);

    useEffect(() => {
        if (vehicles && vehicles.length > 0) {
            console.log('[LiveTracking] Setting vehicles', vehicles.length);
            setLiveVehicles(vehicles);
        }
    }, [vehicles]);

    const handleLocationUpdate = useCallback((location: LocationUpdateEvent) => {
        console.log('[LiveTracking] Location update', location);
        setLiveVehicles((prev) =>
            prev.map((vehicle) => {
                if (vehicle.tracker_id === location.tracker_id) {
                    return {
                        ...vehicle,
                        latest_location: {
                            id: 0,
                            tracker_id: location.tracker_id,
                            vehicle_id: vehicle.id,
                            organization_id: vehicle.organization_id,
                            latitude: location.lat,
                            longitude: location.lng,
                            heading: location.heading,
                            speed: location.speed,
                            recorded_at: location.recorded_at,
                            created_at: new Date().toISOString(),
                        },
                    };
                }
                return vehicle;
            })
        );
    }, []);

    const { connected } = useLocationUpdates(handleLocationUpdate);

    if (!currentOrganization) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-600">No organization selected</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            {/* Fullscreen map */}
            <div className="absolute inset-0">
                <VehicleMap
                    vehicles={liveVehicles}
                    onVehicleClick={setSelectedVehicle}
                    selectedVehicleId={selectedVehicle?.id}
                />
            </div>

            {/* Vehicle panel toggle button */}
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => setVehiclePanelOpen(!vehiclePanelOpen)}
                    className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <span>🚗</span>
                    <span>Vehicles ({liveVehicles.length})</span>
                    <svg
                        className={`h-4 w-4 text-gray-500 transition-transform ${vehiclePanelOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Vehicle list panel */}
                {vehiclePanelOpen && (
                    <div className="mt-2 w-72 bg-white rounded-lg shadow-lg overflow-hidden max-h-[60vh] flex flex-col">
                        <div className="overflow-y-auto flex-1">
                            {liveVehicles.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500 text-center">No vehicles found</div>
                            ) : liveVehicles.map((vehicle) => (
                                <div
                                    key={vehicle.id}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                                        selectedVehicle?.id === vehicle.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-gray-900">{vehicle.name}</h4>
                                            {vehicle.registration_number && (
                                                <p className="text-xs text-gray-500 mt-0.5">{vehicle.registration_number}</p>
                                            )}
                                            {vehicle.latest_location && (
                                                <div className="mt-1.5 text-xs text-gray-500">
                                                    <span>{parseFloat(vehicle.latest_location.speed || 0).toFixed(1)} km/h</span>
                                                    <span className="mx-1.5">·</span>
                                                    <span>{new Date(vehicle.latest_location.recorded_at).toLocaleTimeString()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${vehicle.latest_location ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Connection status badge */}
            <div className="absolute top-4 right-4 z-10">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${
                    connected
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-white' : 'bg-white opacity-75'}`} />
                    {connected ? 'Live' : 'Disconnected'}
                </span>
            </div>

            {/* Selected vehicle detail card */}
            {selectedVehicle && (
                <div className="absolute bottom-8 right-4 z-10 w-72 bg-white rounded-lg shadow-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">{selectedVehicle.name}</h3>
                            {selectedVehicle.registration_number && (
                                <p className="text-xs text-gray-500 mt-0.5">{selectedVehicle.registration_number}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedVehicle(null)}
                            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {selectedVehicle.latest_location ? (
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Speed</span>
                                <span className="font-medium">{parseFloat(selectedVehicle.latest_location.speed || 0).toFixed(1)} km/h</span>
                            </div>
                            {selectedVehicle.latest_location.heading != null && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Heading</span>
                                    <span className="font-medium">{parseFloat(selectedVehicle.latest_location.heading || 0).toFixed(0)}°</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Last Update</span>
                                <span className="font-medium">{new Date(selectedVehicle.latest_location.recorded_at).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">No location data</p>
                    )}
                </div>
            )}
        </div>
    );
}
