export interface User {
    id: number;
    name: string;
    email: string;
    organizations: Organization[];
}

export interface Organization {
    id: number;
    name: string;
    slug: string;
    role: string;
    settings?: {
        speed_unit?: 'mph' | 'kmh';
    };
    pivot?: {
        role: string;
    };
}

export interface Vehicle {
    id: number;
    organization_id: number;
    tracker_id?: number;
    name: string;
    type: 'vehicle' | 'person' | 'asset';
    registration_number?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    is_active: boolean;
    tracker?: Tracker;
    latest_location?: Location;
    created_at: string;
    updated_at: string;
}

export interface Tracker {
    id: number;
    organization_id: number;
    device_id: string;
    name: string;
    type: 'gps' | 'mobile' | 'beacon';
    manufacturer?: string;
    model?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Location {
    id: number;
    tracker_id: number;
    vehicle_id?: number;
    organization_id: number;
    latitude: number;
    longitude: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    recorded_at: string;
    created_at: string;
}

export interface Trip {
    id: number;
    vehicle_id: number;
    tracker_id: number;
    organization_id: number;
    started_at: string;
    ended_at?: string;
    distance: number;
    duration: number;
    start_location?: Location;
    end_location?: Location;
    stops_count: number;
    vehicle?: Vehicle;
    tracker?: Tracker;
    created_at: string;
    updated_at: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

export interface Geofence {
    id: number;
    name: string;
    description?: string;
    type: 'circle' | 'polygon';
    center_latitude?: number;
    center_longitude?: number;
    radius?: number;
    coordinates?: [number, number][];
    color: string;
    is_active: boolean;
}

export interface LocationUpdateEvent {
    tracker_id: number;
    vehicle_id?: number;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    recorded_at: string;
}
