import type { RawInput, NormalizedActivity } from '../types';
import { kmToLiters, kwhToMJ, getFuelEnergyDensity } from '../utils/units';

export function normalize(input: RawInput): NormalizedActivity[] {
    const normalized: NormalizedActivity[] = [];

    // 1. Transport
    if (input.transport && input.transport.distanceKm > 0) {
        const liters = kmToLiters(input.transport.distanceKm, input.transport.efficiencyKmL || 10);
        const density = getFuelEnergyDensity(input.transport.fuel);

        normalized.push({
            activity: 'road_transport',
            subType: input.transport.fuel,
            energyMJ: liters * density,
            region: input.region
        });
    }

    // 2. Energy
    if (input.energy && input.energy.kwh > 0) {
        normalized.push({
            activity: 'electricity',
            energyMJ: kwhToMJ(input.energy.kwh),
            region: input.region
        });
    }

    // 3. Aviation
    if (input.flights && input.flights.hours > 0) {
        normalized.push({
            activity: 'aviation',
            subType: input.flights.type,
            hours: input.flights.hours,
            region: 'GLOBAL'
        });
    }

    return normalized;
}
