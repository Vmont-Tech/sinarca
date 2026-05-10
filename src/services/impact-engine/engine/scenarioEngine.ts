import type { RawInput, ReferenceScenario } from '../types';

export function scenarioEngine(totalTon: number, _input: RawInput): ReferenceScenario {
    const current = totalTon;
    const optimized = current * 0.8;
    const netZero = 0;
    const growth20 = current * 1.2;

    return {
        current,
        optimized,
        netZero,
        growth20
    };
}
