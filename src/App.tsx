import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Dashboard/Overview';
import Auditors from './pages/Dashboard/Auditors';
import Transactions from './pages/Dashboard/Transactions'; // FEED ON-CHAIN
import Reports from './pages/Dashboard/Reports';
import MrcaDetails from './pages/Dashboard/MrcaDetails';
import AuditRegistration from './pages/Dashboard/AuditRegistration';
import RetireCredits from './pages/Dashboard/RetireCredits';
import ImpactLeaders from './pages/Dashboard/ImpactLeaders';
import GlobalMap from './pages/Dashboard/GlobalMap'; // PROJECT MAP
import NationalMap from './components/maps/NationalMap'; // IMPACT MAP (MOVED)
import AboutSinarca from './pages/Public/AboutSinarca';
import PublicMapPage from './pages/Public/PublicMapPage';
import ProjectNetwork from './pages/Dashboard/ProjectNetwork';
import ApiDocs from './pages/Dashboard/ApiDocs';
import PublicExplorer from './pages/Dashboard/PublicExplorer';
import TransactionDetails from './pages/Dashboard/TransactionDetails';
import AddProject from './pages/Dashboard/AddProject';

import PublicLayout from './layouts/PublicLayout';

import CertifierPanel from './pages/Dashboard/CertifierPanel';
import CertifierReview from './pages/Dashboard/CertifierReview';
import AuditorReview from './pages/Dashboard/AuditorReview';
import CreditMarketplace from './pages/Dashboard/CreditMarketplace';
import UserProfile from './pages/Dashboard/UserProfile';
import Calculator from './pages/Dashboard/Calculator';
import RegisterInventory from './pages/Dashboard/RegisterInventory';
import { Feed } from './pages/Dashboard/Feed'; // CONSULTA MRCA / EXPLORER
import MonitoringNDVI from './pages/Dashboard/MonitoringNDVI';
import RiskScoreMethodology from './pages/Dashboard/RiskScoreMethodology';

import CertifierProfile from './pages/Dashboard/CertifierProfile';
import AuditorProfile from './pages/Dashboard/AuditorProfile';
import CompanyProfile from './pages/Dashboard/CompanyProfile';

import Certifiers from './pages/Dashboard/Certifiers'; // NEW
import Companies from './pages/Dashboard/Companies';   // NEW
import Settings from './pages/Dashboard/Settings';     // NEW
import ImpactInventory from './pages/Dashboard/ImpactInventory'; // NEW

// Legal / Public Pages
import Compliance from './pages/Public/Compliance';
import Terms from './pages/Public/Terms';
import Privacy from './pages/Public/Privacy';
import LegalSupport from './pages/Public/LegalSupport';
import DataGovernance from './pages/Public/DataGovernance';
import CreditCycle from './pages/Public/CreditCycle';

import { AuthProvider } from './contexts/AuthContext';

import { ProtectedRoute } from './components/ProtectedRoute';

function LegacyPublicRedirect() {
  const location = useLocation();
  const cleanPath = location.pathname.replace(/^\/public\/?/, '/') || '/';
  return <Navigate to={`${cleanPath}${location.search}${location.hash}`} replace />;
}

function publicRoutes() {
  return (
    <>
      {/* Feed de Eventos On-Chain (Automático) e Transparência */}
      <Route path="feed" element={<PublicExplorer />} />
      <Route path="tx/:hash" element={<TransactionDetails />} />

      {/* Consulta e Transparência */}
      <Route path="consulta" element={<Feed />} />
      <Route path="projetos" element={<Feed />} />
      <Route path="projeto/:id" element={<MrcaDetails />} />
      <Route path="perfil/:id" element={<UserProfile />} />

      {/* Métricas e Rankings */}
      <Route path="rankings" element={<ImpactLeaders />} />
      <Route path="lideres" element={<ImpactLeaders />} />
      <Route path="auditores" element={<Auditors />} />
      <Route path="certificadoras" element={<Certifiers />} />
      <Route path="empresas" element={<Companies />} />
      <Route path="produtores" element={<Companies />} />

      {/* Institucional / Legal */}
      <Route path="sobre" element={<AboutSinarca />} />
      <Route path="api" element={<ApiDocs />} />
      <Route path="compliance" element={<Compliance />} />
      <Route path="termos" element={<Terms />} />
      <Route path="privacidade" element={<Privacy />} />
      <Route path="suporte-juridico" element={<LegalSupport />} />
      <Route path="dados" element={<DataGovernance />} />
      <Route path="ciclo-credito" element={<CreditCycle />} />

      {/* Mapas Dedicados */}
      <Route path="mapa-nacional" element={<NationalMap />} />
      <Route path="mapa-brasil" element={<PublicMapPage />} />
      <Route path="mapa-projetos" element={<GlobalMap />} />
      <Route path="mapa" element={<Navigate to="/mapa-nacional" replace />} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. PORTAL PÚBLICO (SINARCA) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route element={<PublicLayout />}>
            {publicRoutes()}
          </Route>
          <Route path="/public/*" element={<LegacyPublicRedirect />} />

          {/* 2. PAINEL DE GESTÃO (RESTRICTED) */}
          <Route path="/painel" element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="visao-geral" element={<Overview />} />

              {/* Minha Conta de Carbono (Empresas) */}
              <Route path="calculadora" element={<Calculator />} /> {/* SIE v1.1 */}
              <Route path="aposentar" element={<RetireCredits />} />

              {/* Operações de Governo (Novo) */}
              <Route path="registrar-inventario" element={<RegisterInventory />} />

              {/* Ferramentas de Gestão */}
              <Route path="certificadora" element={<CertifierReview />} /> {/* Fluxo de Certificadora */}
              <Route path="certificadora/cadastro" element={<CertifierPanel />} /> {/* Registro de Projetos */}
              <Route path="auditoria" element={<AuditorReview />} />
              <Route path="auditoria/registro" element={<AuditRegistration />} />
              <Route path="monitoramento" element={<MonitoringNDVI />} />
              <Route path="monitoramento/:projectId" element={<MonitoringNDVI />} />
              <Route path="selo-sinarca" element={<RiskScoreMethodology />} />
              <Route path="score-risco" element={<RiskScoreMethodology />} />

              {/* Visualização Interna (Restored for Dashboard Functionality) */}
              <Route path="mrca/:id/editar" element={<AddProject mode="edit" />} />
              <Route path="projetos/:id/editar" element={<AddProject mode="edit" />} />
              <Route path="mrca/:id" element={<MrcaDetails />} />
              <Route path="meu-perfil" element={<UserProfile />} />
              <Route path="perfil/:id" element={<UserProfile />} />
              <Route path="rede" element={<ProjectNetwork />} />
              <Route path="projetos" element={<Feed />} />
              <Route path="marketplace" element={<CreditMarketplace />} />
              <Route path="comprar-creditos" element={<CreditMarketplace />} />
              <Route path="mapa-projetos" element={<GlobalMap />} />
              <Route path="mapa-nacional" element={<NationalMap />} />
              <Route path="lideres" element={<ImpactLeaders />} />
              <Route path="relatorios" element={<Reports />} />

              {/* PUBLIC ECOSYSTEM LISTS (Within Dashboard) */}
              <Route path="auditores" element={<Auditors />} />
              <Route path="auditores/:id" element={<AuditorProfile />} />
              <Route path="certificadoras" element={<Certifiers />} />
              <Route path="certificadoras/:id" element={<CertifierProfile />} />
              <Route path="denuncias" element={<Reports />} />

              <Route path="empresas" element={<Companies />} />
              <Route path="empresas/:id" element={<CompanyProfile />} />

              <Route path="transacoes" element={<Transactions />} />
              <Route path="rastrear" element={<Transactions />} />
              <Route path="configuracoes" element={<Settings />} />
              <Route path="inventario" element={<ImpactInventory />} />
              <Route path="adicionar-projeto" element={<AddProject />} />
            </Route>
          </Route>

          {/* Default route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
