import React from 'react';
import { TrendingUp, BadgeCheck, ShieldAlert, Timer, Leaf, ShieldCheck, AlertCircle } from 'lucide-react';

interface StatsProps {
    totalCompensated: number;
    activeProjects: number;
    auditedProjects: number;
    anomalies: number;
    onCardClick?: (filter: string) => void;
}

export const StatsCards = ({ totalCompensated, activeProjects, auditedProjects, anomalies, onCardClick }: StatsProps) => {
    const formatCompact = (num: number) => new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={TrendingUp} 
                label="Total Compensado" 
                value={`${formatCompact(totalCompensated)} tCO2e`} 
                color="text-primary"
                onClick={() => onCardClick?.('compensado')}
            />
            <StatCard 
                icon={Leaf} 
                label="Projetos Ativos" 
                value={activeProjects} 
                color="text-primary"
                onClick={() => onCardClick?.('novo')}
            />
            <StatCard 
                icon={Timer} 
                label="Em Auditoria" 
                value={auditedProjects} 
                color="text-orange-500"
                onClick={() => onCardClick?.('auditado')}
            />
            <StatCard 
                icon={AlertCircle} 
                label="Anomalias" 
                value={anomalies} 
                color="text-red-500"
                onClick={() => onCardClick?.('anomalies')}
            />
        </div>
    );
};

function StatCard({ icon: Icon, label, value, color, onClick }: any) {
    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gray-50 ${color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className="text-2xl font-black text-black tracking-tight">{value}</h3>
        </div>
    );
}
