import { useState, useEffect } from 'react';
import { Vehicle } from '../../types';

interface VehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Vehicle>) => Promise<void>;
    vehicle?: Vehicle | null;
    trackers: Array<{ id: number; name: string; device_id: string }>;
}

export default function VehicleModal({ isOpen, onClose, onSubmit, vehicle, trackers }: VehicleModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'vehicle' as 'vehicle' | 'person' | 'asset',
        tracker_id: '',
        registration_number: '',
        make: '',
        model: '',
        year: '',
        color: '',
        vin: '',
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (vehicle) {
            setFormData({
                name: vehicle.name,
                type: vehicle.type,
                tracker_id: vehicle.tracker_id?.toString() || '',
                registration_number: vehicle.registration_number || '',
                make: vehicle.make || '',
                model: vehicle.model || '',
                year: vehicle.year?.toString() || '',
                color: vehicle.color || '',
                vin: vehicle.vin || '',
                is_active: vehicle.is_active,
            });
        } else {
            setFormData({
                name: '',
                type: 'vehicle',
                tracker_id: '',
                registration_number: '',
                make: '',
                model: '',
                year: '',
                color: '',
                vin: '',
                is_active: true,
            });
        }
    }, [vehicle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const submitData: any = {
                ...formData,
                tracker_id: formData.tracker_id ? parseInt(formData.tracker_id) : null,
                year: formData.year ? parseInt(formData.year) : null,
            };
            await onSubmit(submitData);
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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Delivery Van #1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type *
                                </label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="vehicle">Vehicle</option>
                                    <option value="person">Person</option>
                                    <option value="asset">Asset</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tracker
                                </label>
                                <select
                                    value={formData.tracker_id}
                                    onChange={(e) => setFormData({ ...formData, tracker_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">No tracker assigned</option>
                                    {trackers.map(tracker => (
                                        <option key={tracker.id} value={tracker.id}>
                                            {tracker.name} ({tracker.device_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Registration Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.registration_number}
                                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="ABC-1234"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Make
                                </label>
                                <input
                                    type="text"
                                    value={formData.make}
                                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ford, Toyota, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Model
                                </label>
                                <input
                                    type="text"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Transit, Camry, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Year
                                </label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="2024"
                                    min="1900"
                                    max="2100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color
                                </label>
                                <input
                                    type="text"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="White, Blue, etc."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    VIN (Vehicle Identification Number)
                                </label>
                                <input
                                    type="text"
                                    value={formData.vin}
                                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="1HGBH41JXMN109186"
                                />
                            </div>

                            <div className="md:col-span-2">
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
                                {submitting ? 'Saving...' : (vehicle ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
