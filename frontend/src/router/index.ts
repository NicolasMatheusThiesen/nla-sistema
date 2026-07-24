import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import LoginView from '../views/LoginView.vue'
import { authService } from '../lib/api'
import DashboardView from '../views/DashboardView.vue'
import ClientesView from '../views/ClientesView.vue'
import MaquinasView from '../views/MaquinasView.vue'
import VendasView from '../views/VendasView.vue'
import FornecedoresView from '../views/FornecedoresView.vue'
import ContratosView from '../views/ContratosView.vue'
import FinanceiroView from '../views/FinanceiroView.vue'
import ManutencoesView from '../views/ManutencoesView.vue'
import OrdensServicoView from '../views/OrdensServicoView.vue'
import ComprasView from '../views/ComprasView.vue'
import VendedoresView from '../views/VendedoresView.vue'
import ConfiguracoesView from '../views/ConfiguracoesView.vue'
import RelatoriosView from '../views/RelatoriosView.vue'
import PlaceholderView from '../views/PlaceholderView.vue'
import MateriaisView from '../views/MateriaisView.vue'
import ServicosView from '../views/ServicosView.vue'
import TiposEquipamentoView from '../views/TiposEquipamentoView.vue'
import NfeView from '../views/NfeView.vue'
import ContasBancariasView from '../views/ContasBancariasView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
        },
        {
          path: 'clientes',
          name: 'clientes',
          component: ClientesView,
        },
        {
          path: 'maquinas',
          name: 'maquinas',
          component: MaquinasView,
        },
        {
          path: 'vendas',
          name: 'vendas',
          component: VendasView,
        },
        {
          path: 'fornecedores',
          name: 'fornecedores',
          component: FornecedoresView,
        },
        {
          path: 'contratos',
          name: 'contratos',
          component: ContratosView,
        },
        {
          path: 'financeiro',
          name: 'financeiro',
          component: FinanceiroView,
        },
        {
          path: 'manutencoes',
          name: 'manutencoes',
          component: ManutencoesView,
        },
        {
          path: 'ordens-servico',
          name: 'ordens-servico',
          component: OrdensServicoView,
        },
        {
          path: 'compras',
          name: 'compras',
          component: ComprasView,
        },
        {
          path: 'vendedores',
          name: 'vendedores',
          component: VendedoresView,
        },
        {
          path: 'configuracoes',
          name: 'configuracoes',
          component: ConfiguracoesView,
        },
        {
          path: 'configuracoes/materiais',
          name: 'materiais',
          component: MateriaisView,
        },
        {
          path: 'configuracoes/servicos',
          name: 'servicos',
          component: ServicosView,
        },
        {
          path: 'configuracoes/tipos-equipamento',
          name: 'tipos-equipamento',
          component: TiposEquipamentoView,
        },
        {
          path: 'financeiro/nfe',
          name: 'nfe',
          component: NfeView,
        },
        {
          path: 'relatorios',
          name: 'relatorios',
          component: RelatoriosView,
        },
        {
          path: 'contas-bancarias',
          name: 'contas-bancarias',
          component: ContasBancariasView,
        },
        // Catch-all route for other dashboard pages
        {
          path: ':pathMatch(.*)*',
          name: 'placeholder',
          component: PlaceholderView
        }
      ]
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const session = authService.getSession();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !session) {
    next('/login');
  } else if (to.path === '/login' && session) {
    next('/');
  } else {
    next();
  }
});

export default router
