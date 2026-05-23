import type { RawInput, ProfileType } from '../types';

export function validateRanges(input: RawInput, profile: ProfileType) {
    // Range guard for console warnings or UI flags.
    // Real validation happens in UI limits or Classification Engine alerts.
    if (profile === 'PF') {
        if (input.energy) {
            if (input.energy.kwh > 1000000) return false; // Over 1M Kwh per month? Needs manual check.
            if (input.energy.kwh > 2000) console.warn('SIE Alert: PF Energy > 2000 kWh');
        }
    }
}
