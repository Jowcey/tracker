import { useState } from 'react';
import { useNotifications, AppNotification } from '../../hooks/useNotifications';

const TYPE_ICONS: Record<string, string> = {
    geofence_alert: '📍',
    speed_alert: '⚡',
    maintenance_due: '🔧',
};

function NotificationItem({ n, onMarkRead }: { n: AppNotification; onMarkRead: (id: string) => void }) {
    return (
        <button
            onClick={() => !n.read_at && onMarkRead(n.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!n.read_at ? 'bg-blue-50' : ''}`}
        >
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">{TYPE_ICONS[n.data.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{n.data.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_at && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
            </div>
        </button>
    );
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, loading, fetchAll, markRead, markAllRead } = useNotifications();

    const handleOpen = () => {
        setOpen(o => {
            if (!o) fetchAll();
            return !o;
        });
    };

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-6 text-center"><div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" /></div>
                            ) : notifications.length === 0 ? (
                                <div className="p-6 text-center text-sm text-gray-400">No notifications yet</div>
                            ) : (
                                notifications.map(n => <NotificationItem key={n.id} n={n} onMarkRead={markRead} />)
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
