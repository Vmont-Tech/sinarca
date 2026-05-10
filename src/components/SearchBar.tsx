import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
    onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onSearch(val);
    };

    return (
        <div className="relative w-full max-w-3xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-sinarca-neon to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center w-full h-14 rounded-2xl bg-sinarca-deep/90 border border-sinarca-border shadow-2xl backdrop-blur-sm">
                <div className="grid place-items-center h-full w-14 text-sinarca-neon">
                    <Search className="w-5 h-5" />
                </div>
                <input
                    className="peer h-full w-full outline-none text-base text-white pr-4 bg-transparent placeholder-text-muted/70 font-sans"
                    placeholder="Buscar por ID do projeto, empresa ou localização..."
                    type="text"
                    value={query}
                    onChange={handleChange}
                />
            </div>
        </div>
    );
};
