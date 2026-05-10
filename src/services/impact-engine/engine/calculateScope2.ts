import type { RawInput, ProfileType } from '../types';
import { BR_FACTORS_V1_1 } from '../factors/br-fe-1.1';

export function calculateScope2(input: RawInput, profile: ProfileType): number {
    let emissions = 0;

    // Purchased Electricity - Scope 2
    const factor = input.energy.source === 'SOLAR'
        ? BR_FACTORS_V1_1.electricity.SOLAR
        : BR_FACTORS_V1_1.electricity.SIN;

    emissions += input.energy.kwh * factor.value;

    return emissions / 1000; // kg -> ton
}
