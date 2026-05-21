import type { EmissionFactor } from '../types';

export const BRAZIL_FACTORS_V1 = {
    version: 'BR-FE-1.0',
    updatedAt: '2025-01-01',

    transport: {
        gasoline: { value: 0.0693, unit: 'kgCO2e/MJ', source: 'MCTI 2023', uncertainty: 0.05 },
        ethanol: { value: 0.0189, unit: 'kgCO2e/MJ', source: 'MCTI (Ciclo Parcial)', uncertainty: 0.20 },
        diesel: { value: 0.0741, unit: 'kgCO2e/MJ', source: 'MCTI 2023', uncertainty: 0.05 },
        gnv: { value: 0.0561, unit: 'kgCO2e/MJ', source: 'IPCC AR6', uncertainty: 0.10 }
    } as Record<string, EmissionFactor>,

    electricity: {
        SIN: { value: 0.0156, unit: 'kgCO2e/MJ', source: 'MCTI/ONS 2023', uncertainty: 0.10 }
    } as Record<string, EmissionFactor>,

    aviation: {
        domestic: { value: 90, unit: 'kgCO2e/hour', source: 'IPCC AR6', uncertainty: 0.15 },
        international: { value: 110, unit: 'kgCO2e/hour', source: 'ICAO', uncertainty: 0.15 }
    } as Record<string, EmissionFactor>,

    stationary: {
        glp: { value: 0.0631, unit: 'kgCO2e/MJ', source: 'IPCC', uncertainty: 0.05 },
        natural_gas: { value: 0.0561, unit: 'kgCO2e/MJ', source: 'IPCC', uncertainty: 0.05 }
    } as Record<string, EmissionFactor>
};

export function getEmissionFactor(activity: string, subType: string, _region: string = 'BR'): EmissionFactor | null {
    if (activity === 'road_transport') {
        return BRAZIL_FACTORS_V1.transport[subType] || null;
    }

    if (activity === 'electricity') {
        // Future: region specific factors
        return BRAZIL_FACTORS_V1.electricity.SIN;
    }

    if (activity === 'aviation') {
        return BRAZIL_FACTORS_V1.aviation[subType] || BRAZIL_FACTORS_V1.aviation.domestic;
    }

    return null;
}
