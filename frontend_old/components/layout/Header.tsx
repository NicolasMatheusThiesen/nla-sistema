'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/maquinas': 'Máquinas',
  '/clientes': 'Clientes',
  '/contratos': 'Contratos',
  '/financeiro': 'Financeiro',
  '/manutencoes': 'Manutenções',
  '/vendas': 'Vendas',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
};

export default function Header() {
  const pathname = usePathname();
  
  const title = Object.entries(pageTitles)
    .filter(([key]) => pathname.startsWith(key))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] || 'Sistema';

  const date = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground capitalize">{date}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Sistema Online
        </div>
      </div>
    </header>
  );
}
