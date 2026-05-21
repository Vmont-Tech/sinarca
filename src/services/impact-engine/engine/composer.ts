import type { CalculationResult, ConfidenceResult, FinalResult } from '../types';

export function composeResult(emissions: CalculationResult, confidence: ConfidenceResult): FinalResult {
    const annual = emissions.tCO2e * 12;

    return {
        monthly_emissions: Number(emissions.tCO2e.toFixed(3)),
        annual_emissions: Number(annual.toFixed(3)),
        unit: 'tCO2e',
        confidence: confidence,
        methodology: 'GHG Protocol + MCTI Brasil + IPCC AR6',
        version: 'SIE-1.0',
        equivalences: {
            trees: Math.round(annual * 50), // Corrected: ~50 trees/year absorb 1 tCO2e (20kg/tree/year)
            carsKm: Math.round(annual * 6600), // ~150g/km -> 1t = ~6600km
            families: Math.round(annual / 8) // ~8t/year per family (BR)
        },
        compensation: {
            targets: {
                conservative: Number((annual * 0.8).toFixed(3)),
                neutral: Number(annual.toFixed(3)),
                positive: Number((annual * 1.2).toFixed(3))
            }
        },
        generatedAt: new Date().toISOString()
    };
}
