import type { RawInput, ProfileType } from '../types';

export function normalizeInputs(input: RawInput, profile: ProfileType): RawInput {
    // Intelligent Balance / Correction
    const normalized = { ...input };

    // If PF declares absurd energy, cap/flag it? 
    // For now, just ensuring defaults exist.
    if (normalized.transport && !normalized.transport.efficiencyKmL) {
        if (normalized.transport.fuel === 'diesel') normalized.transport.efficiencyKmL = 3.5; // Truck/SUV
        else normalized.transport.efficiencyKmL = 10; // Car
    }

    // If Industrial, maybe transport efficiency is lower (trucks)
    if ((profile === 'INDUSTRIAL_LIGHT' || profile === 'PJ') && normalized.transport) {
        if (!normalized.transport.efficiencyKmL) normalized.transport.efficiencyKmL = 4; // Fleet average assumption
    }

    return normalized;
}
