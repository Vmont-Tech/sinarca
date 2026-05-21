import type { EmissionFactor } from '../types';

export const BR_FACTORS_V1_1 = {
    transport: {
        gasoline: { value: 2.27, unit: 'kgCO2e/L', source: 'MCTI / IPCC', uncertainty: 0.05 }, // L based easier for calc
        ethanol: { value: 0.81, unit: 'kgCO2e/L', source: 'MCTI (Ciclo Parcial)', uncertainty: 0.20 },
        diesel: { value: 2.68, unit: 'kgCO2e/L', source: 'MCTI 2023', uncertainty: 0.05 },
        gnv: { value: 1.95, unit: 'kgCO2e/m3', source: 'IPCC AR6', uncertainty: 0.10 }
    } as Record<string, EmissionFactor>,

    electricity: {
        SIN: { value: 0.092, unit: 'kgCO2e/kWh', source: 'MCTI/ONS 2023 (Avg)', uncertainty: 0.10 },
        SOLAR: { value: 0.000, unit: 'kgCO2e/kWh', source: 'Zero Emission', uncertainty: 0.0 }
    } as Record<string, EmissionFactor>,

    aviation: {
        avg: { value: 90, unit: 'kgCO2e/hour', source: 'IPCC AR6', uncertainty: 0.15 }
    } as Record<string, EmissionFactor>,

    stationary: {
        diesel: { value: 2.68, unit: 'kgCO2e/L', source: 'IPCC', uncertainty: 0.05 },
        glp: { value: 2.93, unit: 'kgCO2e/kg', source: 'IPCC (GLP)', uncertainty: 0.05 }, // ~ kgCO2e/kg
        natural_gas: { value: 1.95, unit: 'kgCO2e/m3', source: 'IPCC', uncertainty: 0.05 }
    } as Record<string, EmissionFactor>,

    logistics: {
        avg_road: { value: 0.15, unit: 'kgCO2e/tkm', source: 'CNT', uncertainty: 0.20 } // simplified per km if not weight known, assumption car/van
    } as Record<string, EmissionFactor>,

    waste: {
        landfill: { value: 1000, unit: 'kgCO2e/t', source: 'Estimative', uncertainty: 0.50 }
    }
};
