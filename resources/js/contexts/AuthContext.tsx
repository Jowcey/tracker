import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/axios';

interface User {
    id: number;
    name: string;
    email: string;
    organizations: Organization[];
}

interface Organization {
    id: number;
    name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    currentOrganization: Organization | null;
    setCurrentOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/me');
            // Map organizations to add role directly from pivot
            const userWithMappedOrgs = {
                ...data.user,
                organizations: data.user.organizations.map((org: any) => ({
                    ...org,
                    role: org.pivot?.role || org.role
                }))
            };
            setUser(userWithMappedOrgs);
            if (userWithMappedOrgs.organizations.length > 0) {
                // Set current org based on current_organization_id, or default to first
                const currentOrg = userWithMappedOrgs.organizations.find(
                    (org: any) => org.id === userWithMappedOrgs.current_organization_id
                ) || userWithMappedOrgs.organizations[0];
                setCurrentOrganization(currentOrg);
            }
        } catch (error) {
            localStorage.removeItem('token');
            toast.error('Session expired. Please login again.');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const { data } = await api.post('/login', { email, password });
            localStorage.setItem('token', data.token);
            // Map organizations to add role directly from pivot
            const userWithMappedOrgs = {
                ...data.user,
                organizations: data.user.organizations.map((org: any) => ({
                    ...org,
                    role: org.pivot?.role || org.role
                }))
            };
            setUser(userWithMappedOrgs);
            if (userWithMappedOrgs.organizations.length > 0) {
                // Set current org based on current_organization_id, or default to first
                const currentOrg = userWithMappedOrgs.organizations.find(
                    (org: any) => org.id === userWithMappedOrgs.current_organization_id
                ) || userWithMappedOrgs.organizations[0];
                setCurrentOrganization(currentOrg);
            }
            toast.success('Welcome back!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login failed');
            throw error;
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const { data } = await api.post('/register', { 
                name, 
                email, 
                password,
                password_confirmation: password 
            });
            localStorage.setItem('token', data.token);
            // Map organizations to add role directly from pivot
            const userWithMappedOrgs = {
                ...data.user,
                organizations: data.user.organizations?.map((org: any) => ({
                    ...org,
                    role: org.pivot?.role || org.role
                })) || []
            };
            setUser(userWithMappedOrgs);
            toast.success('Account created successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Registration failed');
            throw error;
        }
    };

    const logout = () => {
        api.post('/logout').finally(() => {
            localStorage.removeItem('token');
            setUser(null);
            setCurrentOrganization(null);
            toast.success('Logged out successfully');
            window.location.href = '/login';
        });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                currentOrganization,
                setCurrentOrganization,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
