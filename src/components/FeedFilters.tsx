import React from 'react';

interface FeedFiltersProps {
    currentFilter: string;
    currentState: string;
    onFilterChange: (filter: string) => void;
    onStateChange: (state: string) => void;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({ currentFilter, onFilterChange }) => {
    const filters = [
        { id: 'all', label: 'Todos' },
        { id: 'compensado', label: 'Compensados' },
        { id: 'novo', label: 'Novos Projetos' },
        { id: 'pendente', label: 'Pendentes' },
        { id: 'anomalia', label: 'Anomalias' }
    ];

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-text-muted mr-2">Filtrar por:</span>
            {filters.map(f => (
                <button
                    key={f.id}
                    onClick={() => onFilterChange(f.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${currentFilter === f.id
                        ? 'bg-sinarca-neon text-sinarca-deep border-sinarca-neon'
                        : 'bg-sinarca-deep text-text-muted border-sinarca-border hover:border-sinarca-neon/50 hover:text-white'
                        }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
};
