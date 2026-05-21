import type { RawInput, ProfileType } from '../types';
import { BR_FACTORS_V1_1 } from '../factors/br-fe-1.1';

export function calculateScope1(input: RawInput, profile: ProfileType): number {
    let emissions = 0;

    // 1. Stationary Combustion (Generator/Boiler) - Scope 1
    if (input.stationary && input.stationary.fuel !== 'none') {
        const factor = BR_FACTORS_V1_1.stationary[input.stationary.fuel];
        if (factor) {
            emissions += input.stationary.quantity * factor.value;
        }
    }

    // 2. Mobile Combustion (Fleet/Owned Vehicles) - Scope 1 if fleet/owned
    // For PF, car is usually considered Scope 1 (Direct Emission from activity control).
    // For PJ, only if declared as Fleet. If employee commute => Scope 3.
    // Simplifying: If PF or (PJ and isFleet) => Scope 1.
    const isScope1Transport = profile === 'PF' || (input.transport.isFleet === true);

    if (isScope1Transport && input.transport.distanceKm > 0) {
        const liters = input.transport.distanceKm / (input.transport.efficiencyKmL || 10);
        const factor = BR_FACTORS_V1_1.transport[input.transport.fuel];
        if (factor) {
            emissions += liters * factor.value;
        }
    }

    return emissions / 1000; // kg -> ton
}
