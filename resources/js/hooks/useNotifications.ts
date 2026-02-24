import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';

export interface AppNotification {
    id: string;
    type: string;
    data: {
        type: string;
        message: string;
        vehicle_name?: string;
        geofence_name?: string;
        [key: string]: unknown;
    };
    read_at: string | null;
    created_at: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count);
        } catch (e) { /* silent */ }
    }, [user]);

    const fetchAll = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.data || []);
            setUnreadCount((data.data || []).filter((n: AppNotification) => !n.read_at).length);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [user]);

    const markRead = useCallback(async (id: string) => {
        await api.post(`/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const markAllRead = useCallback(async () => {
        await api.post('/notifications/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    return { notifications, unreadCount, loading, fetchAll, markRead, markAllRead };
}
