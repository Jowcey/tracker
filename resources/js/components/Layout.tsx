import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import OrganizationSwitcher from "./Organizations/OrganizationSwitcher";
import LanguageSwitcher from "./LanguageSwitcher/LanguageSwitcher";

export default function Layout({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const { user, logout, currentOrganization } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isTrackingPage = ["/tracking", "/history"].includes(location.pathname);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(isTrackingPage);

    useEffect(() => {
        setSidebarCollapsed(isTrackingPage);
    }, [isTrackingPage]);

    const isActive = (path: string) => location.pathname === path;

    const navigation = [
        { name: t("nav.dashboard"), href: "/dashboard", icon: "📊" },
        { name: t("nav.liveTracking"), href: "/tracking", icon: "🗺️" },
        { name: "Vehicles", href: "/vehicles", icon: "🚗" },
        { name: "Trackers", href: "/trackers", icon: "📡" },
        { name: "History", href: "/history", icon: "📜" },
        { name: t("nav.settings"), href: "/settings", icon: "⚙️" },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar for desktop */}
            <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-64'}`}>
                <div className="flex flex-col w-64">
                    <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
                        {/* Logo */}
                        <div className="flex items-center flex-shrink-0 px-4 mb-6">
                            <Link to="/dashboard" className="flex items-center">
                                <span className="text-2xl font-bold text-blue-600">🚗</span>
                                <span className="ml-2 text-xl font-bold text-gray-900">Tracker</span>
                            </Link>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-2 space-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                        isActive(item.href)
                                            ? "bg-blue-50 text-blue-600"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <span className="mr-3 text-lg">{item.icon}</span>
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        {/* User section at bottom */}
                        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                            <div className="flex-shrink-0 w-full group block">
                                <div className="flex items-center">
                                    <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-medium text-gray-700 truncate">
                                            {user?.name}
                                        </p>
                                        {currentOrganization && (
                                            <p className="text-xs font-medium text-gray-500 truncate">
                                                {currentOrganization.role}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                        title="Logout"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            {sidebarOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                    
                    {/* Sidebar panel */}
                    <div className="fixed inset-0 flex z-40 lg:hidden">
                        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                            <div className="absolute top-0 right-0 -mr-12 pt-2">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                >
                                    <span className="sr-only">Close sidebar</span>
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                                {/* Logo */}
                                <div className="flex-shrink-0 flex items-center px-4 mb-6">
                                    <Link to="/dashboard" onClick={() => setSidebarOpen(false)}>
                                        <span className="text-2xl font-bold text-blue-600">🚗</span>
                                        <span className="ml-2 text-xl font-bold text-gray-900">Tracker</span>
                                    </Link>
                                </div>

                                {/* Navigation */}
                                <nav className="px-2 space-y-1">
                                    {navigation.map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                                                isActive(item.href)
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                        >
                                            <span className="mr-3 text-lg">{item.icon}</span>
                                            {item.name}
                                        </Link>
                                    ))}
                                </nav>
                            </div>

                            {/* User section */}
                            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                                <div className="flex-shrink-0 w-full">
                                    <div className="flex items-center mb-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-700">
                                                {user?.name}
                                            </p>
                                            {currentOrganization && (
                                                <p className="text-xs font-medium text-gray-500">
                                                    {currentOrganization.role}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSidebarOpen(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        {t("common.logout")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Top bar */}
                <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                    >
                        <span className="sr-only">Open sidebar</span>
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Desktop sidebar toggle */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex px-4 border-r border-gray-200 text-gray-500 hover:text-gray-700 focus:outline-none items-center"
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    
                    <div className="flex-1 px-4 flex justify-between">
                        <div className="flex-1 flex items-center">
                            {currentOrganization && (
                                <div className="text-sm text-gray-700 hidden sm:block">
                                    <span className="font-medium">{currentOrganization.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="ml-4 flex items-center space-x-4">
                            <LanguageSwitcher />
                            <OrganizationSwitcher />
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className={`flex-1 relative focus:outline-none ${isTrackingPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    {isTrackingPage ? children : (
                        <div className="py-6">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                {children}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
