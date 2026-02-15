import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

export function useVehicleManagement() {
    const { currentOrganization } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVehicles = useCallback(async (search?: string) => {
        if (!currentOrganization) return;

        try {
            setLoading(true);
            const params = search ? { search } : {};
            const { data } = await api.get(
                `/organizations/${currentOrganization.id}/vehicles`,
                { params }
            );
            setVehicles(data.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load vehicles');
            toast.error('Failed to load vehicles');
        } finally {
            setLoading(false);
        }
    }, [currentOrganization]);

    const createVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
        if (!currentOrganization) return;

        try {
            const { data } = await api.post(
                `/organizations/${currentOrganization.id}/vehicles`,
                vehicleData
            );
            setVehicles(prev => [data, ...prev]);
            toast.success('Vehicle created successfully');
            return data;
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to create vehicle';
            toast.error(message);
            throw err;
        }
    }, [currentOrganization]);

    const updateVehicle = useCallback(async (id: number, vehicleData: Partial<Vehicle>) => {
        if (!currentOrganization) return;

        try {
            const { data } = await api.put(
                `/organizations/${currentOrganization.id}/vehicles/${id}`,
                vehicleData
            );
            setVehicles(prev => prev.map(v => v.id === id ? data : v));
            toast.success('Vehicle updated successfully');
            return data;
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to update vehicle';
            toast.error(message);
            throw err;
        }
    }, [currentOrganization]);

    const deleteVehicle = useCallback(async (id: number) => {
        if (!currentOrganization) return;

        try {
            await api.delete(
                `/organizations/${currentOrganization.id}/vehicles/${id}`
            );
            setVehicles(prev => prev.filter(v => v.id !== id));
            toast.success('Vehicle deleted successfully');
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to delete vehicle';
            toast.error(message);
            throw err;
        }
    }, [currentOrganization]);

    return {
        vehicles,
        loading,
        error,
        fetchVehicles,
        createVehicle,
        updateVehicle,
        deleteVehicle,
    };
}
