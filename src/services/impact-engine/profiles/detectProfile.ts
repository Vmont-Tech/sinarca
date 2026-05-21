import type { RawInput, ProfileType } from '../types';

export function detectProfile(input: RawInput): ProfileType {
    // Explicit override if user selected in UI
    if (input.profileType) {
        // Just refine if declared PJ but looks Industrial
        if (input.profileType === 'PJ') {
            if (input.energy.kwh > 10000 || (input.stationary && input.stationary.quantity > 500)) {
                return 'INDUSTRIAL_LIGHT';
            }
        }
        return input.profileType;
    }

    // Heuristics
    if (input.energy?.kwh > 20000) return 'PJ';
    
    // Heuristic: If energy < 2000 kwh, probably a person/small shop
    if (input.energy?.kwh < 2000) return 'PF';

    // Heuristic: If transport distance > 5000km/mo, probably commercial
    if (input.transport?.distanceKm > 5000) return 'PJ';

    return 'PF'; // Default
}
