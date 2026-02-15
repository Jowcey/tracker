import { useState, useEffect } from 'react';
import { useTrackerManagement, Tracker } from '../../hooks/useTrackerManagement';
import TrackerModal from '../../components/Modals/TrackerModal';

export default function TrackersIndex() {
    const {
        trackers,
        loading,
        fetchTrackers,
        createTracker,
        updateTracker,
        deleteTracker,
    } = useTrackerManagement();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTracker, setEditingTracker] = useState<Tracker | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    useEffect(() => {
        fetchTrackers();
    }, [fetchTrackers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTrackers(searchTerm);
    };

    const handleAdd = () => {
        setEditingTracker(null);
        setIsModalOpen(true);
    };

    const handleEdit = (tracker: Tracker) => {
        setEditingTracker(tracker);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data: Partial<Tracker>) => {
        if (editingTracker) {
            await updateTracker(editingTracker.id, data);
        } else {
            await createTracker(data);
        }
    };

    const handleDelete = async (id: number) => {
        if (deleteConfirm === id) {
            await deleteTracker(id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(id);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    const getStatusBadge = (tracker: Tracker) => {
        if (!tracker.is_active) {
            return <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">Inactive</span>;
        }
        if (tracker.last_communication_at) {
            const lastComm = new Date(tracker.last_communication_at);
            const minutesAgo = Math.floor((Date.now() - lastComm.getTime()) / 60000);
            if (minutesAgo < 10) {
                return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">● Online</span>;
            } else if (minutesAgo < 60) {
                return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">● Idle ({minutesAgo}m ago)</span>;
            }
        }
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">● Offline</span>;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'gps':
                return '📡';
            case 'phone':
                return '📱';
            case 'obd':
                return '🔌';
            case 'asset':
                return '📦';
            default:
                return '📍';
        }
    };

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">GPS Trackers</h1>
                        <p className="text-gray-600 mt-1">Manage tracking devices and their configurations</p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Tracker</span>
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow mb-6">
                    <form onSubmit={handleSearch} className="p-4 border-b">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                placeholder="Search trackers..."
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
                                        fetchTrackers();
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
                            <p className="mt-2">Loading trackers...</p>
                        </div>
                    ) : trackers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <h3 className="text-lg font-medium mb-1">No trackers found</h3>
                            <p className="text-sm mb-4">Add a GPS tracker to start tracking</p>
                            <button
                                onClick={handleAdd}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Add Tracker
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tracker
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Device ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Protocol
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
                                    {trackers.map((tracker) => (
                                        <tr key={tracker.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="text-2xl mr-3">{getTypeIcon(tracker.type)}</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{tracker.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            Added {new Date(tracker.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                    {tracker.device_id}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {tracker.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
                                                {tracker.protocol}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(tracker)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => handleEdit(tracker)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tracker.id)}
                                                    className={`${
                                                        deleteConfirm === tracker.id
                                                            ? 'text-red-700 font-bold'
                                                            : 'text-red-600 hover:text-red-900'
                                                    }`}
                                                >
                                                    {deleteConfirm === tracker.id ? 'Confirm?' : 'Delete'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">📍 Setup Instructions</h3>
                    <div className="text-sm text-blue-800 space-y-1">
                        <p>1. Add your GPS device using the "Add Tracker" button</p>
                        <p>2. Note down the Device ID (usually printed on the device or in manual)</p>
                        <p>3. Configure your device to send data to: <code className="bg-blue-100 px-1 py-0.5 rounded">POST {window.location.origin}/api/organizations/YOUR_ORG_ID/locations</code></p>
                        <p>4. Assign the tracker to a vehicle in the Vehicles page</p>
                    </div>
                </div>
            </div>

            <TrackerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                tracker={editingTracker}
            />
        </>
    );
}
