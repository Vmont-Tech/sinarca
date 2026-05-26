import { LegalPage } from '../../components/legal/LegalPage';
import { PUBLIC_DPO_EMAIL } from '../../constants/publicContact';

export default function Privacy() {
  return (
    <LegalPage 
      title="Política de Privacidade" 
      subtitle="SISTEMA NACIONAL DE RASTREABILIDADE DE CRÉDITOS AMBIENTAIS"
      lastUpdated="Maio de 2026"
    >
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">1. Introdução</h2>
        <p>
          Esta Política de Privacidade descreve como o SINARCA coleta, usa, armazena, compartilha e protege as informações pessoais de seus usuários. Nosso compromisso é com a transparência e a segurança dos seus dados, em conformidade com a Lei Geral de Proteção de Dados (LGPD) no Brasil e o General Data Protection Regulation (GDPR) na União Europeia. Ao utilizar a Plataforma SINARCA, você concorda com as práticas descritas nesta Política.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">2. Definições Importantes</h2>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Dados Pessoais:</strong> Informação relacionada a uma pessoa natural identificada ou identificável.</li>
          <li><strong>Titular dos Dados:</strong> A pessoa natural a quem se referem os dados pessoais.</li>
          <li><strong>Tratamento de Dados:</strong> Toda operação realizada com dados pessoais (coleta, armazenamento, acesso, etc).</li>
          <li><strong>Controlador:</strong> Pessoa a quem competem as decisões referentes ao tratamento de dados pessoais.</li>
          <li><strong>Encarregado de Dados (DPO):</strong> Canal de comunicação entre o controlador, titulares e a ANPD.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">3. Quais Dados Pessoais Coletamos?</h2>
        <p>Coletamos os seguintes tipos de dados pessoais, essenciais para a operação da Plataforma:</p>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Dados de Cadastro:</strong> Nome completo, CPF/CNPJ, e-mail, telefone, endereço físico e registro profissional.</li>
          <li><strong>Dados de Autenticação:</strong> Credenciais de login, hashes biométricos e geolocalização no momento da assinatura de laudos (auditores).</li>
          <li><strong>Dados de Uso:</strong> Páginas visitadas, funcionalidades utilizadas, tempo de sessão, endereço IP e tipo de dispositivo.</li>
          <li><strong>Dados de Transação:</strong> Histórico de compras e vendas de créditos ambientais, valores e datas das transações.</li>
        </ul>
        <p className="text-sm bg-white/5 p-4 rounded-xl border border-white/10 text-gray-500">
          <strong>Não coletamos dados pessoais sensíveis</strong> (origem racial, convicção religiosa, dados de saúde, etc) a menos que seja estritamente necessário para cumprir uma obrigação legal.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">4. Como Usamos Seus Dados Pessoais?</h2>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li><strong>Fornecer e Gerenciar a Plataforma:</strong> Operação do marketplace, registro de projetos e ferramentas de auditoria.</li>
          <li><strong>Autenticação e Segurança:</strong> Verificação de identidade e prevenção a fraudes (biometria e geolocalização).</li>
          <li><strong>Comunicação:</strong> Notificações sobre conta, projetos e atualizações de mercado.</li>
          <li><strong>Cumprimento Legal:</strong> Obrigações fiscais, LGPD e GDPR.</li>
          <li><strong>Melhoria Contínua:</strong> Análise de tendências e desenvolvimento de novas funcionalidades.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">5. Como Compartilhamos Seus Dados Pessoais?</h2>
        <p>O SINARCA compartilha seus dados pessoais apenas nas seguintes situações:</p>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li><strong>Prestadores de Serviços:</strong> Terceiros que auxiliam na operação (hospedagem, e-mail, pagamentos) sob sigilo contratual.</li>
          <li><strong>Autoridades Legais:</strong> Quando exigido por lei ou ordem judicial.</li>
          <li><strong>Outros Usuários:</strong> Informações públicas de projetos e transações no marketplace.</li>
          <li><strong>Ledger Distribuído (Blockchain):</strong> Transações registradas são inerentemente públicas, mas PII sensíveis são mantidas off-chain.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">6. Transferência Internacional de Dados</h2>
        <p>
          Seus dados podem ser processados em outros países seguindo mecanismos legais apropriados (cláusulas contratuais padrão) para assegurar o nível adequado de proteção exigido pela LGPD e GDPR.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">7. Seus Direitos como Titular dos Dados</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none text-sm">
          <li className="p-4 rounded-xl bg-white/5 border border-white/10 font-bold text-white">Direito de Acesso</li>
          <li className="p-4 rounded-xl bg-white/5 border border-white/10 font-bold text-white">Direito de Retificação</li>
          <li className="p-4 rounded-xl bg-white/5 border border-white/10 font-bold text-white">Direito de Exclusão</li>
          <li className="p-4 rounded-xl bg-white/5 border border-white/10 font-bold text-white">Direito à Portabilidade</li>
          <li className="p-4 rounded-xl bg-white/5 border border-white/10 font-bold text-white">Direito de Oposição</li>
          <li className="p-4 rounded-xl bg-white/5 border border-white/10 font-bold text-white">Direito de Revogar Consentimento</li>
        </ul>
        <p className="text-sm bg-primary/5 p-4 rounded-xl border border-primary/10 text-gray-400">
          Solicitações de acesso, retificação, portabilidade, oposição, exclusão ou revogação de consentimento devem ser encaminhadas para <a className="text-primary font-bold hover:underline" href={`mailto:${PUBLIC_DPO_EMAIL}`}>{PUBLIC_DPO_EMAIL}</a>.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">8. Segurança dos Dados</h2>
        <p>
          Empregamos medidas rigorosas: criptografia de ponta a ponta, controles de acesso por privilégio mínimo, monitoramento contínuo e <strong>criptografia pós-quântica (NIST PQC-2024)</strong>.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">9. Contato do DPO</h2>
        <p>
          O canal provisório do Encarregado de Dados do SINARCA é <a className="text-primary font-bold hover:underline" href={`mailto:${PUBLIC_DPO_EMAIL}`}>{PUBLIC_DPO_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
