import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Organization, User } from '../types';

export function useOrganizations() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganizations = async () => {
        try {
            setLoading(true);
            const { data } = await api.get<Organization[]>('/organizations');
            setOrganizations(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load organizations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const createOrganization = async (name: string) => {
        const { data } = await api.post<Organization>('/organizations', { name });
        setOrganizations([...organizations, data]);
        return data;
    };

    const updateOrganization = async (id: number, updates: Partial<Organization>) => {
        const { data } = await api.put<Organization>(`/organizations/${id}`, updates);
        setOrganizations(organizations.map((org) => (org.id === id ? data : org)));
        return data;
    };

    const deleteOrganization = async (id: number) => {
        await api.delete(`/organizations/${id}`);
        setOrganizations(organizations.filter((org) => org.id !== id));
    };

    return {
        organizations,
        loading,
        error,
        refetch: fetchOrganizations,
        createOrganization,
        updateOrganization,
        deleteOrganization,
    };
}

export function useOrganizationUsers(organizationId: number) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get<User[]>(`/organizations/${organizationId}/users`);
            setUsers(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [organizationId]);

    const addUser = async (userId: number, role: string) => {
        await api.post(`/organizations/${organizationId}/users`, { user_id: userId, role });
        await fetchUsers();
    };

    const updateRole = async (userId: number, role: string) => {
        await api.put(`/organizations/${organizationId}/users/${userId}`, { role });
        await fetchUsers();
    };

    const removeUser = async (userId: number) => {
        await api.delete(`/organizations/${organizationId}/users/${userId}`);
        await fetchUsers();
    };

    return {
        users,
        loading,
        error,
        refetch: fetchUsers,
        addUser,
        updateRole,
        removeUser,
    };
}
