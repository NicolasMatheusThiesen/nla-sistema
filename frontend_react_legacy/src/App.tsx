import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import DashboardLayout from './pages/layout';

import clientesPage from './pages/clientes/page';
import clientes__id_Page from './pages/clientes/[id]/page';
import comprasPage from './pages/compras/page';
import configuracoesPage from './pages/configuracoes/page';
import configuracoes_fornecedoresPage from './pages/configuracoes/fornecedores/page';
import configuracoes_materiaisPage from './pages/configuracoes/materiais/page';
import configuracoes_servicosPage from './pages/configuracoes/servicos/page';
import configuracoes_tipos_equipamentoPage from './pages/configuracoes/tipos-equipamento/page';
import contratosPage from './pages/contratos/page';
import contratos__id_Page from './pages/contratos/[id]/page';
import dashboardPage from './pages/dashboard/page';
import documentosPage from './pages/documentos/page';
import financeiroPage from './pages/financeiro/page';
import financeiro_nfePage from './pages/financeiro/nfe/page';
import manutencoesPage from './pages/manutencoes/page';
import maquinasPage from './pages/maquinas/page';
import maquinas__id_Page from './pages/maquinas/[id]/page';
import ordens_servicoPage from './pages/ordens-servico/page';
import relatoriosPage from './pages/relatorios/page';
import vendasPage from './pages/vendas/page';
import vendedoresPage from './pages/vendedores/page';


const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="clientes" element={<clientesPage />} />
            <Route path="clientes/:id" element={<clientes__id_Page />} />
            <Route path="compras" element={<comprasPage />} />
            <Route path="configuracoes" element={<configuracoesPage />} />
            <Route path="configuracoes/fornecedores" element={<configuracoes_fornecedoresPage />} />
            <Route path="configuracoes/materiais" element={<configuracoes_materiaisPage />} />
            <Route path="configuracoes/servicos" element={<configuracoes_servicosPage />} />
            <Route path="configuracoes/tipos-equipamento" element={<configuracoes_tipos_equipamentoPage />} />
            <Route path="contratos" element={<contratosPage />} />
            <Route path="contratos/:id" element={<contratos__id_Page />} />
            <Route path="dashboard" element={<dashboardPage />} />
            <Route path="documentos" element={<documentosPage />} />
            <Route path="financeiro" element={<financeiroPage />} />
            <Route path="financeiro/nfe" element={<financeiro_nfePage />} />
            <Route path="manutencoes" element={<manutencoesPage />} />
            <Route path="maquinas" element={<maquinasPage />} />
            <Route path="maquinas/:id" element={<maquinas__id_Page />} />
            <Route path="ordens-servico" element={<ordens_servicoPage />} />
            <Route path="relatorios" element={<relatoriosPage />} />
            <Route path="vendas" element={<vendasPage />} />
            <Route path="vendedores" element={<vendedoresPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}