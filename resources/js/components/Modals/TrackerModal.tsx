import { useState, useEffect } from 'react';
import { Tracker } from '../../hooks/useTrackerManagement';

interface TrackerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Tracker>) => Promise<void>;
    tracker?: Tracker | null;
}

export default function TrackerModal({ isOpen, onClose, onSubmit, tracker }: TrackerModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        device_id: '',
        type: 'gps',
        protocol: 'http',
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (tracker) {
            setFormData({
                name: tracker.name,
                device_id: tracker.device_id,
                type: tracker.type,
                protocol: tracker.protocol,
                is_active: tracker.is_active,
            });
        } else {
            setFormData({
                name: '',
                device_id: '',
                type: 'gps',
                protocol: 'http',
                is_active: true,
            });
        }
    }, [tracker]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {tracker ? 'Edit Tracker' : 'Add New Tracker'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Tracker A1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Device ID (IMEI) *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.device_id}
                                onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 123456789012345"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Unique identifier for the GPS device (usually IMEI)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type *
                            </label>
                            <select
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="gps">GPS Hardware Tracker</option>
                                <option value="phone">Phone App</option>
                                <option value="obd">OBD-II Device</option>
                                <option value="asset">Asset Tracker</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Protocol *
                            </label>
                            <select
                                required
                                value={formData.protocol}
                                onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="http">HTTP/HTTPS (JSON)</option>
                                <option value="gprs">GPRS (TCP)</option>
                                <option value="mqtt">MQTT</option>
                                <option value="websocket">WebSocket</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Active</span>
                            </label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : (tracker ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
