import { PublicMapExperience } from '../../components/PublicMapExperience';

export default function PublicMapPage() {
    return (
        <div className="bg-[#050a05] min-h-screen pt-20">
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tighter">
                    Mapa Brasil <span className="text-primary italic">Ativos Voluntários</span>
                </h1>
                <p className="text-gray-400 mt-2 max-w-2xl">
                    Explore a rede nacional de projetos de conservação e restauração. Rastreabilidade absoluta do solo ao ledger.
                </p>
            </div>
            
            <div className="h-[calc(100vh-250px)]">
                <PublicMapExperience />
            </div>
        </div>
    );
}
