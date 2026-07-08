import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api, ApiError } from '@/lib/api';
import { ref } from 'vue';

// --- Types ---
export interface DashboardData {
  kpis: {
    receita_mes: number;
    receita_pendente: number;
    custo_manutencao_mes: number;
    inadimplencia: number;
    lucro_liquido: number;
    total_maquinas: number;
    maquinas_disponiveis: number;
    maquinas_locadas: number;
    maquinas_manutencao: number;
    ocupacao_frota: number;
  };
  fluxo_mensal: Array<{ mes: string; receita: number; despesa: number }>;
  alertas: Array<{ tipo: string; mensagem: string; dados?: unknown; valor?: number }>;
}

export interface Cliente {
  id: string;
  tipo_pessoa: 'PF' | 'PJ';
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  telefone2?: string;
  contato_financeiro?: string;
  telefone_financeiro?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  limite_credito: number;
  status_credito: 'bom' | 'regular' | 'bloqueado';
  observacoes?: string;
  ativo: boolean;
  created_at: string;
}

export interface Maquina {
  id: string;
  nome: string;
  modelo?: string;
  marca?: string;
  numero_serie?: string;
  ano_fabricacao?: number;
  tipo: string;
  subtipo?: string;
  capacidade_kg?: number;
  altura_max_elevacao?: number;
  valor_aquisicao: number;
  valor_mercado: number;
  custo_mensal_estimado: number;
  status: string;
  foto_url?: string;
  data_aquisicao?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
}

export interface Venda {
  id: string;
  maquina_id: string;
  maquinas?: { id: string; nome: string; modelo?: string; tipo: string };
  cliente_id: string;
  clientes?: { razao_social: string };
  valor_venda: number;
  valor_custo: number;
  forma_pagamento: string;
  numero_parcelas: number;
  data_venda: string;
  observacoes?: string;
  vendedor_id?: string;
  vendedores?: { nome: string };
  percentual_comissao: number;
  tipo_comissao?: 'percentual' | 'fixo';
  valor_comissao: number;
}

export interface Fornecedor {
  id: string;
  tipo_pessoa: 'PF' | 'PJ';
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
  created_at: string;
}

export interface Compra {
  id: string;
  descricao: string;
  fornecedor_id?: string;
  fornecedores?: { razao_social: string };
  material_id?: string;
  materiais?: { nome: string; unidade_medida: string };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  finalidade: 'consumo' | 'revenda';
  data_compra: string;
  nota_fiscal?: string;
  observacoes?: string;
}

export interface Material {
  id: string;
  nome: string;
  finalidade: 'consumo' | 'manutencao' | 'revenda' | 'multiplo';
  unidade_medida: string;
  custo_unitario?: number;
  valor_venda?: number;
  quantidade_estoque: number;
  ativo: boolean;
}

export interface Vendedor {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  percentual_comissao_padrao: number;
  ativo: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  valor_padrao: number;
  ativo: boolean;
}

export interface TipoEquipamento {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor?: string;
  icone?: string;
}

export interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  clientes?: { id: string; razao_social: string; cpf_cnpj: string };
  status: string;
  tipo_locacao: string;
  data_inicio: string;
  data_fim?: string;
  dia_vencimento?: number;
  data_primeiro_vencimento?: string;
  valor_mensal: number;
  created_at: string;
}

export interface Lancamento {
  id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data_competencia: string;
  data_vencimento?: string;
  data_pagamento?: string;
  status: string;
  cliente_id?: string;
  fornecedor_id?: string;
  clientes?: { razao_social: string };
  fornecedores?: { razao_social: string };
}

export interface LancamentosResponse {
  data: Lancamento[];
  total: number;
  page: number;
  limit: number;
}

export interface Manutencao {
  id: string;
  maquina_id: string;
  maquinas?: { nome: string; numero_serie?: string };
  tipo: 'preventiva' | 'corretiva';
  data_agendada: string;
  data_realizada?: string;
  descricao: string;
  custo: number;
  status: string;
  responsavel?: string;
}

export interface OrdemServico {
  id: string;
  numero: string;
  cliente_id?: string;
  clientes?: { razao_social: string };
  maquina_id?: string;
  maquinas?: { nome: string };
  data_abertura: string;
  data_fechamento?: string;
  status: string;
  descricao_problema: string;
  servicos_executados?: string;
  valor_total: number;
}

import { unref } from 'vue';

// --- Dashboard ---
export function useDashboard(params?: any) {
  return useQuery({
    queryKey: ['dashboard', params],
    queryFn: () => {
      const p = unref(params);
      const qs = new URLSearchParams(p as Record<string, string>).toString();
      return api.get<DashboardData>(`/api/dashboard${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 60000,
  });
}

// --- Clientes ---
export function useClientes(params?: { search?: string; status_credito?: string }) {
  return useQuery({
    queryKey: ['clientes', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Cliente[]>(`/api/clientes${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Cliente>) => api.post('/api/clientes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cliente> }) => api.put(`/api/clientes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

// --- MÃ¡quinas ---
export function useMaquinas(params?: { status?: string; tipo?: string; search?: string }) {
  return useQuery({
    queryKey: ['maquinas', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Maquina[]>(`/api/maquinas${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateMaquina() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Maquina>) => api.post('/api/maquinas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maquinas'] });
    },
  });
}

export function useUpdateMaquina() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Maquina> }) => api.put(`/api/maquinas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maquinas'] });
    },
  });
}

// --- Vendas ---
export function useVendas() {
  return useQuery({
    queryKey: ['vendas'],
    queryFn: () => api.get<Venda[]>('/api/vendas'),
  });
}

export function useCreateVenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Venda>) => api.post('/api/vendas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    },
  });
}

export function useUpdateVenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Venda> }) => api.put(`/api/vendas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    },
  });
}

// --- Fornecedores ---
export function useFornecedores(params?: { search?: string }) {
  return useQuery({
    queryKey: ['fornecedores', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Fornecedor[]>(`/api/fornecedores${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Fornecedor>) => api.post('/api/fornecedores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Fornecedor> }) => api.put(`/api/fornecedores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    },
  });
}

// --- Contratos ---
export function useContratos(params?: { status?: string }) {
  return useQuery({
    queryKey: ['contratos', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Contrato[]>(`/api/contratos${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contrato>) => api.post('/api/contratos', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contratos'] }),
  });
}

// --- Financeiro (Lancamentos) ---
export function useLancamentos(params?: { tipo?: string; status?: string }) {
  return useQuery({
    queryKey: ['lancamentos', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<LancamentosResponse>(`/api/lancamentos${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lancamento>) => api.post('/api/lancamentos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lancamento> }) => api.put(`/api/lancamentos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// --- ManutenÃ§Ãµes ---
export function useManutencoes(params?: { status?: string; tipo?: string }) {
  return useQuery({
    queryKey: ['manutencoes', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Manutencao[]>(`/api/manutencoes${qs ? `?${qs}` : ''}`);
    }
  });
}

// --- Ordens de ServiÃ§o ---
export function useOrdensServico(params?: { status?: string }) {
  return useQuery({
    queryKey: ['ordens-servico', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<OrdemServico[]>(`/api/ordens-servico${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateOrdemServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrdemServico>) => api.post('/api/ordens-servico', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

export function useUpdateOrdemServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrdemServico> }) => api.put(`/api/ordens-servico/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

// --- Compras ---
export function useCompras(params?: { finalidade?: string; search?: string }) {
  return useQuery({
    queryKey: ['compras', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Compra[]>(`/api/compras${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Compra>) => api.post('/api/compras', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Compra> }) => api.put(`/api/compras/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// --- Categorias ---
export function useCategorias(params?: { tipo?: string }) {
  return useQuery({
    queryKey: ['categorias', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Categoria[]>(`/api/categorias${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Categoria>) => api.post('/api/categorias', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categorias'] }),
  });
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Categoria> }) => api.put(`/api/categorias/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categorias'] }),
  });
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/categorias/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categorias'] }),
  });
}
export function useVendedores(params?: { ativo?: string }) {
  return useQuery({
    queryKey: ['vendedores', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Vendedor[]>(`/api/vendedores${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vendedor>) => api.post('/api/vendedores', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendedores'] }),
  });
}

export function useUpdateVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vendedor> }) => api.put(`/api/vendedores/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendedores'] }),
  });
}

// --- Materiais ---
export function useMateriais(params?: { search?: string; finalidade?: string }) {
  return useQuery({
    queryKey: ['materiais', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Material[]>(`/api/materiais${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => api.post('/api/materiais', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materiais'] }),
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) => api.put(`/api/materiais/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materiais'] }),
  });
}

// --- Servicos ---
export function useServicos(params?: { search?: string }) {
  return useQuery({
    queryKey: ['servicos', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Servico[]>(`/api/servicos${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Servico>) => api.post('/api/servicos', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servicos'] }),
  });
}

export function useUpdateServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Servico> }) => api.put(`/api/servicos/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['servicos'] }),
  });
}

// --- Tipos de Equipamento ---
export function useTiposEquipamento(params?: { search?: string }) {
  return useQuery({
    queryKey: ['tiposEquipamento', params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<TipoEquipamento[]>(`/api/tipos-equipamento${qs ? `?${qs}` : ''}`);
    }
  });
}

export function useCreateTipoEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TipoEquipamento>) => api.post('/api/tipos-equipamento', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tiposEquipamento'] }),
  });
}

export function useUpdateTipoEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TipoEquipamento> }) => api.put(`/api/tipos-equipamento/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tiposEquipamento'] }),
  });
}

// --- ImportaÃ§Ã£o NF-e ---
export function useImportNfe() {
  return useMutation({
    mutationFn: (data: { xml: string; cliente_id?: string; maquina_id?: string; contrato_id?: string; tipo_override?: 'entrada'|'saida' }) => 
      api.post('/api/nfe/importar', data)
  });
}

// --- Contas Bancárias ---
export interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  saldo_inicial: number;
  saldo_atual: number;
  ativo: boolean;
  created_at: string;
}

export function useContasBancarias() {
  return useQuery({
    queryKey: ['contas_bancarias'],
    queryFn: async () => {
      const { data } = await api.get<ContaBancaria[]>('/api/contas-bancarias');
      return data;
    },
  });
}

export function useCreateContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContaBancaria>) => api.post('/api/contas-bancarias', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contas_bancarias'] }),
  });
}

export function useUpdateContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContaBancaria> }) => api.put(`/api/contas-bancarias/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contas_bancarias'] }),
  });
}

export function useDeleteContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/contas-bancarias/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contas_bancarias'] }),
  });
}
