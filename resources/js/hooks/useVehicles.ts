import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';
import { Vehicle, PaginatedResponse } from '../types';

export function useVehicles() {
    const { currentOrganization } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentOrganization) return;

        const fetchVehicles = async () => {
            try {
                setLoading(true);
                const { data } = await api.get<PaginatedResponse<Vehicle>>(
                    `/organizations/${currentOrganization.id}/vehicles`
                );
                setVehicles(data.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load vehicles');
            } finally {
                setLoading(false);
            }
        };

        fetchVehicles();
    }, [currentOrganization]);

    return { vehicles, loading, error, refetch: () => {} };
}
