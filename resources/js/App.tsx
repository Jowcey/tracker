import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard';
import LiveTracking from './pages/Vehicles/LiveTracking';
import VehiclesIndex from './pages/Vehicles/Index';
import TrackersIndex from './pages/Trackers/Index';
import HistoryIndex from './pages/History/Index';
import OrganizationSettings from './pages/Settings/OrganizationSettings';
import Layout from "./components/Layout";
import GeofencesIndex from "./pages/Geofences/Index";
import MaintenanceIndex from "./pages/Maintenance/Index";
import DriversIndex from './pages/Drivers/Index';
import DriversShow from './pages/Drivers/Show';
import FuelIndex from './pages/Fuel/Index';
import ReportsIndex from './pages/Reports/Index';
import ShareShow from './pages/Share/Show';
import AuditLogIndex from './pages/AuditLog/Index';
import DocumentsIndex from './pages/Documents/Index';
import DriverAppLayout from './pages/DriverApp/Layout';
import DriverAppHome from './pages/DriverApp/Home';
import DriverAppTrips from './pages/DriverApp/Trips';
import DriverAppAlerts from './pages/DriverApp/Alerts';
import AdminIndex from './pages/Admin/Index';
import AdminOrganizations from './pages/Admin/Organizations';
import AdminUsers from './pages/Admin/Users';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;
    if (!user.is_super_admin) return <Navigate to="/" />;
    return <>{children}</>;
}

function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/share/:token" element={<ShareShow />} />
                <Route
                    path="/admin/*"
                    element={
                        <AdminRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<AdminIndex />} />
                                    <Route path="/organizations" element={<AdminOrganizations />} />
                                    <Route path="/users" element={<AdminUsers />} />
                                </Routes>
                            </Layout>
                        </AdminRoute>
                    }
                />
                <Route
                    path="/driver-app/*"
                    element={
                        <ProtectedRoute>
                            <DriverAppLayout>
                                <Routes>
                                    <Route path="/" element={<DriverAppHome />} />
                                    <Route path="/trips" element={<DriverAppTrips />} />
                                    <Route path="/alerts" element={<DriverAppAlerts />} />
                                </Routes>
                            </DriverAppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<Navigate to="/tracking" />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/tracking" element={<LiveTracking />} />
                                    <Route path="/vehicles" element={<VehiclesIndex />} />
                                    <Route path="/trackers" element={<TrackersIndex />} />
                                    <Route path="/history" element={<HistoryIndex />} />
                                    <Route path="/settings" element={<OrganizationSettings />} />
                                    <Route path="/geofences" element={<GeofencesIndex />} />
                                    <Route path="/maintenance" element={<MaintenanceIndex />} />
                                    <Route path="/documents" element={<DocumentsIndex />} />
                                    <Route path="/drivers" element={<DriversIndex />} />
                                    <Route path="/drivers/:id" element={<DriversShow />} />
                                    <Route path="/fuel" element={<FuelIndex />} />
                                    <Route path="/reports" element={<ReportsIndex />} />
                                    <Route path="/audit-log" element={<AuditLogIndex />} />
                                </Routes>
                            </Layout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </AuthProvider>
    );
}

export default App;
