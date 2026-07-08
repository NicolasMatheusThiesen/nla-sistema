import fs from 'fs';

const pages = [
  'clientes', 'clientes/[id]', 'compras', 'configuracoes', 'configuracoes/fornecedores',
  'configuracoes/materiais', 'configuracoes/servicos', 'configuracoes/tipos-equipamento',
  'contratos', 'contratos/[id]', 'dashboard', 'documentos', 'financeiro', 'financeiro/nfe',
  'manutencoes', 'maquinas', 'maquinas/[id]', 'ordens-servico', 'relatorios', 'vendas', 'vendedores'
];

let imports = '';
let routes = '';

pages.forEach(p => {
  const compName = p.replace(/[^a-zA-Z0-9]/g, '_') + 'Page';
  imports += `import ${compName} from './pages/${p}/page';\n`;
  const routePath = p.replace(/\[id\]/g, ':id');
  routes += `            <Route path="${routePath}" element={<${compName} />} />\n`;
});

const appTsx = `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import DashboardLayout from './pages/layout';

${imports}

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
${routes}          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}`;

fs.writeFileSync('src/App.tsx', appTsx);
console.log('App.tsx written!');
