import type { RawInput, NormalizedActivity, ConfidenceResult } from '../types';

export function assessConfidence(raw: RawInput, normalized: NormalizedActivity[]): ConfidenceResult {
    let score = 0;
    const maxScore = 1.0;

    // 1. Data Presence (Base Score)
    if (raw.transport?.distanceKm) score += 0.2;
    if (raw.energy?.kwh) score += 0.2;
    if (raw.flights?.hours) score += 0.2;

    // 2. Data Quality
    if (raw.transport?.efficiencyKmL) score += 0.1; // Custom efficiency provided
    if (raw.region && raw.region !== 'BR') score += 0.1; // Specific region

    // 3. Completeness relative to Profile
    if (raw.profile === 'PF') {
        // PF usually has simple scope
        if (score > 0.4) score += 0.1;
    }

    // Normalize
    score = Math.min(score, maxScore);

    // Classification
    let level: ConfidenceResult['level'] = 'Estimativa Indicativa';
    if (score >= 0.8) level = 'Inventário de Alta Confiabilidade';
    else if (score >= 0.6) level = 'Estimativa Auditável';
    else if (score >= 0.4) level = 'Estimativa Técnica';

    return {
        score,
        level
    };
}
