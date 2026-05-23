import type { RawInput, SIEResult } from './types';
import { detectProfile } from './profiles/detectProfile';
import { normalizeInputs } from './inputs/normalizeInputs';
import { validateRanges } from './inputs/validateRanges';
import { calculateScope1 } from './engine/calculateScope1';
import { calculateScope2 } from './engine/calculateScope2';
import { calculateScope3 } from './engine/calculateScope3';
import { uncertaintyEngine } from './engine/uncertaintyEngine';
import { classificationEngine } from './engine/classificationEngine';
import { scenarioEngine } from './engine/scenarioEngine';
import { compensationTranslator } from './output/compensationTranslator';

// Helper to interact with the engine from UI
export async function runSIEv11(input: RawInput): Promise<SIEResult> {
    // 1. Profile & Context
    const profile = detectProfile(input);

    // 2. Normalize
    const normalized = normalizeInputs(input, profile);
    validateRanges(normalized, profile);

    // 3. Emisson Core (Scopes)
    const scope1 = calculateScope1(normalized, profile);
    const scope2 = calculateScope2(normalized, profile);
    const scope3 = calculateScope3(normalized, profile);

    const total = scope1 + scope2 + scope3;

    // 4. Intelligence Layers
    const uncertainty = uncertaintyEngine(normalized, profile);
    const classification = classificationEngine(total, profile);
    const scenarios = scenarioEngine(total, normalized);
    const compensation = compensationTranslator(total, uncertainty.level);

    // 5. Governance
    const hash = 'SIE-v1.1-' + Math.random().toString(36).substring(7).toUpperCase();

    return {
        totalEmissions: Number(total.toFixed(3)),
        scopeBreakdown: {
            scope1: Number(scope1.toFixed(3)),
            scope2: Number(scope2.toFixed(3)),
            scope3: Number(scope3.toFixed(3))
        },
        uncertainty,
        classification,
        scenarios,
        compensation,
        hash,
        generatedAt: new Date().toISOString(),
        profileDetected: profile
    };
}

export const runImpactEngine = runSIEv11;
