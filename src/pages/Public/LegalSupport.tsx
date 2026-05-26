import { LegalPage } from '../../components/legal/LegalPage';
import { PUBLIC_SUPPORT_EMAIL } from '../../constants/publicContact';

export default function LegalSupport() {
  return (
    <LegalPage 
      title="Suporte Jurídico" 
      subtitle="SISTEMA NACIONAL DE RASTREABILIDADE DE CRÉDITOS AMBIENTAIS"
      lastUpdated="Maio de 2026"
    >
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">1. Introdução</h2>
        <p>
          O SINARCA, como uma plataforma tecnológica inovadora no mercado de créditos ambientais, opera dentro de um complexo arcabouço legal e regulatório. 
          <strong> É fundamental destacar que o SINARCA atua como uma camada de segurança extra e complementar, sem substituir as metodologias de validação e mensuração de créditos já existentes no mercado ou confrontar regulamentações e instituições estabelecidas.</strong> 
          Este documento visa esclarecer o escopo do suporte jurídico oferecido pela plataforma e as responsabilidades dos usuários, garantindo a conformidade com as leis nacionais e internacionais. 
          O SINARCA não atua como consultoria jurídica, mas como um facilitador tecnológico que adere e auxilia na conformidade com as normas vigentes.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">2. Natureza do Suporte Jurídico do SINARCA</h2>
        <p>O SINARCA oferece um <strong>framework tecnológico</strong> que suporta a conformidade jurídica, manifestado através de:</p>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Conformidade da Plataforma:</strong> Manutenção em estrita conformidade com LGPD, GDPR e leis de tecnologias blockchain.</li>
          <li><strong>Documentação Legal Clara:</strong> Fornecimento de Termos e Políticas abrangentes.</li>
          <li><strong>Mecanismos de Auditoria:</strong> Rastreabilidade física (NFC), IA/Satélite e Blockchain para facilitar auditorias externas.</li>
          <li><strong>Resolução de Disputas:</strong> Mecanismos claros para resolução de conflitos relacionados ao uso da plataforma.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">3. Responsabilidades Legais dos Usuários</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-3">3.1. Produtores e Certificadoras</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-400">
              <li><strong>Veracidade:</strong> Responsabilidade legal pela exatidão de dados de área e metodologias.</li>
              <li><strong>Conformidade Ambiental:</strong> Garantia de aderência à legislação brasileira e local.</li>
              <li><strong>Certificação:</strong> Deve ser feita por entidades credenciadas (Verra, Gold Standard). O SINARCA complementa o processo.</li>
              <li><strong>Manutenção QTAGs:</strong> Correta instalação e manutenção física das tags NFC.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary mb-3">3.2. Auditores</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-400">
              <li><strong>Diligência:</strong> Condução de auditorias com imparcialidade e expertise técnica.</li>
              <li><strong>Veracidade dos Laudos:</strong> Responsabilidade pela integridade das informações coletadas em campo.</li>
              <li><strong>Autenticação:</strong> Uso obrigatório de biometria e geolocalização.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary mb-3">3.3. Compradores</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-400">
              <li><strong>Due Diligence:</strong> Avaliação própria antes da compra. O SINARCA fornece as ferramentas necessárias.</li>
              <li><strong>Conformidade Interna:</strong> Alinhamento com políticas de sustentabilidade corporativas.</li>
              <li><strong>Uso Ético:</strong> Prevenção de práticas de greenwashing na compensação de emissões.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">4. Aspectos Legais da Blockchain e Tokenização</h2>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Imutabilidade e Transparência:</strong> Registro irrefutável de transações em Ledger Distribuído (DLT), conferindo segurança jurídica.</li>
          <li><strong>Propriedade dos Tokens:</strong> Regida pelas chaves criptográficas e regras da rede Blockchain. O SINARCA facilita a emissão, não a custódia.</li>
          <li><strong>Smart Contracts:</strong> Execução autônoma e transparente das regras de negócio via contratos inteligentes.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">5. Prevenção a Fraudes e Greenwashing</h2>
        <p>O SINARCA utiliza tecnologias avançadas para complementar regulamentações existentes:</p>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li><strong>Existência Física:</strong> QTAGs e monitoramento geoespacial garantem lastro real.</li>
          <li><strong>Dupla Contagem:</strong> Tokenização e registro único impedem reuso de créditos.</li>
          <li><strong>Transparência Total:</strong> Rastreabilidade detalhada para verificação por compradores e reguladores.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">6. Canal de Suporte</h2>
        <p>
          Dúvidas sobre escopo jurídico, responsabilidades de usuário e documentação legal podem ser encaminhadas para <a className="text-primary font-bold hover:underline" href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}>{PUBLIC_SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
