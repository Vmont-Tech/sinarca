import type { RawInput, ProfileType } from '../types';
import { BR_FACTORS_V1_1 } from '../factors/br-fe-1.1';

export function calculateScope3(input: RawInput, profile: ProfileType): number {
    let emissions = 0;

    // 1. Aviation (Business Travel) - Scope 3
    if (input.flights && input.flights.hours > 0) {
        emissions += input.flights.hours * BR_FACTORS_V1_1.aviation.avg.value;
    }

    // 2. Transport (Commuting / Logistics outsourcing)
    // If PJ and NOT Fleet => Likely Scope 3 (employee commuting or 3rd party logistics)
    // If PF => Scope 1 usually (Personal Car).
    // Logic mirror of Scope 1:
    const isScope3Transport = profile !== 'PF' && (input.transport.isFleet === false);

    if (isScope3Transport && input.transport.distanceKm > 0) {
        const liters = input.transport.distanceKm / (input.transport.efficiencyKmL || 10);
        const factor = BR_FACTORS_V1_1.transport[input.transport.fuel];
        if (factor) emissions += liters * factor.value;
    }

    // 3. Waste - Scope 3
    if (input.waste && input.waste.amountTon > 0) {
        emissions += input.waste.amountTon * BR_FACTORS_V1_1.waste.landfill.value; // kg
    }

    return emissions / 1000; // kg -> ton
}
