import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiPost } from '../../services/api';

export default function RegisterInventory() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        state: 'AC',
        year: '2025',
        scope1: '',
        scope2: '',
        grossRemovals: '',
        protectedArea: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiPost('/inventory/declare', {
                escopo_1: Number(formData.scope1 || 0),
                escopo_2: Number(formData.scope2 || 0),
                escopo_3: Number(formData.grossRemovals || 0),
            });
            setSuccess(true);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in">
                <div className="w-20 h-20 bg-sinarca-neon/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-sinarca-neon" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Inventário Registrado com Sucesso!</h2>
                <p className="text-[#a0ba9c] max-w-md mb-8">
                    Os dados foram submetidos para validação do Comitê Científico e em breve estarão disponíveis no Mapa Nacional (NDC).
                </p>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/painel/mapa-nacional')} className="px-6 py-3 bg-sinarca-neon text-[#121811] font-bold rounded-lg hover:bg-white transition-colors">
                        Ver Mapa Nacional
                    </button>
                    <button onClick={() => setSuccess(false)} className="px-6 py-3 bg-[#2a3928] text-white font-bold rounded-lg hover:bg-[#3e543b] transition-colors">
                        Novo Registro
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            <header className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sinarca-neon/10 border border-sinarca-neon/20 text-sinarca-neon text-xs font-bold uppercase tracking-wider mb-4">
                    <FileText className="w-3 h-3" />
                    Área Governamental
                </div>
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Registro de Inventário (NDC)</h1>
                <p className="text-[#a0ba9c]">
                    Formulário oficial para submissão de dados de emissões e remoções estaduais para contabilização no Sistema Nacional.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="bg-[#132210] border border-[#2a3928] rounded-2xl p-6 md:p-8 shadow-2xl">
                {/* Step 1: Identification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#a0ba9c] mb-2">Estado / Jurisdição</label>
                        <select
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full bg-[#1d271b] border border-[#2a3928] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sinarca-neon transition-colors"
                        >
                            <option value="AC">Acre (AC)</option>
                            <option value="AM">Amazonas (AM)</option>
                            <option value="PA">Pará (PA)</option>
                            <option value="MT">Mato Grosso (MT)</option>
                            <option value="SP">São Paulo (SP)</option>
                            {/* Add other states */}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#a0ba9c] mb-2">Ano Base (Relatório)</label>
                        <select
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            className="w-full bg-[#1d271b] border border-[#2a3928] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sinarca-neon transition-colors"
                        >
                            <option value="2025">2025 (Corrente)</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                        </select>
                    </div>
                </div>

                <div className="h-px bg-[#2a3928] my-8"></div>

                {/* Step 2: Emissions Data */}
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                    <AlertTriangle className="text-yellow-500 w-5 h-5" />
                    Emissões Brutas (tCO2e)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#a0ba9c] mb-2">Escopo 1 (Diretas)</label>
                        <input
                            type="number"
                            name="scope1"
                            placeholder="Ex: 5000000"
                            value={formData.scope1}
                            onChange={handleChange}
                            className="w-full bg-[#1d271b] border border-[#2a3928] rounded-lg px-4 py-3 text-white placeholder-[#3e543b] focus:outline-none focus:border-sinarca-neon transition-colors font-mono"
                        />
                        <p className="text-[10px] text-[#a0ba9c] mt-1">Queima de combustíveis, processos industriais, desmatamento.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#a0ba9c] mb-2">Escopo 2 (Energia)</label>
                        <input
                            type="number"
                            name="scope2"
                            placeholder="Ex: 1200000"
                            value={formData.scope2}
                            onChange={handleChange}
                            className="w-full bg-[#1d271b] border border-[#2a3928] rounded-lg px-4 py-3 text-white placeholder-[#3e543b] focus:outline-none focus:border-sinarca-neon transition-colors font-mono"
                        />
                        <p className="text-[10px] text-[#a0ba9c] mt-1">Consumo de eletricidade da rede.</p>
                    </div>
                </div>

                <div className="h-px bg-[#2a3928] my-8"></div>

                {/* Step 3: Local Contributions */}
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                    <CheckCircle className="text-sinarca-neon w-5 h-5" />
                    Contribuições Locais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#a0ba9c] mb-2">Remoções Brutas (Florestas/Solo)</label>
                        <input
                            type="number"
                            name="grossRemovals"
                            placeholder="Ex: 8000000"
                            value={formData.grossRemovals}
                            onChange={handleChange}
                            className="w-full bg-[#1d271b] border border-[#2a3928] rounded-lg px-4 py-3 text-white placeholder-[#3e543b] focus:outline-none focus:border-sinarca-neon transition-colors font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#a0ba9c] mb-2">Área Conservada (ha)</label>
                        <input
                            type="number"
                            name="protectedArea"
                            placeholder="Ex: 450000"
                            value={formData.protectedArea}
                            onChange={handleChange}
                            className="w-full bg-[#1d271b] border border-[#2a3928] rounded-lg px-4 py-3 text-white placeholder-[#3e543b] focus:outline-none focus:border-sinarca-neon transition-colors font-mono"
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-6 border-t border-[#2a3928]">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-sinarca-neon text-[#121811] font-bold text-sm px-8 py-3 rounded-lg hover:bg-white transition-all shadow-lg hover:shadow-sinarca-neon/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processando...' : (
                            <>
                                <Save className="w-4 h-4" /> Registrar Inventário
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
