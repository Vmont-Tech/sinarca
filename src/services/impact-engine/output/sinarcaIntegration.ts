import { apiGet } from '../../api';

export function calculateTotalAcquisition(
    _targetTon: number
): number {
    return _targetTon;
}

export async function linkToSinarca(targetTon: number) {
    const response = await apiGet<any>('/marketplace');
    const credits = Array.isArray(response?.credits) ? response.credits : [];
    return credits
        .map((project: any) => ({
            id: project.friendlyId || project.id,
            name: project.name,
            pricePerTon: Number(project.metrics?.investmentValue || 0) / Math.max(Number(project.metrics?.carbonStock || 1), 1),
            available: Number(project.metrics?.carbonStock || 0),
        }))
        .filter((project: any) => project.available >= targetTon);
}
