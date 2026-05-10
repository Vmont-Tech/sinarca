export type ProfileType = 'PF' | 'PJ' | 'ONG' | 'GOV' | 'INDUSTRIAL_LIGHT' | 'GENERIC';

export interface RawInput {
    // Basic
    profileType?: ProfileType; // Explicit override
    profile?: ProfileType;     // Alias used in some layers
    region?: string;           // Brazil state code or GLOBAL

    // Transport (Scope 1/3 depending on ownership)
    transport?: {
        distanceKm: number;
        fuel: 'gasoline' | 'ethanol' | 'diesel' | 'gnv';
        efficiencyKmL?: number;
        isFleet?: boolean; // true = Scope 1, false = Scope 3
    };

    // Energy (Scope 2)
    energy?: {
        kwh: number;
        source?: 'SIN' | 'SOLAR' | 'WIND'; // Renewable?
    };

    // Stationary / Industrial (Scope 1)
    stationary?: {
        fuel: 'diesel' | 'glp' | 'natural_gas' | 'none';
        quantity: number; // liters or kg
        unit: 'liters' | 'kg';
    };

    // Aviation (Scope 3)
    flights?: {
        hours: number;
        type?: 'commercial' | 'private' | 'short_haul' | 'long_haul';
    };

    // Waste (Scope 3)
    waste?: {
        amountTon: number;
    };
}

export interface ScopeBreakdown {
    scope1: number;
    scope2: number;
    scope3: number;
}

export interface ReferenceScenario {
    current: number;
    optimized: number;
    netZero: number;
    growth20: number;
}

export interface CompensationTarget {
    minimum: number;
    ideal: number;
    regulatory: number;
    confidence: string;
}

export interface SIEResult {
    totalEmissions: number; // tCO2e
    scopeBreakdown: ScopeBreakdown;

    uncertainty: {
        score: number;
        level: string; // 'Indicativa', 'Técnica', 'Auditável'
        range: { min: number, max: number };
    };

    classification: string; // 'Baixo Emissor', 'Operação Crítica', etc.

    scenarios: ReferenceScenario;

    compensation: CompensationTarget;

    hash: string;
    generatedAt: string;

    profileDetected: ProfileType;
}

export interface EmissionFactor {
    value: number;
    unit: string;
    source: string;
    uncertainty: number;
}

export interface NormalizedActivity {
    activity: string;
    subType?: string;
    energyMJ?: number;
    hours?: number;
    region?: string;
}
