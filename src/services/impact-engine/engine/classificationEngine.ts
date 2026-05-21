import type { ProfileType } from '../types';

export function classificationEngine(totalTon: number, profile: ProfileType): string {
    // PF Scale
    if (profile === 'PF') {
        if (totalTon < 2) return 'Baixo Emissor';
        if (totalTon > 10) return 'Alto Emissor';
        return 'Emissor Moderado';
    }

    // PJ Scale (SME/Light Ind)
    if (profile === 'PJ' || profile === 'INDUSTRIAL_LIGHT') {
        if (totalTon < 10) return 'Operação Eficiente'; // micro business
        if (totalTon > 1000) return 'Operação Intensiva';
        if (totalTon > 5000) return 'Operação Crítica';
        return 'Padrão Setorial';
    }

    // Others
    if (totalTon > 500) return 'Alto Volume';
    return 'Volume Moderado';
}
