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
import Layout from './components/Layout';

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
