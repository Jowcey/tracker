import { useAuth } from '../contexts/AuthContext';

export type SpeedUnit = 'mph' | 'kmh';

export function useSpeedUnit() {
    const { currentOrganization } = useAuth();
    const unit: SpeedUnit = (currentOrganization?.settings?.speed_unit as SpeedUnit) || 'mph';

    const convert = (kmh: number): number => unit === 'mph' ? kmh * 0.621371 : kmh;
    const toKmh = (val: number): number => unit === 'mph' ? val / 0.621371 : val;
    const format = (kmh: number, decimals = 1): string => convert(kmh).toFixed(decimals) + ' ' + unit.toUpperCase();

    return { unit, label: unit.toUpperCase(), convert, toKmh, format };
}
