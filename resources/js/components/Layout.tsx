import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import OrganizationSwitcher from './Organizations/OrganizationSwitcher';
import LanguageSwitcher from './LanguageSwitcher/LanguageSwitcher';

export default function Layout({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const { user, logout, currentOrganization } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-gray-900">Vehicle Tracker</h1>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    to="/tracking"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive('/tracking')
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    {t('nav.liveTracking')}
                                </Link>
                                <Link
                                    to="/vehicles"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive('/vehicles')
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    Vehicles
                                </Link>
                                <Link
                                    to="/trackers"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive('/trackers')
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    Trackers
                                </Link>
                                <Link
                                    to="/history"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive('/history')
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    History
                                </Link>
                                <Link
                                    to="/dashboard"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive('/dashboard')
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    {t('nav.dashboard')}
                                </Link>
                                <Link
                                    to="/settings"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive('/settings')
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    {t('nav.settings')}
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <LanguageSwitcher />
                            <OrganizationSwitcher />
                            {currentOrganization && (
                                <div className="text-sm text-gray-700">
                                    <span className="font-medium">{currentOrganization.name}</span>
                                    {currentOrganization.role && (
                                        <span className="ml-2 text-gray-500">({currentOrganization.role})</span>
                                    )}
                                </div>
                            )}
                            <div className="text-sm text-gray-700">{user?.name}</div>
                            <button onClick={logout} className="text-sm text-gray-700 hover:text-gray-900">
                                {t('common.logout')}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="py-10">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">{children}</div>
            </main>
        </div>
    );
}
