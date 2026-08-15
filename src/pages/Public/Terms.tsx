import { LegalPage } from '../../components/legal/LegalPage';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_SUPPORT_EMAIL } from '../../constants/publicContact';

export default function Terms() {
  return (
    <LegalPage 
      title="Termos de Uso" 
      subtitle="SISTEMA NACIONAL DE RASTREABILIDADE DE CRÉDITOS AMBIENTAIS"
      lastUpdated="Maio de 2026"
    >
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">1. Introdução</h2>
        <p>
          Bem-vindo ao SINARCA – Sistema Nacional de Rastreabilidade de Créditos Ambientais. Estes Termos de Uso ("Termos") regem o acesso e a utilização da plataforma SINARCA, incluindo seu website, aplicativos móveis e todos os serviços relacionados (coletivamente, a "Plataforma"). Ao acessar ou utilizar a Plataforma, você concorda em cumprir e estar vinculado a estes Termos. Se você não concordar com estes Termos, não utilize a Plataforma.
        </p>
        <p>
          O SINARCA é uma infraestrutura tecnológica que conecta produtores, certificadoras, auditores, empresas e cidadãos para garantir a rastreabilidade e a transparência dos créditos ambientais. 
          <strong> É fundamental ressaltar que o SINARCA atua como uma camada de segurança extra e complementar, sem substituir as metodologias de validação e mensuração de créditos já existentes no mercado ou confrontar regulamentações e instituições estabelecidas.</strong> 
          Não certificamos, não produzimos e não auditamos créditos ambientais. Fornecemos ferramentas e tecnologia para verificar a integridade e a autenticidade dos créditos, 
          <strong> atuando estritamente no mercado de créditos voluntários e como um parceiro indispensável para a comercialização segura desses créditos.</strong>
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">2. Definições</h2>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li><strong>Plataforma:</strong> Refere-se ao website, aplicativos móveis e todos os serviços oferecidos pelo SINARCA.</li>
          <li><strong>Usuário:</strong> Qualquer pessoa física ou jurídica que acessa ou utiliza a Plataforma, incluindo Produtores, Certificadoras, Auditores, Compradores (Empresas/Cidadãos) e Administradores.</li>
          <li><strong>Crédito Ambiental:</strong> Ativo digital (token) emitido em Ledger Distribuído (Blockchain), representando uma unidade de crédito de carbono ou outro benefício ambiental, cuja origem física é rastreada pelo SINARCA.</li>
          <li><strong>QTAGs:</strong> Tags NFC 424 DNA utilizadas para demarcar e autenticar fisicamente as áreas de projeto.</li>
          <li><strong>Infraestrutura Blockchain:</strong> Rede descentralizada utilizada para a tokenização e registro imutável dos Créditos Ambientais.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">3. Elegibilidade e Cadastro</h2>
        <p>
          Para utilizar a Plataforma, você deve ter capacidade legal para celebrar contratos vinculativos. Ao se cadastrar, você concorda em fornecer informações precisas, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">4. Serviços Oferecidos pelo SINARCA</h2>
        <p>A Plataforma SINARCA oferece, entre outros, os seguintes serviços:</p>
        <ul className="list-disc pl-6 space-y-3 text-gray-400">
          <li><strong>Registro e Monitoramento de Projetos:</strong> Ferramentas para certificadoras e produtores registrarem projetos, demarcarem áreas com QTAGs e acompanharem o monitoramento via satélite e IA.</li>
          <li><strong>Marketplace de Créditos Ambientais:</strong> Um ambiente para empresas e cidadãos comprarem e venderem Créditos Ambientais tokenizados.</li>
          <li><strong>Rastreabilidade e Transparência:</strong> Acesso a informações sobre a origem, o status e o histórico de transações dos Créditos Ambientais, registrados em Ledger Distribuído.</li>
          <li><strong>Ferramentas de Auditoria:</strong> Aplicativos e interfaces para auditores realizarem inspeções em campo, com autenticação biométrica e geolocalizada.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">5. Responsabilidades do Usuário</h2>
        <p>Ao utilizar a Plataforma, você concorda em:</p>
        <ul className="list-disc pl-6 space-y-4 text-gray-400">
          <li>Cumprir todas as leis e regulamentações aplicáveis, incluindo leis ambientais, de proteção de dados (LGPD) e financeiras.</li>
          <li>Não utilizar a Plataforma para fins ilegais, fraudulentos ou não autorizados.</li>
          <li>Não tentar interferir na segurança ou na integridade da Plataforma.</li>
          <li>Fornecer informações verdadeiras e precisas em todas as interações com a Plataforma.</li>
          <li><strong>Produtores e Certificadoras:</strong> São responsáveis pela veracidade das informações dos projetos, pela instalação correta das QTAGs e pela conformidade com as metodologias de certificação.</li>
          <li><strong>Auditores:</strong> São responsáveis pela realização diligente das auditorias em campo e pela precisão dos laudos, utilizando a autenticação biométrica e geolocalizada conforme exigido.</li>
          <li><strong>Compradores:</strong> São responsáveis por sua própria diligência na avaliação dos Créditos Ambientais antes da compra e por compreender os riscos associados à posse de ativos digitais.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">6. Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo da Plataforma, incluindo textos, gráficos, logotipos, ícones, imagens, software e a tecnologia subjacente, é propriedade do SINARCA ou de seus licenciadores e é protegido por leis de propriedade intelectual. Você não pode reproduzir, distribuir, modificar, criar obras derivadas, exibir publicamente, executar publicamente, republicar, baixar, armazenar ou transmitir qualquer material da Plataforma, exceto conforme expressamente permitido por estes Termos.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">7. Limitação de Responsabilidade</h2>
        <p>
          O SINARCA atua como uma plataforma tecnológica, <strong>fornecendo uma camada de segurança extra e complementar para a rastreabilidade e comercialização de créditos ambientais.</strong> 
          Não somos responsáveis pela certificação, produção ou auditoria dos créditos ambientais, que permanecem sob a responsabilidade das entidades certificadoras e auditoras. A Plataforma é fornecida "como está" e "conforme disponível", sem garantias de qualquer tipo, 
          <strong> e sua utilização não exime os usuários de suas responsabilidades legais e contratuais perante as metodologias e instituições existentes.</strong>
        </p>
        <p>Em nenhuma circunstância o SINARCA será responsável por perdas de lucros, dados ou danos indiretos resultantes do acesso ou uso da Plataforma.</p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">8. Indenização</h2>
        <p>
          Você concorda em defender, indenizar e isentar o SINARCA de quaisquer reivindicações, responsabilidades, danos ou despesas decorrentes da sua violação destes Termos ou do seu uso inadequado da Plataforma.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">9. Resolução de Disputas</h2>
        <p>
          Quaisquer disputas serão regidas pelas leis da República Federativa do Brasil. A resolução observará o foro competente definido pela legislação aplicável e pelos instrumentos contratuais vigentes.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">10. Contato</h2>
        <p>
          Para dúvidas gerais sobre estes Termos de Uso, use <a className="text-primary font-bold hover:underline" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>. Para suporte jurídico relacionado à plataforma, use <a className="text-primary font-bold hover:underline" href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}>{PUBLIC_SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
