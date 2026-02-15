import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';
import toast from 'react-hot-toast';

export interface Tracker {
    id: number;
    organization_id: number;
    name: string;
    device_id: string;
    type: string;
    protocol: string;
    is_active: boolean;
    last_communication_at?: string;
    created_at: string;
    updated_at: string;
}

export function useTrackerManagement() {
    const { currentOrganization } = useAuth();
    const [trackers, setTrackers] = useState<Tracker[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrackers = useCallback(async (search?: string) => {
        if (!currentOrganization) return;

        try {
            setLoading(true);
            const params = search ? { search } : {};
            const { data } = await api.get(
                `/organizations/${currentOrganization.id}/trackers`,
                { params }
            );
            setTrackers(data.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load trackers');
            toast.error('Failed to load trackers');
        } finally {
            setLoading(false);
        }
    }, [currentOrganization]);

    const createTracker = useCallback(async (trackerData: Partial<Tracker>) => {
        if (!currentOrganization) return;

        try {
            const { data } = await api.post(
                `/organizations/${currentOrganization.id}/trackers`,
                trackerData
            );
            setTrackers(prev => [data, ...prev]);
            toast.success('Tracker created successfully');
            return data;
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to create tracker';
            toast.error(message);
            throw err;
        }
    }, [currentOrganization]);

    const updateTracker = useCallback(async (id: number, trackerData: Partial<Tracker>) => {
        if (!currentOrganization) return;

        try {
            const { data } = await api.put(
                `/organizations/${currentOrganization.id}/trackers/${id}`,
                trackerData
            );
            setTrackers(prev => prev.map(t => t.id === id ? data : t));
            toast.success('Tracker updated successfully');
            return data;
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to update tracker';
            toast.error(message);
            throw err;
        }
    }, [currentOrganization]);

    const deleteTracker = useCallback(async (id: number) => {
        if (!currentOrganization) return;

        try {
            await api.delete(
                `/organizations/${currentOrganization.id}/trackers/${id}`
            );
            setTrackers(prev => prev.filter(t => t.id !== id));
            toast.success('Tracker deleted successfully');
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to delete tracker';
            toast.error(message);
            throw err;
        }
    }, [currentOrganization]);

    return {
        trackers,
        loading,
        error,
        fetchTrackers,
        createTracker,
        updateTracker,
        deleteTracker,
    };
}
