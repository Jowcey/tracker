import { useState, useEffect } from 'react';
import { useVehicleManagement } from '../../hooks/useVehicleManagement';
import VehicleModal from '../../components/Modals/VehicleModal';
import { Vehicle } from '../../types';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

export default function VehiclesIndex() {
    const { currentOrganization } = useAuth();
    const {
        vehicles,
        loading,
        fetchVehicles,
        createVehicle,
        updateVehicle,
        deleteVehicle,
    } = useVehicleManagement();

    const [trackers, setTrackers] = useState<Array<{ id: number; name: string; device_id: string }>>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    useEffect(() => {
        if (currentOrganization) {
            fetchVehicles();
            fetchTrackers();
        }
    }, [currentOrganization, fetchVehicles]);

    const fetchTrackers = async () => {
        if (!currentOrganization) return;
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/trackers`);
            setTrackers(data.data);
        } catch (error) {
            console.error('Failed to load trackers:', error);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchVehicles(searchTerm);
    };

    const handleAdd = () => {
        setEditingVehicle(null);
        setIsModalOpen(true);
    };

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data: Partial<Vehicle>) => {
        if (editingVehicle) {
            await updateVehicle(editingVehicle.id, data);
        } else {
            await createVehicle(data);
        }
    };

    const handleDelete = async (id: number) => {
        if (deleteConfirm === id) {
            await deleteVehicle(id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(id);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'vehicle':
                return '🚗';
            case 'person':
                return '🚶';
            case 'asset':
                return '📦';
            default:
                return '🚗';
        }
    };

    const getStatusBadge = (vehicle: Vehicle) => {
        if (!vehicle.is_active) {
            return <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">Inactive</span>;
        }
        if (vehicle.latest_location) {
            const lastUpdate = new Date(vehicle.latest_location.recorded_at);
            const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
            if (minutesAgo < 5) {
                return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">● Active</span>;
            } else if (minutesAgo < 30) {
                return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">● Idle</span>;
            }
        }
        return <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">Offline</span>;
    };

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
                        <p className="text-gray-600 mt-1">Manage your fleet of vehicles, people, and assets</p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Vehicle</span>
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow mb-6">
                    <form onSubmit={handleSearch} className="p-4 border-b">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                placeholder="Search vehicles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                                Search
                            </button>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        fetchVehicles();
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            <p className="mt-2">Loading vehicles...</p>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <h3 className="text-lg font-medium mb-1">No vehicles found</h3>
                            <p className="text-sm mb-4">Get started by adding your first vehicle</p>
                            <button
                                onClick={handleAdd}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Add Vehicle
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vehicle
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Registration
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tracker
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {vehicles.map((vehicle) => (
                                        <tr key={vehicle.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="text-2xl mr-3">{getVehicleIcon(vehicle.type)}</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{vehicle.name}</div>
                                                        {vehicle.make && (
                                                            <div className="text-sm text-gray-500">
                                                                {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {vehicle.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {vehicle.registration_number || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {vehicle.tracker ? (
                                                    <span className="text-blue-600">{vehicle.tracker.name}</span>
                                                ) : (
                                                    <span className="text-gray-400">No tracker</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(vehicle)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => handleEdit(vehicle)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(vehicle.id)}
                                                    className={`${
                                                        deleteConfirm === vehicle.id
                                                            ? 'text-red-700 font-bold'
                                                            : 'text-red-600 hover:text-red-900'
                                                    }`}
                                                >
                                                    {deleteConfirm === vehicle.id ? 'Confirm?' : 'Delete'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <VehicleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                vehicle={editingVehicle}
                trackers={trackers}
            />
        </>
    );
}
