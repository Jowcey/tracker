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
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-600">No organization selected</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-12rem)]">
            <div className="bg-white rounded-lg shadow-sm mb-4 p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Live Tracking</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {liveVehicles.length} vehicles • 
                        <span className={connected ? 'text-green-600' : 'text-red-600'}>
                            {' '}{connected ? '● Connected' : '○ Disconnected'}
                        </span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 20rem)' }}>
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
                    </div>
                    <div className="overflow-y-auto" style={{ height: 'calc(100% - 4rem)' }}>
                        {liveVehicles.map((vehicle) => (
                            <div
                                key={vehicle.id}
                                onClick={() => setSelectedVehicle(vehicle)}
                                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                                    selectedVehicle?.id === vehicle.id ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900">
                                            {vehicle.name}
                                        </h4>
                                        {vehicle.registration_number && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                {vehicle.registration_number}
                                            </p>
                                        )}
                                        {vehicle.latest_location && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                <div>Speed: {parseFloat(vehicle.latest_location.speed || 0).toFixed(1)} km/h</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {new Date(vehicle.latest_location.recorded_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${vehicle.latest_location ? 'bg-green-500' : 'bg-gray-300'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '100%' }}>
                    <VehicleMap 
                        vehicles={liveVehicles} 
                        onVehicleClick={setSelectedVehicle} 
                        selectedVehicleId={selectedVehicle?.id} 
                    />
                </div>
            </div>

            {selectedVehicle && (
                <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{selectedVehicle.name}</h3>
                            {selectedVehicle.registration_number && (
                                <p className="text-sm text-gray-600">{selectedVehicle.registration_number}</p>
                            )}
                        </div>
                        <button onClick={() => setSelectedVehicle(null)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {selectedVehicle.latest_location ? (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Speed:</span>
                                <span className="font-medium">{parseFloat(selectedVehicle.latest_location.speed || 0).toFixed(1)} km/h</span>
                            </div>
                            {selectedVehicle.latest_location.heading !== undefined && selectedVehicle.latest_location.heading !== null && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Heading:</span>
                                    <span className="font-medium">{parseFloat(selectedVehicle.latest_location.heading || 0).toFixed(0)}°</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Last Update:</span>
                                <span className="font-medium">{new Date(selectedVehicle.latest_location.recorded_at).toLocaleString()}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No location data available</p>
                    )}
                </div>
            )}
        </div>
    );
}
