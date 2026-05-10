import type { RawInput } from '../types';

export function parseInputs(raw: any): RawInput {
    // Basic validation and default assignment
    return {
        profile: raw.profile || 'PF',
        region: raw.region || 'BR',
        transport: raw.transport ? {
            distanceKm: Number(raw.transport.distanceKm) || 0,
            efficiencyKmL: Number(raw.transport.efficiencyKmL) || (raw.transport.fuel === 'diesel' ? 3.5 : 10), // Intelligent defaults
            fuel: raw.transport.fuel || 'gasoline'
        } : undefined,
        energy: raw.energy ? {
            kwh: Number(raw.energy.kwh) || 0
        } : undefined,
        flights: raw.flights ? {
            hours: Number(raw.flights.hours) || 0,
            type: raw.flights.type || 'domestic'
        } : undefined
    };
}
