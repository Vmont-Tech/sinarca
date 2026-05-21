import type { RawInput, ProfileType, SIEResult } from '../types';

export function uncertaintyEngine(input: RawInput, profile: ProfileType): SIEResult['uncertainty'] {
    let score = 100;
    const rangeVariance = 0.20; // Base +/- 20%

    // Deductions
    // If using generic averages (not exact fuel/bills)
    // We assume input is "Estimated" in this UI version
    score -= 10;

    // Scope 3 usually high uncertainty
    if (input.flights?.hours && input.flights.hours > 0) score -= 10;

    // Industrial Light without engineering report
    if (profile === 'INDUSTRIAL_LIGHT') score -= 15;

    // Classification
    let level = 'Estimativa Indicativa';
    if (score >= 85) level = 'Inventário de Alta Confiabilidade'; // Audit Ready
    else if (score >= 70) level = 'Estimativa Técnica'; // Good for Internal

    return {
        score,
        level,
        range: {
            min: 1 - rangeVariance, // factor, e.g. 0.8
            max: 1 + rangeVariance  // factor, e.g. 1.2
        }
    };
}
