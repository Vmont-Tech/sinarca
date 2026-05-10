import {
    Home,
    Lock,
    Globe,
    Users,
    Database,
    Search,
    Copy,
    Key,
    FileText,
    AlertTriangle,
    Terminal,
    ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ApiDocs() {
    const navigate = useNavigate();
    return (
        <div className="bg-[#0f1210] text-white font-sans antialiased selection:bg-sinarca-neon selection:text-[#0f1210] overflow-x-hidden min-h-screen">
            {/* Sticky Header / Quick Nav */}
            <header className="sticky top-0 z-50 w-full border-b border-[#2a3928] bg-[#121811]/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="size-8 text-sinarca-neon">
                            <svg className="h-full w-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="font-serif text-xl font-bold tracking-tight text-white">SINARCA <span className="text-xs font-sans font-normal text-[#a0ba9c] opacity-60">API DOCS</span></h2>
                    </div>
                    {/* Quick Icon Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a className="group flex flex-col items-center gap-1 text-[#a0ba9c] hover:text-sinarca-neon transition-colors" href="#intro" title="Início">
                            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                        <a className="group flex flex-col items-center gap-1 text-[#a0ba9c] hover:text-sinarca-neon transition-colors" href="#authentication" title="Autenticação">
                            <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                        <a className="group flex flex-col items-center gap-1 text-[#a0ba9c] hover:text-sinarca-neon transition-colors" href="#public-consultation" title="Consulta Pública">
                            <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                        <a className="group flex flex-col items-center gap-1 text-[#a0ba9c] hover:text-sinarca-neon transition-colors" href="#management" title="Gerenciamento">
                            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                        <a className="group flex flex-col items-center gap-1 text-[#a0ba9c] hover:text-sinarca-neon transition-colors" href="#schemas" title="Modelos de Dados">
                            <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                    </nav>
                    {/* Search & Actions */}
                    <div className="flex items-center gap-4">
                        <div className="relative hidden sm:block">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#a0ba9c]">
                                <Search className="w-4 h-4" />
                            </span>
                            <input className="h-9 w-48 rounded-full border-none bg-[#1a2e1a] py-1 pl-10 pr-4 text-sm text-white placeholder-[#a0ba9c] focus:ring-1 focus:ring-sinarca-neon transition-all" placeholder="Buscar endpoint..." type="text" />
                        </div>
                        <button 
                            onClick={() => navigate('/login')}
                            className="h-9 rounded-full bg-sinarca-neon px-4 text-sm font-bold text-[#0f1210] hover:bg-white transition-colors"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-[960px] px-6 py-12">
                {/* Hero Section */}
                <section className="mb-20 scroll-mt-24" id="intro">
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2a3928] bg-[#1a2e1a] px-3 py-1">
                                <span className="block h-2 w-2 animate-pulse rounded-full bg-sinarca-neon"></span>
                                <span className="text-xs font-medium text-sinarca-neon">v1.0.4 Stable</span>
                            </div>
                            <h1 className="font-serif text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
                                API <span className="text-transparent bg-clip-text bg-gradient-to-r from-sinarca-neon to-emerald-600">SINARCA</span>
                            </h1>
                            <p className="max-w-2xl text-lg text-[#a0ba9c]">
                                Interface oficial para rastreabilidade de créditos de carbono e ativos ambientais.
                                Integre sua plataforma diretamente ao Sistema Nacional para consultas em tempo real e auditoria de transações.
                            </p>
                        </div>
                        {/* Base URL Card */}
                        <div className="mt-4 rounded-xl border border-[#2a3928] bg-[#1a2e1a] p-6 shadow-2xl">
                            <label className="mb-2 block text-sm font-medium text-[#a0ba9c]">Base URL</label>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-1 items-center rounded-lg bg-[#0f1210] px-4 py-3 font-mono text-sm text-white border border-[#2a3928]">
                                    <span className="text-sinarca-neon mr-1">https://</span>api.sinarca.com.br/v1
                                </div>
                                <button className="flex h-11 items-center gap-2 rounded-lg bg-[#2a3928] px-5 text-sm font-bold text-white hover:bg-sinarca-neon hover:text-[#0f1210] transition-all group" onClick={() => navigator.clipboard.writeText('https://api.sinarca.com.br/v1')}>
                                    <Copy className="w-4 h-4" />
                                    <span className="hidden sm:inline">Copiar</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button className="flex items-center gap-2 rounded-lg bg-sinarca-neon px-6 py-3 text-sm font-bold text-[#0f1210] hover:bg-white transition-colors">
                                <Key className="w-5 h-5" />
                                Obter Chave de API
                            </button>
                            <button className="flex items-center gap-2 rounded-lg border border-[#2a3928] bg-transparent px-6 py-3 text-sm font-bold text-white hover:border-sinarca-neon hover:text-sinarca-neon transition-colors">
                                <FileText className="w-5 h-5" />
                                Documentação PDF
                            </button>
                        </div>
                    </div>
                </section>
                {/* Authentication Section */}
                <section className="mb-20 scroll-mt-24 border-t border-dashed border-[#2a3928] pt-12" id="authentication">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a2e1a] text-sinarca-neon border border-[#2a3928]">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold text-white">Autenticação</h2>
                    </div>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="space-y-4 text-[#a0ba9c]">
                            <p>
                                A API SINARCA utiliza o padrão <strong className="text-white">Bearer Token</strong> para autenticação.
                                Todas as requisições devem incluir o cabeçalho <code className="rounded bg-[#1a2e1a] px-1.5 py-0.5 font-mono text-sm text-sinarca-neon">Authorization</code>.
                            </p>
                            <p>
                                Tokens expiram a cada 24 horas. Para obter um novo token, utilize o endpoint <a className="text-sinarca-neon hover:underline" href="#">/auth/login</a> com suas credenciais de parceiro.
                            </p>
                            <div className="mt-4 rounded-lg border border-yellow-900/30 bg-yellow-900/10 p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="text-yellow-500 w-5 h-5" />
                                    <p className="text-sm text-yellow-200">Não compartilhe sua chave privada em repositórios públicos ou no lado do cliente (frontend).</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-[#2a3928] bg-[#0f1210] overflow-hidden">
                            <div className="flex items-center justify-between bg-[#1a2e1a] px-4 py-2 border-b border-[#2a3928]">
                                <span className="text-xs font-bold text-[#a0ba9c]">BASH</span>
                                <Copy className="cursor-pointer text-[#a0ba9c] hover:text-white w-4 h-4" />
                            </div>
                            <div className="p-4 font-mono text-sm leading-relaxed overflow-x-auto">
                                <span className="text-purple-400">curl</span> <span className="text-[#a0ba9c]">-X GET</span> \<br />
                                <span className="text-sinarca-neon">"https://api.sinarca.com.br/v1/projects"</span> \<br />
                                <span className="text-[#a0ba9c]">-H</span> <span className="text-orange-300">"Authorization: Bearer <span className="text-white opacity-50">YOUR_API_KEY</span>"</span> \<br />
                                <span className="text-[#a0ba9c]">-H</span> <span className="text-orange-300">"Content-Type: application/json"</span>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Endpoint Group: Public Consultation */}
                <section className="mb-20 scroll-mt-24 border-t border-dashed border-[#2a3928] pt-12" id="public-consultation">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a2e1a] text-sinarca-neon border border-[#2a3928]">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-serif text-3xl font-bold text-white">Consulta Pública</h2>
                                <p className="text-sm text-[#a0ba9c]">Endpoints acessíveis para validação de transparência.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {/* Endpoint Card: GET /projects */}
                        <details className="group rounded-xl border border-[#2a3928] bg-[#1a2e1a] overflow-hidden transition-all duration-300 open:ring-1 open:ring-sinarca-neon/50 open:bg-[#152315]">
                            <summary className="flex cursor-pointer list-none items-center justify-between p-4 hover:bg-[#233b22] transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className="flex h-7 min-w-[60px] items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20 px-2 text-xs font-bold text-blue-400">GET</span>
                                    <code className="font-mono text-sm text-white truncate">/projects</code>
                                    <span className="hidden md:inline-block text-sm text-[#a0ba9c] truncate">- Listar projetos certificados</span>
                                </div>
                                <ChevronDown className="text-[#a0ba9c] transition-transform group-open:rotate-180 w-5 h-5" />
                            </summary>
                            <div className="border-t border-[#2a3928] px-4 py-6 md:px-6">
                                <p className="mb-6 text-sm text-[#a0ba9c]">Retorna uma lista paginada de todos os projetos ambientais que possuem certificação ativa no SINARCA. Resultados podem ser filtrados por região e bioma.</p>
                                {/* Parameters */}
                                <div className="mb-6">
                                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Parâmetros de Query</h4>
                                    <div className="overflow-hidden rounded-lg border border-[#2a3928]">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-[#0f1210] text-[#a0ba9c]">
                                                <tr>
                                                    <th className="px-4 py-2 font-medium">Nome</th>
                                                    <th className="px-4 py-2 font-medium">Tipo</th>
                                                    <th className="px-4 py-2 font-medium">Descrição</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#2a3928] bg-[#1a2e1a]/50">
                                                <tr>
                                                    <td className="px-4 py-3 font-mono text-sinarca-neon">page</td>
                                                    <td className="px-4 py-3 text-[#a0ba9c]">integer</td>
                                                    <td className="px-4 py-3 text-white">Número da página (Padrão: 1)</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-3 font-mono text-sinarca-neon">bioma</td>
                                                    <td className="px-4 py-3 text-[#a0ba9c]">string</td>
                                                    <td className="px-4 py-3 text-white">Filtro por bioma (ex: 'amazonia', 'cerrado')</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {/* Response Preview */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white flex justify-between">
                                            Exemplo de Resposta
                                            <span className="text-sinarca-neon font-mono text-[10px] border border-sinarca-neon/30 bg-sinarca-neon/10 px-1 rounded">200 OK</span>
                                        </h4>
                                        <div className="rounded-lg border border-[#2a3928] bg-[#0f1210] p-4 font-mono text-xs overflow-x-auto">
                                            <pre>
                                                {`{
  "data": [
    {
      "id": "prj_839210",
      "name": "Reflorestamento Alto Xingu",
      "bioma": "Amazonia",
      "status": "active",
      "credits_issued": 50000
    }
  ],
  "meta": {
    "total": 142,
    "page": 1
  }
}`}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white">Testar Endpoint</h4>
                                        <div className="flex-1 rounded-lg border border-[#2a3928] bg-[#1a2e1a]/50 p-4 flex flex-col items-center justify-center text-center gap-3">
                                            <Terminal className="text-4xl text-[#2a3928] w-10 h-10" />
                                            <p className="text-sm text-[#a0ba9c]">Autentique-se para testar este endpoint em tempo real.</p>
                                            <button className="mt-2 text-xs font-bold text-sinarca-neon hover:underline">Ir para Login</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                        {/* Endpoint Card: GET /credits/{id} */}
                        <details className="group rounded-xl border border-[#2a3928] bg-[#1a2e1a] overflow-hidden transition-all duration-300 open:ring-1 open:ring-sinarca-neon/50 open:bg-[#152315]">
                            <summary className="flex cursor-pointer list-none items-center justify-between p-4 hover:bg-[#233b22] transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className="flex h-7 min-w-[60px] items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20 px-2 text-xs font-bold text-blue-400">GET</span>
                                    <code className="font-mono text-sm text-white truncate">/credits/{`{id}`}</code>
                                    <span className="hidden md:inline-block text-sm text-[#a0ba9c] truncate">- Consultar status do crédito</span>
                                </div>
                                <ChevronDown className="text-[#a0ba9c] transition-transform group-open:rotate-180 w-5 h-5" />
                            </summary>
                            <div className="border-t border-[#2a3928] px-4 py-6 md:px-6">
                                <p className="mb-6 text-sm text-[#a0ba9c]">Retorna detalhes completos de um lote de créditos específico, incluindo histórico de custódia.</p>
                                {/* Content omitted for brevity, would follow same structure */}
                                <div className="rounded-lg border border-[#2a3928] bg-[#0f1210] p-4 font-mono text-xs overflow-x-auto">
                                    <pre>
                                        {`{
  "id": "crd_999222",
  "owner": "EcoCorp SA",
  "vintage_year": 2023,
  "retired": false
}`}
                                    </pre>
                                </div>
                            </div>
                        </details>
                    </div>
                </section>
                {/* Endpoint Group: Management */}
                <section className="mb-20 scroll-mt-24 border-t border-dashed border-[#2a3928] pt-12" id="management">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a2e1a] text-sinarca-neon border border-[#2a3928]">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-serif text-3xl font-bold text-white">Gerenciamento</h2>
                                <p className="text-sm text-[#a0ba9c]">Ações de escrita para proprietários de créditos.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {/* Endpoint Card: POST /transfer */}
                        <details className="group rounded-xl border border-[#2a3928] bg-[#1a2e1a] overflow-hidden transition-all duration-300 open:ring-1 open:ring-sinarca-neon/50 open:bg-[#152315]">
                            <summary className="flex cursor-pointer list-none items-center justify-between p-4 hover:bg-[#233b22] transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className="flex h-7 min-w-[60px] items-center justify-center rounded-md bg-green-500/10 border border-green-500/20 px-2 text-xs font-bold text-green-400">POST</span>
                                    <code className="font-mono text-sm text-white truncate">/credits/transfer</code>
                                    <span className="hidden md:inline-block text-sm text-[#a0ba9c] truncate">- Transferir titularidade</span>
                                </div>
                                <ChevronDown className="text-[#a0ba9c] transition-transform group-open:rotate-180 w-5 h-5" />
                            </summary>
                            <div className="border-t border-[#2a3928] px-4 py-6 md:px-6">
                                <p className="mb-6 text-sm text-[#a0ba9c]">Inicia o processo de transferência de custódia de um lote de créditos para outro CNPJ registrado no SINARCA.</p>
                                <div className="grid gap-8 md:grid-cols-2">
                                    {/* Body Params */}
                                    <div>
                                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Body (JSON)</h4>
                                        <div className="rounded-lg border border-[#2a3928] bg-[#0f1210] p-4 font-mono text-xs overflow-x-auto h-full">
                                            <pre>
                                                {`{
  "credit_id": "crd_555112",
  "recipient_cnpj": "12.345.678/0001-90",
  "amount": 1000,
  "memo": "Venda contrato #4421"
}`}
                                            </pre>
                                        </div>
                                    </div>
                                    {/* Responses */}
                                    <div>
                                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Respostas Possíveis</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between rounded bg-[#1a2e1a]/50 p-2 border border-[#2a3928]">
                                                <span className="text-xs font-mono text-sinarca-neon">201 Created</span>
                                                <span className="text-xs text-[#a0ba9c]">Transferência iniciada</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded bg-[#1a2e1a]/50 p-2 border border-[#2a3928]">
                                                <span className="text-xs font-mono text-orange-400">400 Bad Request</span>
                                                <span className="text-xs text-[#a0ba9c]">Dados inválidos</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded bg-[#1a2e1a]/50 p-2 border border-[#2a3928]">
                                                <span className="text-xs font-mono text-red-400">403 Forbidden</span>
                                                <span className="text-xs text-[#a0ba9c]">Sem permissão</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                        {/* Endpoint Card: POST /audit/log */}
                        <details className="group rounded-xl border border-[#2a3928] bg-[#1a2e1a] overflow-hidden transition-all duration-300 open:ring-1 open:ring-sinarca-neon/50 open:bg-[#152315]">
                            <summary className="flex cursor-pointer list-none items-center justify-between p-4 hover:bg-[#233b22] transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <span className="flex h-7 min-w-[60px] items-center justify-center rounded-md bg-green-500/10 border border-green-500/20 px-2 text-xs font-bold text-green-400">POST</span>
                                    <code className="font-mono text-sm text-white truncate">/audit/log</code>
                                    <span className="hidden md:inline-block text-sm text-[#a0ba9c] truncate">- Registrar log de auditoria</span>
                                </div>
                                <ChevronDown className="text-[#a0ba9c] transition-transform group-open:rotate-180 w-5 h-5" />
                            </summary>
                            <div className="border-t border-[#2a3928] px-4 py-6 md:px-6">
                                <p className="mb-4 text-sm text-[#a0ba9c]">Enviar registros de auditoria externa para a blockchain do SINARCA.</p>
                                <div className="rounded-lg border border-[#2a3928] bg-[#0f1210] p-4 font-mono text-xs overflow-x-auto">
                                    <pre>
                                        {`{
  "event_type": "field_verification",
  "auditor_id": "aud_8821",
  "timestamp": "2023-10-25T14:30:00Z"
}`}
                                    </pre>
                                </div>
                            </div>
                        </details>
                    </div>
                </section>
                {/* Schemas / Data Models */}
                <section className="mb-20 scroll-mt-24 border-t border-dashed border-[#2a3928] pt-12" id="schemas">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a2e1a] text-sinarca-neon border border-[#2a3928]">
                            <Database className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold text-white">Modelos de Dados</h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Schema Card 1 */}
                        <div className="flex flex-col rounded-xl border border-[#2a3928] bg-[#1a2e1a] p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-mono font-bold text-white">ProjectMetadata</h3>
                                <span className="text-[10px] uppercase tracking-wider text-[#a0ba9c]">Object</span>
                            </div>
                            <ul className="flex-1 space-y-2 text-sm">
                                <li className="flex items-baseline justify-between border-b border-[#2a3928] pb-1">
                                    <span className="font-mono text-sinarca-neon text-xs">id</span>
                                    <span className="text-xs text-[#a0ba9c]">string (uuid)</span>
                                </li>
                                <li className="flex items-baseline justify-between border-b border-[#2a3928] pb-1">
                                    <span className="font-mono text-sinarca-neon text-xs">name</span>
                                    <span className="text-xs text-[#a0ba9c]">string</span>
                                </li>
                                <li className="flex items-baseline justify-between border-b border-[#2a3928] pb-1">
                                    <span className="font-mono text-sinarca-neon text-xs">geo_coordinates</span>
                                    <span className="text-xs text-[#a0ba9c]">array[float]</span>
                                </li>
                                <li className="flex items-baseline justify-between pt-1">
                                    <span className="font-mono text-sinarca-neon text-xs">certification_date</span>
                                    <span className="text-xs text-[#a0ba9c]">date-time</span>
                                </li>
                            </ul>
                        </div>
                        {/* Schema Card 2 */}
                        <div className="flex flex-col rounded-xl border border-[#2a3928] bg-[#1a2e1a] p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-mono font-bold text-white">CreditTransaction</h3>
                                <span className="text-[10px] uppercase tracking-wider text-[#a0ba9c]">Object</span>
                            </div>
                            <ul className="flex-1 space-y-2 text-sm">
                                <li className="flex items-baseline justify-between border-b border-[#2a3928] pb-1">
                                    <span className="font-mono text-sinarca-neon text-xs">tx_hash</span>
                                    <span className="text-xs text-[#a0ba9c]">string (hex)</span>
                                </li>
                                <li className="flex items-baseline justify-between border-b border-[#2a3928] pb-1">
                                    <span className="font-mono text-sinarca-neon text-xs">sender</span>
                                    <span className="text-xs text-[#a0ba9c]">string (cnpj)</span>
                                </li>
                                <li className="flex items-baseline justify-between border-b border-[#2a3928] pb-1">
                                    <span className="font-mono text-sinarca-neon text-xs">receiver</span>
                                    <span className="text-xs text-[#a0ba9c]">string (cnpj)</span>
                                </li>
                                <li className="flex items-baseline justify-between pt-1">
                                    <span className="font-mono text-sinarca-neon text-xs">amount</span>
                                    <span className="text-xs text-[#a0ba9c]">integer</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
                {/* Footer */}
                <footer className="mt-20 border-t border-[#2a3928] py-10 text-center">
                    <div className="flex justify-center gap-6 mb-6">
                        <a className="text-[#a0ba9c] hover:text-sinarca-neon transition-colors text-sm" href="#">Termos de Uso</a>
                        <a className="text-[#a0ba9c] hover:text-sinarca-neon transition-colors text-sm" href="#">Suporte</a>
                        <a className="text-[#a0ba9c] hover:text-sinarca-neon transition-colors text-sm" href="#">Status do Sistema</a>
                    </div>
                    <p className="text-xs text-[#a0ba9c]/60">
                        SINARCA - Sistema Nacional de Rastreabilidade de Créditos Ambientais. Todos os direitos reservados.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <div className="h-1 w-12 rounded-full bg-[#2a3928]"></div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
