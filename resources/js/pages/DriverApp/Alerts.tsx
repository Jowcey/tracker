import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
    geofence: '🚨',
    speed: '⚡',
    maintenance: '🔧',
    no_signal: '📵',
    working_hours: '⏰',
    document_expiry: '📄',
};

function notificationIcon(type: string): string {
    for (const key of Object.keys(TYPE_ICONS)) {
        if (type.toLowerCase().includes(key)) return TYPE_ICONS[key];
    }
    return '🔔';
}

export default function DriverAppAlerts() {
    const { currentOrganization } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/organizations/${currentOrganization.id}/notifications`);
            setNotifications(data.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchNotifications(); }, [currentOrganization]);

    const markRead = async (id: number) => {
        if (!currentOrganization) return;
        try {
            await api.patch(`/organizations/${currentOrganization.id}/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        } catch (e) { console.error(e); }
    };

    const markAllRead = async () => {
        if (!currentOrganization) return;
        setMarkingAll(true);
        try {
            await api.post(`/organizations/${currentOrganization.id}/notifications/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        } catch (e) { console.error(e); } finally { setMarkingAll(false); }
    };

    const unread = notifications.filter(n => !n.read_at);
    const read = notifications.filter(n => n.read_at);

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Alerts</h2>
                {unread.length > 0 && (
                    <button onClick={markAllRead} disabled={markingAll}
                        className="text-xs text-blue-600 font-medium hover:underline disabled:opacity-50">
                        {markingAll ? 'Marking…' : 'Mark all read'}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-2">🔔</p>
                    <p className="text-sm">No notifications</p>
                </div>
            ) : (
                <>
                    {unread.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Unread</h3>
                            <div className="space-y-2">
                                {unread.map(n => (
                                    <div key={n.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="relative mt-0.5">
                                                <span className="text-xl">{notificationIcon(n.type)}</span>
                                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <button onClick={() => markRead(n.id)}
                                                className="text-xs text-blue-500 hover:underline flex-shrink-0">
                                                Mark read
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {read.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Read</h3>
                            <div className="space-y-2 opacity-60">
                                {read.map(n => (
                                    <div key={n.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl mt-0.5">{notificationIcon(n.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-700">{n.title}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                                                <p className="text-xs text-gray-300 mt-1">
                                                    {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
