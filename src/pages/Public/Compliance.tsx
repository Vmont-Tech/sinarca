import { LegalPage } from '../../components/legal/LegalPage';

export default function Compliance() {
  return (
    <LegalPage 
      title="Auditoria e Compliance" 
      subtitle="SISTEMA NACIONAL DE RASTREABILIDADE DE CRÉDITOS AMBIENTAIS"
      lastUpdated="Maio de 2026"
    >
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">1. Introdução</h2>
        <p>
          O SINARCA estabelece um novo paradigma para a rastreabilidade e a integridade no mercado de créditos ambientais. 
          <strong> É fundamental destacar que o SINARCA atua como uma camada de segurança extra e complementar, sem substituir as metodologias de validação e mensuração de créditos já existentes no mercado ou confrontar regulamentações e instituições estabelecidas.</strong> 
          Este documento detalha as políticas e os mecanismos de auditoria e compliance que garantem a conformidade do sistema com as regulamentações nacionais e internacionais, bem como com os padrões de mercado mais rigorosos. 
          Nosso compromisso é assegurar que cada crédito ambiental transacionado seja legítimo, verificável e contribua efetivamente para um impacto ambiental positivo, combatendo fraudes e o <em>greenwashing</em>, 
          <strong> sempre em estrita observância das leis e normas vigentes.</strong>
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">2. Compromisso com a Transparência e Integridade</h2>
        <p>
          O SINARCA atua como uma camada de segurança adicional, <strong>sem substituir as metodologias de validação e mensuração já existentes no mercado para a geração de créditos.</strong> 
          Pelo contrário, nossa missão é fornecer uma infraestrutura tecnológica que garanta a soberania, a transparência e a rastreabilidade física dos créditos, 
          <strong> atuando como um parceiro inevitável para empresas que buscam compensar suas emissões, auditores com reputações positivas e certificadoras que desejam agregar valor às comunidades locais e fornecer seus créditos de forma transparente, segura e auditável.</strong> 
          Isso é alcançado através de:
        </p>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Rastreabilidade Inovadora:</strong> Vinculação inequívoca do crédito digital à sua origem física através de Tags NFC 424 DNA e monitoramento geoespacial.</li>
          <li><strong>Verificação Contínua:</strong> Monitoramento por inteligência artificial e satélites para detecção de anomalias em tempo real.</li>
          <li><strong>Imutabilidade:</strong> Registro de todas as transações e eventos críticos em Ledger Distribuído (Blockchain).</li>
          <li><strong>Responsabilização:</strong> Assinatura digital biométrica e geolocalizada para auditores e certificadores, atrelando a responsabilidade individual a cada ação.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">3. Alinhamento com Padrões e Certificações de Mercado</h2>
        <p>
          O SINARCA é projetado para complementar e fortalecer os padrões de certificação de créditos de carbono existentes, como Verra (Verified Carbon Standard) e Gold Standard, além de aderir aos princípios do ICVCM (Integrity Council for the Voluntary Carbon Market), <strong>sempre respeitando e integrando-se às metodologias já estabelecidas.</strong>
        </p>
        
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 my-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-bold text-xs uppercase tracking-widest text-primary">Padrão/Princípio</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest text-primary">Descrição</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest text-primary">Como o SINARCA Contribui</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5">
                <td className="p-4 font-bold text-white">Verra (VCS)</td>
                <td className="p-4 text-gray-400">Metodologias rigorosas para quantificação de reduções de emissões, com foco em MRV.</td>
                <td className="p-4 text-gray-400">Fornece uma camada tecnológica robusta para o Monitoramento (IA/Satélite) e Verificação (NFC/Auditoria em campo), garantindo a integridade dos dados de reporte.</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="p-4 font-bold text-white">Gold Standard</td>
                <td className="p-4 text-gray-400">Foco em projetos que geram benefícios sociais e ambientais adicionais, alinhados aos ODS da ONU.</td>
                <td className="p-4 text-gray-400">Aumenta a confiança na integridade dos projetos certificados, validando a permanência e a adicionalidade dos benefícios ambientais através de monitoramento contínuo.</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white">ICVCM (CCPs)</td>
                <td className="p-4 text-gray-400">Dez princípios fundamentais para créditos de carbono de alta qualidade.</td>
                <td className="p-4 text-gray-400">Reforça a medição robusta, verificação independente, registro único (blockchain) e transparência total do ciclo de vida.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">4. Processos de Auditoria e Verificação</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-3">4.1. Auditoria em Campo (Humana e Tecnológica)</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-400">
              <li><strong>Acionamento:</strong> Automático pelo sistema em caso de detecção de anomalias pela IA, complementando os processos existentes.</li>
              <li><strong>Execução:</strong> Realizada por auditores credenciados via aplicativo móvel do SINARCA, coletando evidências fotográficas e vídeos.</li>
              <li><strong>Autenticação:</strong> Assinatura digital biométrica e geolocalizada vinculando o CPF do auditor à inspeção.</li>
              <li><strong>Validação NFC:</strong> Releitura das Tags NFC 424 DNA para verificar a integridade física e gerar CMAC.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary mb-3">4.2. Auditoria Contínua (Inteligência Artificial e Satélite)</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-400">
              <li><strong>Monitoramento Geoespacial:</strong> Imagens Sentinel-2 e IA para monitoramento contínuo de NDVI e cobertura vegetal.</li>
              <li><strong>Geração de Hash de Área:</strong> Identificador único gerado periodicamente. Qualquer alteração aciona alertas automáticos.</li>
              <li><strong>Bloqueio Automático:</strong> Projetos com anomalias são bloqueados para comercialização até auditoria humana.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary mb-3">4.3. Auditoria Blockchain</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-400">
              <li><strong>Transparência Pública:</strong> Todas as transações na Blockchain são publicamente auditáveis.</li>
              <li><strong>Imutabilidade:</strong> Histórico confiável e à prova de adulteração do ciclo de vida de cada crédito.</li>
              <li><strong>Smart Contracts:</strong> Contratos Inteligentes desenvolvidos com foco em segurança e auditabilidade.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">5. Sistema de Identificação e Responsabilização</h2>
        <p>
          O SINARCA implementa um sistema robusto que garante que cada ator do ecossistema seja identificado de forma única e responsabilizado pessoalmente por suas ações, prevenindo fraudes e garantindo segurança jurídica.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
            <h3 className="text-lg font-bold text-secondary mb-4 uppercase tracking-widest">Pessoa Física (CPF)</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Validação de dígito verificador</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Verificação de biometria facial</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Vinculação de conta bancária de titularidade única</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> Registro imutável de ações via CPF</li>
            </ul>
          </div>
          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
            <h3 className="text-lg font-bold text-primary mb-4 uppercase tracking-widest">Pessoa Jurídica (CNPJ)</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Validação cadastral na Receita Federal</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Verificação de representante legal autorizado</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Análise de histórico e conformidade ambiental</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Auditoria de credenciais internacionais</li>
            </ul>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2rem]">
          <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-xs">Penalidades e Sanções</h4>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            O descumprimento das obrigações operacionais ou a detecção de fraudes aciona um processo rigoroso de sanções:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 p-4 rounded-xl">
              <span className="text-yellow-500 font-bold text-[10px] uppercase block mb-1">Severidade Baixa</span>
              <p className="text-[11px] text-gray-500">Rejeição de dados e solicitação de correção imediata.</p>
            </div>
            <div className="bg-black/40 p-4 rounded-xl">
              <span className="text-orange-500 font-bold text-[10px] uppercase block mb-1">Severidade Média</span>
              <p className="text-[11px] text-gray-500">Bloqueio temporário do projeto e multa de 10-50% do valor.</p>
            </div>
            <div className="bg-black/40 p-4 rounded-xl">
              <span className="text-red-500 font-bold text-[10px] uppercase block mb-1">Severidade Alta</span>
              <p className="text-[11px] text-gray-500">Bloqueio permanente, queima de tokens e ação legal criminal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">6. Conformidade Regulatória</h2>
        <p>
          O SINARCA está comprometido com a conformidade com as leis e regulamentações aplicáveis, <strong>atuando estritamente no mercado de créditos voluntários e sem confrontar regulamentações, leis, normas ou instituições já existentes.</strong>
        </p>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li><strong>Legislação Ambiental Brasileira:</strong> Aderência às leis e políticas que regem a conservação e o mercado de carbono.</li>
          <li><strong>Leis de Proteção de Dados:</strong> Total conformidade com a LGPD e GDPR.</li>
          <li><strong>AML/CFT:</strong> Políticas para mitigar riscos de lavagem de dinheiro e financiamento ao terrorismo.</li>
          <li><strong>Mercado de Capitais:</strong> Monitoramento contínuo das regulamentações de ativos digitais.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">7. Padrões de Qualidade e Governança Interna</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-white font-bold mb-2">Secure by Design</h4>
            <p className="text-sm text-gray-500">Segurança incorporada em todas as fases do desenvolvimento.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-white font-bold mb-2">Testes Rigorosos</h4>
            <p className="text-sm text-gray-500">Testes unitários, de integração e de segurança contínuos.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-white font-bold mb-2">Revisão por Pares</h4>
            <p className="text-sm text-gray-500">Todo código é revisado antes do deploy.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-white font-bold mb-2">Gestão de Riscos</h4>
            <p className="text-sm text-gray-500">Identificação proativa de riscos operacionais e regulatórios.</p>
          </div>
        </div>
      </section>
    </LegalPage>
  );
}
