import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { LocationUpdateEvent } from '../types';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo;
    }
}

window.Pusher = Pusher;

export function useLocationUpdates(onLocationUpdate: (location: LocationUpdateEvent) => void) {
    const { currentOrganization } = useAuth();
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!currentOrganization) return;

        // Initialize Laravel Echo without authentication (using public channel instead)
        const echo = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY || 'tracker-reverb-key',
            wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
            wsPort: import.meta.env.VITE_REVERB_PORT || 18080,
            wssPort: import.meta.env.VITE_REVERB_PORT || 18080,
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
            enabledTransports: ['ws', 'wss'],
        });

        window.Echo = echo;

        echo.connector.pusher.connection.bind('connected', () => {
            console.log('WebSocket connected');
            setConnected(true);
        });

        echo.connector.pusher.connection.bind('disconnected', () => {
            console.log('WebSocket disconnected');
            setConnected(false);
        });

        // Subscribe to PUBLIC organization location updates channel
        const channelName = `organization.${currentOrganization.id}.locations`;
        
        echo.channel(channelName)  // PUBLIC channel, not private
            .listen('.location.updated', (e: LocationUpdateEvent) => {
                console.log('Location update received:', e);
                onLocationUpdate(e);
            });

        return () => {
            echo.leave(channelName);
            echo.disconnect();
        };
    }, [currentOrganization, onLocationUpdate]);

    return { connected };
}
