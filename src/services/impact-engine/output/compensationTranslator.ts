import type { CompensationTarget } from '../types';

export function compensationTranslator(totalTon: number, uncertaintyLevel: string): CompensationTarget {
    // If uncertainty is high, suggest buffer
    let safetyFactor = 1.0;
    if (uncertaintyLevel === 'Estimativa Indicativa') safetyFactor = 1.2; // +20% buffer

    return {
        minimum: Number((totalTon * 0.9).toFixed(3)), // 90% coverage
        ideal: Number(totalTon.toFixed(3)), // 100%
        regulatory: Number((totalTon * safetyFactor * 1.05).toFixed(3)), // Future compliance (safety + 5%)
        confidence: uncertaintyLevel
    };
}
