import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

interface DriverAppLayoutProps {
    children: ReactNode;
}

export default function DriverAppLayout({ children }: DriverAppLayoutProps) {
    const { currentOrganization } = useAuth();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!currentOrganization) return;
        api.get(`/organizations/${currentOrganization.id}/notifications/unread-count`)
            .then(r => setUnreadCount(r.data?.count ?? r.data?.unread_count ?? 0))
            .catch(() => setUnreadCount(0));
    }, [currentOrganization]);

    const isActive = (path: string) => location.pathname === path;

    const tabs = [
        { label: 'Home', icon: '🏠', href: '/driver-app' },
        { label: 'Trips', icon: '🗺️', href: '/driver-app/trips' },
        { label: 'Alerts', icon: '🔔', href: '/driver-app/alerts', badge: unreadCount },
    ];

    return (
        <div className="flex flex-col h-screen bg-white max-w-md mx-auto">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900">🚗 My Trips</h1>
                {unreadCount > 0 && (
                    <Link to="/driver-app/alerts">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    </Link>
                )}
            </header>

            {/* Main scrollable content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>

            {/* Bottom navigation */}
            <nav className="flex-shrink-0 bg-gray-900 border-t border-gray-700 sticky bottom-0 z-10">
                <div className="flex">
                    {tabs.map(tab => (
                        <Link
                            key={tab.href}
                            to={tab.href}
                            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors relative ${
                                isActive(tab.href) ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <span className="text-xl leading-none">{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.badge != null && tab.badge > 0 && (
                                <span className="absolute top-1.5 right-1/4 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {tab.badge > 9 ? '9+' : tab.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </nav>
        </div>
    );
}
