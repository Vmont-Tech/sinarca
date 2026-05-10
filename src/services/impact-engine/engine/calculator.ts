import type { NormalizedActivity, CalculationResult } from '../types';
import { getEmissionFactor } from '../factors/brazil';

export function calculateEmissions(activities: NormalizedActivity[]): CalculationResult {
    let totalKgCO2e = 0;

    // Uncertainty accumulation (simplified squareroot sum of variances method for simplicity in MVP)
    // Actually, simple sum of uncertainties relative to contribution is safer for "Range" Logic.
    let minTotal = 0;
    let maxTotal = 0;

    for (const act of activities) {
        const factor = getEmissionFactor(act.activity, act.subType || '', act.region);

        if (!factor) continue;

        let emission = 0;

        if (act.energyMJ !== undefined) {
            emission = act.energyMJ * factor.value;
        } else if (act.hours !== undefined) {
            emission = act.hours * factor.value;
        }

        totalKgCO2e += emission;

        // Uncertainty Calculation
        const unc = factor.uncertainty || 0.1; // Default 10%
        minTotal += emission * (1 - unc);
        maxTotal += emission * (1 + unc);
    }

    return {
        kgCO2e: totalKgCO2e,
        tCO2e: totalKgCO2e / 1000,
        uncertaintyRange: {
            min: minTotal / 1000,
            max: maxTotal / 1000
        }
    };
}
