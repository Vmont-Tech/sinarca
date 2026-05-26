import { LegalPage } from '../../components/legal/LegalPage';
import { PUBLIC_DPO_EMAIL } from '../../constants/publicContact';

export default function DataGovernance() {
  return (
    <LegalPage 
      title="Governança de Dados" 
      subtitle="SISTEMA NACIONAL DE RASTREABILIDADE DE CRÉDITOS AMBIENTAIS"
      lastUpdated="Maio de 2026"
    >
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">1. Introdução</h2>
        <p>
          No SINARCA, a operação de dados é um pilar fundamental para garantir a integridade, a transparência e a segurança do mercado de créditos ambientais. 
          <strong> É importante ressaltar que a operação de dados do SINARCA é projetada para atuar como uma camada de segurança extra e complementar, sem substituir as metodologias de validação e mensuração de créditos já existentes no mercado.</strong> 
          Este documento detalha as políticas e práticas que regem a coleta, processamento, armazenamento e uso dos dados, em conformidade com as leis vigentes.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">2. Princípios de Governança de Dados</h2>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Legalidade, Finalidade e Transparência:</strong> Dados coletados para propósitos legítimos e transparentes (LGPD/GDPR).</li>
          <li><strong>Minimização:</strong> Coleta exclusiva do estritamente necessário.</li>
          <li><strong>Qualidade:</strong> Esforços contínuos para precisão e atualização.</li>
          <li><strong>Segurança:</strong> Proteção robusta contra acesso não autorizado ou destruição.</li>
          <li><strong>Responsabilização:</strong> Demonstração ativa de conformidade legal.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">3. Tipos de Dados Coletados</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-3">3.1. Dados de Identificação e Cadastro</h3>
            <p className="text-gray-400">Nome completo, CPF/CNPJ, e-mail, telefone e registro profissional de todos os participantes do ecossistema.</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary mb-3">3.2. Dados Geoespaciais e de Monitoramento</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li><strong>Coordenadas NFC:</strong> Latitude/Longitude coletadas pelas tags físicas.</li>
              <li><strong>Geofencing:</strong> Delimitação digital das áreas de projeto.</li>
              <li><strong>Imagens de Satélite:</strong> Dados do Sentinel-2 (Copernicus).</li>
              <li><strong>Hashes de Área:</strong> Identificadores de estado ambiental gerados por IA.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary mb-3">3.3. Dados de Transação e Blockchain</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li><strong>Informações de Créditos:</strong> Quantidade, unidade (tCO2e) e status.</li>
              <li><strong>Infraestrutura Blockchain:</strong> Hashes de transação e endereços de carteira (públicos).</li>
              <li><strong>Marketplace:</strong> Histórico completo de negociações.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">4. Como os Dados são Utilizados</h2>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li><strong>Gestão de Projetos:</strong> Cadastro e demarcação de áreas.</li>
          <li><strong>Monitoramento:</strong> Detecção de desmatamento ou queimadas via satélite.</li>
          <li><strong>Validação:</strong> Autenticação de tags NFC e biometria de auditores.</li>
          <li><strong>Tokenização:</strong> Rastreabilidade de titularidade em Ledger Distribuído (Blockchain).</li>
          <li><strong>Compliance:</strong> Mecanismos de verificação independente e prevenção a fraudes.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">5. Segurança dos Dados</h2>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Criptografia Pós-Quântica:</strong> Proteção NIST PQC-2024 para dados em trânsito e repouso.</li>
          <li><strong>Controle de Acesso:</strong> Princípio do privilégio mínimo e MFA.</li>
          <li><strong>Auditorias:</strong> Pentests e varreduras de vulnerabilidade regulares.</li>
          <li><strong>HSM:</strong> Armazenamento seguro de chaves criptográficas.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">6. Retenção e Direitos</h2>
        <p>
          Retemos dados pelo tempo necessário para obrigações legais. Titulares possuem direitos de acesso, retificação, exclusão (salvo registros blockchain imutáveis), portabilidade e oposição, conforme garantido pela LGPD e GDPR.
        </p>
        <p className="text-sm bg-primary/5 p-4 rounded-xl border border-primary/10 text-gray-400">
          O canal provisório para solicitações de dados e DPO é <a className="text-primary font-bold hover:underline" href={`mailto:${PUBLIC_DPO_EMAIL}`}>{PUBLIC_DPO_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
