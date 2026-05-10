import { LegalPage } from '../../components/legal/LegalPage';

export default function CreditCycle() {
  return (
    <LegalPage 
      title="Ciclo de Vida do Crédito" 
      subtitle="SISTEMA NACIONAL DE RASTREABILIDADE DE CRÉDITOS AMBIENTAIS"
      lastUpdated="Maio de 2026"
    >
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">1. Introdução</h2>
        <p>
          Este documento detalha o ciclo de vida completo de um crédito ambiental na plataforma SINARCA, desde sua criação (mint) até sua aposentadoria (burn). Cada fase é documentada em Ledger Distribuído (Blockchain), criando um histórico imutável e auditável que garante a integridade absoluta do ativo ambiental.
        </p>
      </section>

      <section className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">2. Visão Geral do Ciclo</h2>
            <div className="space-y-4">
              {[
                { phase: "Fase 1: Criação (Mint)", desc: "Tokens criados em status BLOQUEADO com base na certificação." },
                { phase: "Fase 2: Validação", desc: "Auditoria em campo confirma conformidade e desbloqueia os ativos." },
                { phase: "Fase 3: Comercialização", desc: "Tokens são transferidos para compradores no marketplace." },
                { phase: "Fase 4: Compensação", desc: "Crédito é vinculado a um relatório de emissões legítimo." },
                { phase: "Fase 5: Aposentadoria (Burn)", desc: "Token é queimado permanentemente para evitar reuso." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">{i+1}</div>
                  <div>
                    <h4 className="text-white font-bold text-sm uppercase">{item.phase}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-8 rounded-[3rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 aspect-square flex items-center justify-center text-center">
             <div className="space-y-4">
                <div className="text-6xl font-display font-bold text-white uppercase">MINT</div>
                <div className="material-symbols-outlined text-4xl text-primary">arrow_downward</div>
                <div className="text-6xl font-display font-bold text-white/20 uppercase">BURN</div>
             </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">3. Fase 1: Criação (MINT)</h2>
        <p>
          O processo de cunhagem (mint) ocorre apenas após a validação inicial do projeto e emissão do certificado técnico. Os tokens são criados com metadados vinculados ao polígono geográfico e ao Hash Baseline da imagem Sentinel-2.
        </p>
        <div className="p-6 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs text-primary">
          <p>// Registro de Emissão em Ledger Distribuído</p>
          <p>Metadata: &#123;</p>
          <p>  &nbsp;&nbsp;projectId: "SINARCA-2026-001",</p>
          <p>  &nbsp;&nbsp;baselineHash: "a7f3e9c2d1b4f6a8e9c2...",</p>
          <p>  &nbsp;&nbsp;status: "LOCKED",</p>
          <p>  &nbsp;&nbsp;totalSupply: 75</p>
          <p>&#125;</p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">4. Fase 2: Validação e Desbloqueio</h2>
        <p>
          Os créditos permanecem <strong>bloqueados</strong> até que um auditor independente realize a inspeção física. O desbloqueio é uma função de Smart Contract acionada apenas pela confirmação biométrica e geolocalizada do auditor em campo.
        </p>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li>Leitura obrigatória das 4 Tags QTAG nos vértices.</li>
          <li>Verificação de integridade da biomassa local.</li>
          <li>Comparação em tempo real com o índice NDVI histórico.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">5. Fase 3 & 4: Comercialização e Uso</h2>
        <p>
          A transferência de propriedade é registrada on-chain, permitindo rastrear o caminho do crédito desde o produtor até a empresa final. A compensação exige a apresentação de um relatório de emissões que justifique o uso do crédito.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">6. Fase 5: Aposentadoria (BURN)</h2>
        <p>
          Este é o estágio final. Para que a compensação seja válida perante auditorias externas e órgãos reguladores, o token deve ser <strong>queimado (burn)</strong>. Isso remove o ativo de circulação permanentemente, impossibilitando qualquer forma de dupla contagem ou revenda fraudulenta.
        </p>
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl">
           <h4 className="text-red-500 font-bold uppercase text-xs mb-2">Segurança de Aposentadoria</h4>
           <p className="text-sm text-gray-500">
             Uma vez que o burn é executado em Ledger Distribuído, a ação é irreversível. O certificado de compensação gerado contém o hash da transação como prova irrefutável de impacto ambiental.
           </p>
        </div>
      </section>
    </LegalPage>
  );
}
