import React from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

export const UserOnboarding: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = React.useState(0);

  const stepsByRole: Record<string, OnboardingStep[]> = {
    producer: [
      { title: "Boas-vindas, Produtor", description: "Seu painel é focado na originação e preservação. Aqui você registra e monitora suas áreas.", icon: "home" },
      { title: "Registro com QTAG", description: "Vá em 'Meus Projetos' para cadastrar uma nova área. Você precisará das coordenadas das 4 Tags NFC instaladas nos vértices.", icon: "location_on" },
      { title: "Monitoramento IA", description: "Acompanhe a saúde da sua floresta em 'Monitoramento NDVI'. Nossa IA valida a integridade a cada 10 dias via satélite.", icon: "monitoring" },
      { title: "Pronto para Certificar", description: "Após o registro, aguarde a validação da Certificadora para iniciar a tokenização dos seus ativos.", icon: "verified" }
    ],
    auditor: [
      { title: "Portal de Auditoria", description: "Este é seu ambiente técnico de validação e fé pública. Sua precisão garante a integridade do sistema.", icon: "gavel" },
      { title: "Fila de Verificação", description: "Em 'Fila de Auditoria', você encontrará projetos aguardando inspeção física ou alertas de anomalias.", icon: "list_alt" },
      { title: "Validação em Campo", description: "Ao visitar o local, utilize nosso app para ler as Tags QTAG e confirmar a biometria facial do proponente.", icon: "qr_code_scanner" },
      { title: "Assinatura Digital", description: "Seu relatório final é a chave que desbloqueia os créditos para venda. Toda aprovação é registrada on-chain.", icon: "edit_document" }
    ],
    company: [
      { title: "Portal Corporativo", description: "Aqui você gerencia sua jornada rumo ao Net Zero de forma transparente e auditável.", icon: "business" },
      { title: "Conta Carbono", description: "Utilize nossa calculadora para inventariar suas emissões e entender sua necessidade de compensação.", icon: "calculate" },
      { title: "Marketplace Direto", description: "Navegue pelo mercado para adquirir créditos de projetos auditados, com rastreabilidade total do produtor.", icon: "shopping_cart" },
      { title: "Aposentadoria (Burn)", description: "Para oficializar sua compensação, realize o 'Burn' dos ativos. Isso gera seu Certificado de Impacto Ambiental.", icon: "local_fire_department" }
    ],
    admin: [
      { title: "Gestão Master", description: "Acesso total aos fluxos do ecossistema e supervisão de conformidade.", icon: "admin_panel_settings" }
    ]
  };

  const currentSteps = stepsByRole[user?.role || 'producer'] || stepsByRole.producer;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[var(--bg-deep)] border border-[var(--border-color)] w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/5">
          <div 
            className="h-full bg-[var(--accent-color)] transition-all duration-500" 
            style={{ width: `${((currentStep + 1) / currentSteps.length) * 100}%` }}
          />
        </div>

        <div className="p-10">
          <div className="flex justify-between items-start mb-12">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-color)]/10 flex items-center justify-center">
               <span className="material-symbols-outlined text-[var(--accent-color)] text-2xl">
                 {currentSteps[currentStep].icon}
               </span>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 mb-12 min-h-[160px]">
            <h3 className="text-3xl font-display font-bold text-white leading-tight uppercase tracking-tighter">
              {currentSteps[currentStep].title}
            </h3>
            <p className="text-gray-400 text-lg leading-relaxed font-light">
              {currentSteps[currentStep].description}
            </p>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {currentSteps.map((_, i) => (
                <div key={i} className={`h-1 w-4 rounded-full transition-all ${i === currentStep ? 'bg-[var(--accent-color)] w-8' : 'bg-white/10'}`} />
              ))}
            </div>

            <div className="flex gap-4">
              {currentStep > 0 && (
                <button 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="p-4 rounded-2xl border border-white/5 text-gray-500 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              
              <button 
                onClick={() => {
                  if (currentStep < currentSteps.length - 1) {
                    setCurrentStep(prev => prev + 1);
                  } else {
                    onClose();
                  }
                }}
                className="px-8 py-4 rounded-2xl bg-[var(--accent-color)] text-black font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_30px_rgba(129,199,132,0.2)]"
              >
                {currentStep === currentSteps.length - 1 ? 'Começar Agora' : 'Próximo'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-10 py-6 bg-white/5 border-t border-white/5 flex items-center gap-3">
           <PlayCircle className="w-5 h-5 text-[var(--accent-color)]" />
           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Acompanhe o tour guiado pelo painel</p>
        </div>
      </div>
    </div>
  );
};
