import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Building2,
    Sprout,
    Landmark,
    Car,
    Zap,
    Plane,
    ArrowRight,
    Leaf,
    ShieldCheck,
    Info,
    Factory,
    BarChart3,
    Tractor
} from 'lucide-react';
import { runSIEv11 } from '../../services/impact-engine';
import type { SIEResult, ProfileType, RawInput } from '../../services/impact-engine/types';

// Palette Constants
const COLORS = {
    bg: 'bg-sinarca-forest',
    card: 'bg-[#002B1C]',
    border: 'border-[#004D33]',
    neon: 'text-[#00FF94]',
    neonBg: 'bg-[#00FF94]',
    text: 'text-white',
    muted: 'text-[#8AA695]'
};

export const SinarcaImpactCalculator: React.FC = () => {
    // State
    const [step, setStep] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    // Form Data (RawInput schema)
    const [profileType, setProfileType] = useState<ProfileType>('PF');

    // Detailed State
    const [transport, setTransport] = useState({ distanceKm: 0, fuel: 'gasoline' as const, isFleet: false });
    const [energy, setEnergy] = useState({ kwh: 0, source: 'SIN' as const });
    const [flights, setFlights] = useState({ hours: 0 });
    const [stationary, setStationary] = useState({ fuel: 'none' as const, quantity: 0, unit: 'liters' as const });

    const [result, setResult] = useState<SIEResult | null>(null);

    // Handlers
    const handleCalculate = async () => {
        setLoading(true);
        setTimeout(async () => {
            const input: RawInput = {
                profileType,
                transport: {
                    distanceKm: transport.distanceKm,
                    fuel: transport.fuel,
                    isFleet: transport.isFleet // Passed to engine
                },
                energy: {
                    kwh: energy.kwh,
                    source: energy.source
                },
                flights,
                stationary: stationary.fuel !== 'none' ? stationary : undefined
            };

            const res = await runSIEv11(input);
            setResult(res);
            setLoading(false);
            setStep(2);
        }, 1500);
    };

    // Render Steps
    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
            <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] text-xs font-bold uppercase tracking-wider mb-4">
                    <Factory className="w-4 h-4" />
                    SINARCA Impact Engine v1.1
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
                    Motor Inteligente de <span className="text-[#00FF94]">Emissões</span>
                </h1>
                <p className="text-[#8AA695] text-lg max-w-2xl mx-auto">
                    Medição auditável com detecção de perfil, análise de escopos e inteligência climática de cenários.
                </p>
            </div>

            <div className={`transition-all duration-500 transform ${loading ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
                {step === 0 && (
                    <StepProfile profile={profileType} setProfile={setProfileType} onNext={() => setStep(1)} />
                )}
                {step === 1 && (
                    <StepInputs
                        profile={profileType}
                        transport={transport} setTransport={setTransport}
                        energy={energy} setEnergy={setEnergy}
                        flights={flights} setFlights={setFlights}
                        stationary={stationary} setStationary={setStationary}
                        onBack={() => setStep(0)}
                        onCalculate={handleCalculate}
                    />
                )}
                {step === 2 && result && (
                    <StepResult result={result} onReset={() => setStep(0)} />
                )}
            </div>

            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-[#00FF94] border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(0,255,148,0.4)]"></div>
                    <p className="text-[#00FF94] font-mono animate-pulse">SIE v1.1: CALCULANDO ESCOPOS & INCERTEZA...</p>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const StepProfile = ({ profile, setProfile, onNext }: any) => {
    const profiles = [
        { id: 'PF', label: 'Pessoa Física', icon: User, desc: 'Para você e sua casa' },
        { id: 'PJ', label: 'Empresa / Indústria', icon: Building2, desc: 'Negócios, Frotas e Indústria Leve' },
        { id: 'ONG', label: 'Instituição / ONG', icon: Landmark, desc: 'Para projetos sociais' },
        { id: 'GOV', label: 'Rural / Agro', icon: Tractor, desc: 'Para o setor agropecuário' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {profiles.map((p) => {
                    const Icon = p.icon;
                    const isActive = profile === p.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => setProfile(p.id)}
                            className={`p-6 rounded-2xl border text-left transition-all duration-300 group ${isActive
                                ? 'bg-[#00FF94]/10 border-[#00FF94] shadow-[0_0_15px_rgba(0,255,148,0.1)]'
                                : 'bg-[#002B1C] border-[#004D33] hover:border-[#00FF94]/30'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isActive ? 'bg-[#00FF94] text-[#002B1C]' : 'bg-white/5 text-[#8AA695] group-hover:text-white'
                                }`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-white' : 'text-gray-200'}`}>{p.label}</h3>
                            <p className="text-xs text-[#8AA695]">{p.desc}</p>
                        </button>
                    )
                })}
            </div>
            <div className="flex justify-center">
                <button
                    onClick={onNext}
                    className="flex items-center gap-3 px-8 py-4 bg-[#00FF94] hover:bg-[#00CC76] text-[#002B1C] rounded-xl font-bold text-lg tracking-wide transition-all shadow-lg hover:shadow-[0_0_20px_rgba(0,255,148,0.4)]"
                >
                    Configurar Motor
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const StepInputs = ({ profile, transport, setTransport, energy, setEnergy, flights, setFlights, stationary, setStationary, onBack, onCalculate }: any) => {
    // Dynamic Limits logic preserved/enhanced
    const limits = profile === 'PF'
        ? { transport: 4000, energy: 1500, flights: 50, stationary: 0 }
        : { transport: 100000, energy: 100000, flights: 500, stationary: 5000 };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transport Card */}
                <div className="bg-[#002B1C] border border-[#004D33] p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#00FF94]/10 rounded-lg text-[#00FF94]"><Car className="w-6 h-6" /></div>
                        <div><h3 className="text-white font-bold text-lg">Transporte</h3><p className="text-xs text-[#8AA695]">Deslocamento e Frotas</p></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><label className="text-sm font-bold text-white">Distância (km/mês)</label><span className="text-[#00FF94] font-mono">{transport.distanceKm.toLocaleString()}</span></div>
                        <input type="range" min="0" max={limits.transport} value={transport.distanceKm} onChange={(e) => setTransport({ ...transport, distanceKm: Number(e.target.value) })} className="w-full h-2 bg-[#004D33] rounded-lg cursor-pointer accent-[#00FF94]" />

                        <div className="flex gap-2 flex-wrap">
                            {['gasoline', 'ethanol', 'diesel'].map(f => (
                                <button key={f} onClick={() => setTransport({ ...transport, fuel: f })} className={`text-[10px] px-3 py-1 rounded border uppercase ${transport.fuel === f ? 'bg-[#00FF94] text-black border-[#00FF94]' : 'border-[#004D33] text-[#8AA695]'}`}>{f}</button>
                            ))}
                        </div>
                        {profile !== 'PF' && (
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                                <input type="checkbox" checked={transport.isFleet} onChange={(e) => setTransport({ ...transport, isFleet: e.target.checked })} className="accent-[#00FF94]" />
                                Veículos da Frota (Escopo 1)
                            </label>
                        )}
                    </div>
                </div>

                {/* Energy Card */}
                <div className="bg-[#002B1C] border border-[#004D33] p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#00FF94]/10 rounded-lg text-[#00FF94]"><Zap className="w-6 h-6" /></div>
                        <div><h3 className="text-white font-bold text-lg">Energia</h3><p className="text-xs text-[#8AA695]">Eletricidade e Redes</p></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><label className="text-sm font-bold text-white">Consumo (kWh/mês)</label><span className="text-[#00FF94] font-mono">{energy.kwh.toLocaleString()}</span></div>
                        <input type="range" min="0" max={limits.energy} value={energy.kwh} onChange={(e) => setEnergy({ ...energy, kwh: Number(e.target.value) })} className="w-full h-2 bg-[#004D33] rounded-lg cursor-pointer accent-[#00FF94]" />

                        <div className="flex gap-2">
                            <button onClick={() => setEnergy({ ...energy, source: 'SIN' })} className={`text-[10px] px-3 py-1 rounded border uppercase ${energy.source === 'SIN' ? 'bg-[#00FF94] text-black' : 'border-[#004D33] text-[#8AA695]'}`}>Rede (SIN)</button>
                            <button onClick={() => setEnergy({ ...energy, source: 'SOLAR' })} className={`text-[10px] px-3 py-1 rounded border uppercase ${energy.source === 'SOLAR' ? 'bg-[#00FF94] text-black' : 'border-[#004D33] text-[#8AA695]'}`}>Solar/Eólica</button>
                        </div>
                    </div>
                </div>

                {/* Aviation */}
                <div className="bg-[#002B1C] border border-[#004D33] p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#00FF94]/10 rounded-lg text-[#00FF94]"><Plane className="w-6 h-6" /></div>
                        <div><h3 className="text-white font-bold text-lg">Aviação</h3><p className="text-xs text-[#8AA695]">Viagens Corporativas</p></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><label className="text-sm font-bold text-white">Horas de Voo/ano</label><span className="text-[#00FF94] font-mono">{flights.hours}</span></div>
                        <input type="range" min="0" max={limits.flights} value={flights.hours} onChange={(e) => setFlights({ ...flights, hours: Number(e.target.value) })} className="w-full h-2 bg-[#004D33] rounded-lg cursor-pointer accent-[#00FF94]" />
                    </div>
                </div>

                {/* Stationary (PJ Only) */}
                {profile !== 'PF' && (
                    <div className="bg-[#002B1C] border border-[#004D33] p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#00FF94]/10 rounded-lg text-[#00FF94]"><Factory className="w-6 h-6" /></div>
                            <div><h3 className="text-white font-bold text-lg">Estacionária</h3><p className="text-xs text-[#8AA695]">Geradores e Caldeiras</p></div>
                        </div>
                        <div className="space-y-4">
                            <select
                                value={stationary.fuel}
                                onChange={(e) => setStationary({ ...stationary, fuel: e.target.value as any })}
                                className="w-full bg-black/20 border border-[#004D33] text-white text-xs rounded p-2"
                            >
                                <option value="none">Nenhum</option>
                                <option value="diesel">Diesel (Gerador)</option>
                                <option value="glp">GLP (Cozinha/Aquec.)</option>
                                <option value="natural_gas">Gás Natural</option>
                            </select>
                            {stationary.fuel !== 'none' && (
                                <>
                                    <div className="flex justify-between items-center"><label className="text-sm font-bold text-white">Consumo ({stationary.fuel === 'glp' ? 'kg' : 'L'}/mês)</label><span className="text-[#00FF94] font-mono">{stationary.quantity}</span></div>
                                    <input type="range" min="0" max={limits.stationary} value={stationary.quantity} onChange={(e) => setStationary({ ...stationary, quantity: Number(e.target.value) })} className="w-full h-2 bg-[#004D33] rounded-lg cursor-pointer accent-[#00FF94]" />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-[#004D33] text-[#8AA695] font-bold hover:bg-[#004D33] hover:text-white transition-colors">Voltar</button>
                <button onClick={onCalculate} className="flex-[2] py-4 rounded-xl bg-[#00FF94] text-[#002B1C] font-bold text-lg hover:bg-[#00CC76] transition-all shadow-[0_0_20px_rgba(0,255,148,0.2)]">
                    Processar Motor SIE v1.1
                </button>
            </div>
        </div>
    );
};

const StepResult = ({ result, onReset }: { result: SIEResult, onReset: () => void }) => {
    const navigate = useNavigate();
    return (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">

            {/* Classification Header */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                {/* Score Card */}
                <div className="flex-1 bg-gradient-to-br from-[#003D28] to-[#002B1C] rounded-3xl border border-[#00FF94]/30 p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF94]/10 rounded-full blur-2xl"></div>
                    <span className="inline-block px-3 py-1 rounded-full border border-[#00FF94]/30 text-[#00FF94] text-[10px] font-bold uppercase tracking-widest mb-4">
                        {result.profileDetected} • {result.classification}
                    </span>
                    <div className="mb-2">
                        <span className="text-5xl font-display font-bold text-white">{result.compensation.ideal}</span>
                        <span className="text-lg font-bold text-[#00FF94] ml-2">tCO₂e</span>
                    </div>
                    <p className="text-xs text-[#8AA695] max-w-xs mb-6">Emissões anuais totais (Escopo 1 + 2 + 3)</p>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/80">
                            <span>Escopo 1 (Diretas)</span>
                            <span className="font-mono text-[#00FF94]">{result.scopeBreakdown.scope1} t</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/80">
                            <span>Escopo 2 (Energia)</span>
                            <span className="font-mono text-[#00FF94]">{result.scopeBreakdown.scope2} t</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/80">
                            <span>Escopo 3 (Indiretas)</span>
                            <span className="font-mono text-[#00FF94]">{result.scopeBreakdown.scope3} t</span>
                        </div>
                    </div>
                </div>

                {/* Scenario & Compensation Card */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex-1 bg-[#002B1C] border border-[#004D33] p-6 rounded-2xl relative">
                        <h4 className="flex items-center gap-2 text-white font-bold mb-4">
                            <ShieldCheck className="w-5 h-5 text-[#00FF94]" />
                            Status de Incerteza
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">{result.uncertainty.score}%</div>
                                <div className="text-[10px] text-[#8AA695] uppercase">Score</div>
                            </div>
                            <div className="h-10 w-px bg-[#004D33]"></div>
                            <div>
                                <div className="text-sm font-bold text-[#00FF94]">{result.uncertainty.level}</div>
                                <div className="text-[10px] text-[#8AA695]">Margem de erro: +/- {(result.uncertainty.range.max - 1) * 100}%</div>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/public/consulta')}
                        className="flex-[2] bg-[#00FF94] text-[#002B1C] p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                        <Leaf className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform" />
                        <h3 className="text-xl font-bold mb-2">Compensar Agora</h3>
                        <p className="text-sm font-medium opacity-80 mb-4">Meta ideal: {result.compensation.ideal} tCO₂e</p>
                        <button className="bg-[#001A10] text-white py-3 px-6 rounded-xl font-bold text-sm uppercase tracking-wide w-fit">
                            Ver Projetos Auditados
                        </button>
                    </div>
                </div>
            </div>

            {/* Scenarios Graph (Simplified Visualization) */}
            <div className="bg-[#002B1C] border border-[#004D33] p-8 rounded-3xl">
                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#00FF94]" />
                    Projeção de Cenários (SIE Intelligence)
                </h3>
                <div className="grid grid-cols-4 gap-4 items-end h-40">
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold text-[#00FF94]">{result.scenarios.optimized.toFixed(1)}t</div>
                        <div className="w-full bg-[#00FF94]/30 rounded-t-lg transition-all hover:bg-[#00FF94]" style={{ height: '60%' }}></div>
                        <span className="text-[10px] text-[#8AA695] uppercase font-bold">Otimizado</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold text-white">{result.scenarios.current.toFixed(1)}t</div>
                        <div className="w-full bg-white/20 rounded-t-lg transition-all border border-white/30" style={{ height: '80%' }}></div>
                        <span className="text-[10px] text-white uppercase font-bold">Atual</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold text-red-400">{result.scenarios.growth20.toFixed(1)}t</div>
                        <div className="w-full bg-red-500/20 rounded-t-lg transition-all hover:bg-red-500/40" style={{ height: '100%' }}></div>
                        <span className="text-[10px] text-[#8AA695] uppercase font-bold">Crescimento</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold text-[#00FF94] font-mono">NET-ZERO</div>
                        <div className="w-full border-t-2 border-dashed border-[#00FF94] h-px my-auto"></div>
                        <span className="text-[10px] text-[#00FF94] uppercase font-bold">Meta 2030</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-8">
                <button onClick={onReset} className="text-[#8AA695] hover:text-white underline text-sm">
                    Recalibrar Motor
                </button>
            </div>
        </div>
    );
};
