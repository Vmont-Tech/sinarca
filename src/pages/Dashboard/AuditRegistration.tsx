
import { useState } from 'react';
import {
    ArrowLeft,
    Building2,
    User,
    QrCode,
    Info,
    Image,
    Trash2,
    ShieldCheck,
    Fingerprint,
    Crosshair,
    AlertTriangle
} from 'lucide-react';

export default function AuditRegistration() {
    const [coordinates, setCoordinates] = useState('');
    const [geoError, setGeoError] = useState<string | null>(null);

    const handleGeoValidation = () => {
        // Mock Validation: Block specific coordinates or close proximity
        // Example: The placeholder coordinates are treated as "Already Taken" for demo purposes.
        const blockedCoords = "-23.550520, -46.633308";

        if (coordinates === blockedCoords || coordinates.includes("-23.55")) {
            setGeoError("ERRO CRÍTICO: Ponto geográfico já registrado no Projeto ID: PRC-2023-104. Risco de Dupla Contagem.");
        } else {
            setGeoError(null);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-sinarca-forest text-white">
            <div className="flex-1 overflow-y-auto p-4 lg:p-10">
                <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-20">
                    {/* Page Heading */}
                    <div className="flex flex-col gap-3 border-b border-sinarca-border pb-6">
                        <div className="flex items-center gap-2 text-sinarca-neon text-sm font-medium mb-1 cursor-pointer hover:underline">
                            <ArrowLeft className="w-4 h-4" />
                            <span>Voltar para Auditorias</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight">Nova Auditoria de Campo</h1>
                        <p className="text-text-muted max-w-2xl text-lg">Preencha os dados abaixo para registrar a validação no blockchain. Esta operação é irreversível.</p>
                    </div>

                    <form className="flex flex-col gap-8" onSubmit={(e) => { e.preventDefault(); handleGeoValidation(); }}>
                        {/* Section 1: Dados da Entidade */}
                        <section className="flex flex-col gap-6 bg-sinarca-deep rounded-xl p-6 lg:p-8 border border-sinarca-border shadow-xl">
                            <div className="flex items-center gap-4 border-b border-sinarca-border pb-4 mb-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sinarca-neon/10 text-sinarca-neon font-bold">1</div>
                                <h3 className="text-xl font-bold text-white">Dados da Entidade</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-muted">CNPJ da Contratada</span>
                                    <div className="relative">
                                        <input className="w-full bg-sinarca-forest border border-sinarca-border rounded-lg h-12 px-4 text-white placeholder-sinarca-border/50 focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon transition-all font-mono" placeholder="00.000.000/0000-00" type="text" />
                                        <Building2 className="w-5 h-5 absolute right-3 top-3.5 text-text-muted pointer-events-none" />
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-muted">CPF do Responsável Técnico</span>
                                    <div className="relative">
                                        <input className="w-full bg-sinarca-forest border border-sinarca-border rounded-lg h-12 px-4 text-white placeholder-sinarca-border/50 focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon transition-all font-mono" placeholder="000.000.000-00" type="text" />
                                        <User className="w-5 h-5 absolute right-3 top-3.5 text-text-muted pointer-events-none" />
                                    </div>
                                </label>
                            </div>
                        </section>

                        {/* Section 2: Detalhes da Auditoria */}
                        <section className="flex flex-col gap-6 bg-sinarca-deep rounded-xl p-6 lg:p-8 border border-sinarca-border shadow-xl">
                            <div className="flex items-center gap-4 border-b border-sinarca-border pb-4 mb-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sinarca-neon/10 text-sinarca-neon font-bold">2</div>
                                <h3 className="text-xl font-bold text-white">Detalhes da Inspeção</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-muted">Credencial OCP</span>
                                    <input className="w-full bg-sinarca-forest/50 border border-sinarca-border rounded-lg h-12 px-4 text-white/50 cursor-not-allowed font-mono" readOnly type="text" value="OCP-BR-4829" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-muted">Data da Inspeção</span>
                                    <div className="relative">
                                        <input className="w-full bg-sinarca-forest border border-sinarca-border rounded-lg h-12 px-4 text-white focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon transition-all file:bg-transparent file:border-0 file:text-white" type="date" />
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-muted">QTAG Serial (Ativo)</span>
                                    <div className="relative">
                                        <input className="w-full bg-sinarca-forest border border-sinarca-border rounded-lg h-12 px-4 text-white placeholder-sinarca-border/50 focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon transition-all font-mono" placeholder="SN-2024-XP99" type="text" />
                                        <QrCode className="w-5 h-5 absolute right-3 top-3.5 text-text-muted pointer-events-none" />
                                    </div>
                                </label>
                            </div>
                        </section>

                        {/* Section 3: Prova de Presença */}
                        <section className="flex flex-col gap-6 bg-sinarca-deep rounded-xl p-6 lg:p-8 border border-sinarca-border shadow-xl">
                            <div className="flex items-center gap-4 border-b border-sinarca-border pb-4 mb-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sinarca-neon/10 text-sinarca-neon font-bold">3</div>
                                <h3 className="text-xl font-bold text-white">Prova de Presença (PoP)</h3>
                            </div>
                            <div className="flex flex-col gap-8">
                                {/* Coordenadas */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    <div className="flex flex-col gap-4">
                                        <label className="flex flex-col gap-2">
                                            <span className="text-sm font-medium text-text-muted">Coordenadas Geográficas</span>
                                            <div className="flex gap-2">
                                                <input
                                                    className={`flex-1 bg-sinarca-forest border ${geoError ? 'border-red-500' : 'border-sinarca-border'} rounded-lg h-12 px-4 text-white placeholder-sinarca-border/50 focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon transition-all font-mono`}
                                                    placeholder="-23.550520, -46.633308"
                                                    type="text"
                                                    value={coordinates}
                                                    onChange={(e) => {
                                                        setCoordinates(e.target.value);
                                                        if (geoError) setGeoError(null);
                                                    }}
                                                    onBlur={handleGeoValidation}
                                                />
                                                <button className="flex items-center justify-center px-4 bg-sinarca-deep hover:bg-sinarca-deep/80 rounded-lg text-sinarca-neon border border-sinarca-border transition-colors" title="Obter localização atual" type="button">
                                                    <Crosshair className="w-5 h-5" />
                                                </button>
                                            </div>
                                            {geoError && (
                                                <div className="text-xs text-red-500 font-bold flex items-center gap-1 animate-pulse mt-1 bg-red-500/10 p-2 rounded">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {geoError}
                                                </div>
                                            )}
                                            <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                                                <Info className="w-4 h-4" />
                                                A tolerância máxima é de 50m do polígono registrado.
                                            </p>
                                        </label>
                                    </div>
                                    <div className="bg-sinarca-forest rounded-lg overflow-hidden h-40 relative border border-sinarca-border">
                                        {/* Placeholder for Map */}
                                        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBmBIA2VYahouSBcSjqWGo2glYx1ybEENcGExVrA7RMTc2IE1HRtHnKgvP_a96wBIL6KoQ5QRH2Kn6ETtEtrunPe-VAxYCnyN8VvYY5xJ85p42y-M5_tBBG_Epcbfn2aq_pIHUJWrq9KeC7ZDEWECRc6q4zbcsqt8y2k5lyiGKdwT6ZM-h-L3wPB1XMjGsKIo_wnbEKWufdMlujieSZF3-O_wAciHfpwtHkcFQzkiq9NITB4sxklzM_0uNxamJxgcqZeUb1mq1KTXA")' }}></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-sinarca-forest to-transparent"></div>
                                        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                            <span className="block w-2 h-2 bg-sinarca-neon rounded-full animate-pulse"></span>
                                            <span className="text-xs font-mono text-white">Sinal GPS: Forte</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Upload Area */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-sm font-medium text-text-muted">Registro Fotográfico (360º)</span>
                                    <div className="border-2 border-dashed border-sinarca-border hover:border-sinarca-neon/50 hover:bg-sinarca-forest/50 transition-all rounded-xl p-8 flex flex-col items-center justify-center text-center group cursor-pointer">
                                        <div className="bg-sinarca-forest p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                            <Image className="w-8 h-8 text-text-muted group-hover:text-sinarca-neon" />
                                        </div>
                                        <h4 className="text-white font-medium mb-1">Arraste fotos 360º aqui</h4>
                                        <p className="text-sm text-text-muted mb-4">ou clique para selecionar arquivos</p>
                                        <p className="text-xs text-text-muted/60">Formatos aceitos: .JPG, .HEIC (Max 50MB)</p>
                                    </div>
                                    {/* File List Item Example */}
                                    <div className="flex items-center justify-between p-3 bg-sinarca-forest border border-sinarca-border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-sinarca-deep flex items-center justify-center">
                                                <Image className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">IMG_360_Auditoria_01.jpg</span>
                                                <span className="text-xs text-text-muted">12.4 MB • Carregado</span>
                                            </div>
                                        </div>
                                        <button className="text-text-muted hover:text-red-400 p-2" type="button">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Actions */}
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-6 border-t border-sinarca-border mt-4">
                            <div className="flex items-start gap-3 max-w-lg">
                                <ShieldCheck className="w-5 h-5 text-sinarca-neon mt-1" />
                                <p className="text-sm text-text-muted">
                                    Ao clicar em registrar, você confirma sob pena de lei que as informações são verídicas. Os dados serão gravados no blockchain SINARCA e não poderão ser alterados.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 w-full lg:w-auto">
                                <button className="px-6 py-3 rounded-lg text-white font-medium hover:bg-sinarca-deep transition-colors w-full lg:w-auto" type="button">
                                    Cancelar
                                </button>
                                <button
                                    className={`px-8 py-3 rounded-lg bg-sinarca-neon hover:bg-[#00cc76] text-sinarca-forest font-bold tracking-wide shadow-[0_0_15px_rgba(0,255,148,0.3)] hover:shadow-[0_0_25px_rgba(0,255,148,0.5)] transition-all flex items-center justify-center gap-2 w-full lg:w-auto ${geoError ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    type="submit"
                                    disabled={!!geoError}
                                >
                                    <Fingerprint className="w-5 h-5" />
                                    REGISTRAR AUDITORIA
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
