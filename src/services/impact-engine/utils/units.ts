export function kmToLiters(km: number, efficiency: number): number {
    if (efficiency <= 0) return 0;
    return km / efficiency;
}

export function kwhToMJ(kwh: number): number {
    return kwh * 3.6; // 1 kWh = 3.6 MJ
}

// Diesel average energy density (MJ/L)
export const DIESEL_MJ_PER_L = 35.5; // Updated more precise
export const GASOLINE_MJ_PER_L = 32.2;
export const ETHANOL_MJ_PER_L = 21.3;
export const GNV_MJ_PER_M3 = 37.4; // Approx

export function getFuelEnergyDensity(fuel: string): number {
    switch (fuel) {
        case 'diesel': return DIESEL_MJ_PER_L;
        case 'gasoline': return GASOLINE_MJ_PER_L;
        case 'ethanol': return ETHANOL_MJ_PER_L;
        case 'gnv': return GNV_MJ_PER_M3;
        default: return 32; // Fallback
    }
}
