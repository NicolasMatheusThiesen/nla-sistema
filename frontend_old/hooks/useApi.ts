'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, downloadBlob } from '@/lib/api';
import { toast } from '@/hooks/useToast';

// ── DASHBOARD ────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/api/dashboard'),
    refetchInterval: 60_000,
  });
}

// ── FORNECEDORES ─────────────────────────────────────────────
export interface Fornecedor {
  id: string;
  tipo_pessoa: 'PF' | 'PJ';
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
}

export function useFornecedores(params?: { search?: string; ativo?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['fornecedores', params],
    queryFn: () => api.get<Fornecedor[]>(`/api/fornecedores?${qs}`),
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Fornecedor>) => api.post('/api/fornecedores', data),
    onSuccess: () => {
      toast.success('Fornecedor cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erro ao cadastrar fornecedor'),
  });
}

export function useUpdateFornecedor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Fornecedor>) => api.put(`/api/fornecedores/${id}`, data),
    onSuccess: () => {
      toast.success('Fornecedor atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erro ao atualizar fornecedor'),
  });
}

export function useDeleteFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/fornecedores/${id}`),
    onSuccess: () => {
      toast.success('Fornecedor removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erro ao remover fornecedor'),
  });
}

// ── MAQUINAS ─────────────────────────────────────────────────
export function useMaquinas(params?: { status?: string; tipo?: string; search?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['maquinas', params],
    queryFn: () => api.get<Maquina[]>(`/api/maquinas${qs ? `?${qs}` : ''}`),
  });
}

export function useMaquina(id: string) {
  return useQuery({
    queryKey: ['maquinas', id],
    queryFn: () => api.get<MaquinaDetalhada>(`/api/maquinas/${id}`),
    enabled: !!id,
  });
}

export function useMaquinaRentabilidade(id: string, periodoMeses = 12) {
  return useQuery({
    queryKey: ['maquinas', id, 'rentabilidade', periodoMeses],
    queryFn: () => api.get<RentabilidadeMaquina>(`/api/maquinas/${id}/rentabilidade?periodo_meses=${periodoMeses}`),
    enabled: !!id,
  });
}

export function useCreateMaquina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Maquina>) => api.post('/api/maquinas', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Máquina cadastrada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateMaquina(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Maquina>) => api.put(`/api/maquinas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Máquina atualizada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteMaquina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/maquinas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Máquina removida!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── CLIENTES ─────────────────────────────────────────────────
export function useClientes(params?: { search?: string; status_credito?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['clientes', params],
    queryFn: () => api.get<Cliente[]>(`/api/clientes${qs ? `?${qs}` : ''}`),
  });
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: () => api.get<ClienteDetalhado>(`/api/clientes/${id}`),
    enabled: !!id,
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Cliente>) => api.post('/api/clientes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Cliente cadastrado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateCliente(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Cliente>) => api.put(`/api/clientes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Cliente atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── CONTRATOS ────────────────────────────────────────────────
export function useContratos(params?: { status?: string; cliente_id?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['contratos', params],
    queryFn: () => api.get<Contrato[]>(`/api/contratos${qs ? `?${qs}` : ''}`),
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: ['contratos', id],
    queryFn: () => api.get<ContratoDetalhado>(`/api/contratos/${id}`),
    enabled: !!id,
  });
}

export function useCreateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContratoData) => api.post('/api/contratos', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Contrato criado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateContratoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/contratos/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Status atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateContrato(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contrato>) => api.put(`/api/contratos/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Contrato atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/contratos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contratos'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Contrato excluído!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function usePagarParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contratoId, parcelaId, data }: { contratoId: string; parcelaId: string; data: PagamentoParcela }) =>
      api.patch(`/api/contratos/${contratoId}/parcelas/${parcelaId}/pagar`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contratos', vars.contratoId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Pagamento registrado!');
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── LANÇAMENTOS ──────────────────────────────────────────────
export function useLancamentos(params?: { tipo?: string; status?: string; mes?: string; page?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['lancamentos', params],
    queryFn: () => api.get<LancamentosResponse>(`/api/lancamentos${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lancamento>) => api.post('/api/lancamentos', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Lançamento criado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateLancamento(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lancamento>) => api.put(`/api/lancamentos/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); toast.success('Lançamento atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/lancamentos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); toast.success('Lançamento cancelado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── MANUTENÇÕES ──────────────────────────────────────────────
export function useManutencoes(params?: { maquina_id?: string; tipo?: string; status?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return useQuery({
    queryKey: ['manutencoes', params],
    queryFn: () => api.get<Manutencao[]>(`/api/manutencoes${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateManutencao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Manutencao>) => api.post('/api/manutencoes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manutencoes'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Manutenção registrada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateManutencao(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Manutencao>) => api.put(`/api/manutencoes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manutencoes'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Manutenção atualizada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteManutencao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/manutencoes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manutencoes'] }); qc.invalidateQueries({ queryKey: ['maquinas'] }); toast.success('Manutenção removida!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── VENDAS ───────────────────────────────────────────────────
export function useVendas() {
  return useQuery({ queryKey: ['vendas'], queryFn: () => api.get<Venda[]>('/api/vendas') });
}

export function useCreateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Venda>) => api.post('/api/vendas', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendas', 'maquinas'] }); toast.success('Venda registrada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateVenda(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Venda>) => api.put(`/api/vendas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendas', 'maquinas'] }); toast.success('Venda atualizada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/vendas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendas', 'maquinas'] }); toast.success('Venda removida!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── CATEGORIAS ───────────────────────────────────────────────
export function useCategorias(tipo?: string) {
  const qs = tipo ? `?tipo=${tipo}` : '';
  return useQuery({ queryKey: ['categorias', tipo], queryFn: () => api.get<Categoria[]>(`/api/categorias${qs}`) });
}

// ── RELATÓRIOS ───────────────────────────────────────────────
export function useDownloadRelatorio() {
  return useMutation({
    mutationFn: async ({ path, filename }: { path: string; filename: string }) => {
      const blob = await api.get<Blob>(path);
      downloadBlob(blob, filename);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── VENDEDORES ───────────────────────────────────────────────
export function useVendedores(params?: { ativo?: string }) {
  const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
  return useQuery({ queryKey: ['vendedores', params], queryFn: () => api.get<Vendedor[]>(`/api/vendedores${qs ? `?${qs}` : ''}`) });
}

export function useVendedor(id: string) {
  return useQuery({ queryKey: ['vendedores', id], queryFn: () => api.get<VendedorDetalhado>(`/api/vendedores/${id}`), enabled: !!id });
}

export function useCreateVendedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vendedor>) => api.post('/api/vendedores', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendedores'] }); toast.success('Vendedor cadastrado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateVendedor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vendedor>) => api.put(`/api/vendedores/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendedores'] }); toast.success('Vendedor atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteVendedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/vendedores/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendedores'] }); toast.success('Vendedor desativado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── NF-e ─────────────────────────────────────────────────────
export function useNFes() {
  return useQuery({ queryKey: ['nfes'], queryFn: () => api.get<NFe[]>('/api/nfe') });
}

export function useParseNFe() {
  return useMutation({
    mutationFn: (xml: string) => api.post<NFeParseResult>('/api/nfe/parse', { xml }),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useImportarNFe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { xml: string; cliente_id?: string; maquina_id?: string; contrato_id?: string; tipo_override?: 'entrada' | 'saida' }) =>
      api.post('/api/nfe/importar', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos', 'nfes'] });
      toast.success('NF-e importada e lançamento criado!');
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── DOCUMENTOS PDF ────────────────────────────────────────────
export function useGerarFaturaPDF() {
  return useMutation({
    mutationFn: async ({ contratoId, competencia, num }: { contratoId: string; competencia?: string; num?: string }) => {
      const qs = new URLSearchParams({ ...(competencia && { competencia }), ...(num && { num }) }).toString();
      const blob = await api.get<Blob>(`/api/documentos/fatura/${contratoId}${qs ? `?${qs}` : ''}`);
      downloadBlob(blob, `fatura-${num || competencia || 'locacao'}.pdf`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useGerarContratoPDF() {
  return useMutation({
    mutationFn: async (contratoId: string) => {
      const blob = await api.get<Blob>(`/api/documentos/contrato/${contratoId}`);
      downloadBlob(blob, `contrato-${contratoId.slice(0, 8)}.pdf`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useGerarVendaPDF() {
  return useMutation({
    mutationFn: async (vendaId: string) => {
      const blob = await api.get<Blob>(`/api/documentos/venda/${vendaId}`);
      downloadBlob(blob, `recibo-venda-${vendaId.slice(0, 8)}.pdf`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── TIPOS ────────────────────────────────────────────────────
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

export interface MaquinaDetalhada extends Maquina {
  manutencoes: Manutencao[];
  rentabilidade: { total_receita: number; total_custos: number; lucro_liquido: number; roi_percentual: number };
}

export interface RentabilidadeMaquina {
  maquina: Maquina;
  periodo_meses: number;
  receita_estimada: number;
  custo_manutencao: number;
  custo_depreciacao: number;
  custo_total: number;
  lucro_liquido: number;
  margem_percentual: number;
  roi_percentual: number;
  payback_meses: number | null;
  manutencoes: Manutencao[];
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

export interface ClienteDetalhado extends Cliente {
  contratos: Contrato[];
  parcelas: Parcela[];
  financeiro: { total_devido: number; total_pago: number; inadimplencia: number };
}

export interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  clientes?: { id: string; razao_social: string; nome_fantasia?: string; cpf_cnpj: string };
  status: string;
  tipo_locacao: string;
  data_inicio: string;
  data_fim?: string;
  dia_vencimento: number;
  valor_mensal: number;
  indice_reajuste: string;
  manutencao_inclusa: boolean;
  seguro_incluso: boolean;
  multa_rescisao_percentual: number;
  contrato_itens?: Array<{ id: string; valor_unitario: number; maquinas?: Maquina }>;
  created_at: string;
  // Campos de comissão
  vendedor_id?: string;
  vendedores?: { nome: string };
  percentual_comissao: number;
  tipo_comissao?: 'percentual' | 'fixo';
  valor_comissao: number;
}

export interface ContratoDetalhado extends Contrato {
  clientes: Cliente;
  contrato_itens: Array<{ id: string; valor_unitario: number; maquinas: Maquina }>;
  parcelas: Parcela[];
}

export interface Parcela {
  id: string;
  contrato_id: string;
  cliente_id: string;
  competencia: string;
  numero_parcela: number;
  data_vencimento: string;
  valor: number;
  valor_pago?: number;
  status: string;
  data_pagamento?: string;
  forma_pagamento?: string;
}

export interface PagamentoParcela {
  valor_pago: number;
  data_pagamento: string;
  forma_pagamento: string;
  observacoes?: string;
}

export interface Lancamento {
  id: string;
  tipo: 'receita' | 'despesa';
  categoria_id?: string;
  categorias?: { nome: string; cor?: string; tipo?: string };
  descricao: string;
  valor: number;
  data_competencia: string;
  data_vencimento?: string;
  data_pagamento?: string;
  status: string;
  forma_pagamento?: string;
  cliente_id?: string;
  fornecedor_id?: string;
  clientes?: { razao_social: string };
  fornecedores?: { razao_social: string };
  maquina_id?: string;
  maquinas?: { nome: string; modelo?: string };
  contrato_id?: string;
  observacoes?: string;
  recorrente: boolean;
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
  maquinas?: { id: string; nome: string; modelo?: string; tipo: string };
  tipo: string;
  fornecedor?: string;
  custo: number;
  data_inicio: string;
  data_fim?: string;
  descricao?: string;
  pecas_trocadas?: string;
  proxima_manutencao?: string;
  status: string;
  observacoes?: string;
  is_terceiro?: boolean;
  cliente_id?: string;
  clientes?: { razao_social: string };
  maquina_terceiro_descricao?: string;
  manutencao_materiais?: ManutencaoMaterial[];
  manutencao_servicos?: ManutencaoServico[];
  materiais?: ManutencaoMaterial[]; // Para envio via form
  servicos?: ManutencaoServico[]; // Para envio via form
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
  // Campos de comissão
  vendedor_id?: string;
  vendedores?: { nome: string };
  percentual_comissao: number;
  tipo_comissao?: 'percentual' | 'fixo';
  valor_comissao: number;
  venda_materiais?: VendaMaterial[];
  materiais?: VendaMaterial[];
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  icone?: string;
}

export interface CreateContratoData {
  cliente_id: string;
  tipo_locacao: string;
  data_inicio: string;
  data_fim?: string;
  dia_vencimento: number;
  valor_mensal: number;
  indice_reajuste: string;
  percentual_reajuste_fixo?: number;
  manutencao_inclusa: boolean;
  seguro_incluso: boolean;
  multa_rescisao_percentual: number;
  clausulas_adicionais?: string;
  observacoes?: string;
  maquina_ids: string[];
  valores_unitarios: number[];
  // Comissão
  vendedor_id?: string;
  percentual_comissao?: number;
  tipo_comissao?: 'percentual' | 'fixo';
  valor_comissao?: number;
}

export interface Vendedor {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  percentual_comissao_padrao: number;
  ativo: boolean;
  created_at: string;
}

export interface VendedorDetalhado extends Vendedor {
  vendas: Array<{ id: string; valor_venda: number; valor_comissao: number; percentual_comissao: number; data_venda: string; clientes?: { razao_social: string }; maquinas?: { nome: string } }>;
  contratos: Array<{ id: string; numero: string; valor_mensal: number; valor_comissao: number; percentual_comissao: number; data_inicio: string; clientes?: { razao_social: string } }>;
  total_comissao_vendas: number;
  total_comissao_contratos: number;
  total_comissao: number;
}

export interface NFe {
  id: string;
  numero: string;
  chave_acesso?: string;
  tipo: 'entrada' | 'saida';
  data_emissao: string;
  emitente_nome: string;
  emitente_cnpj: string;
  destinatario_nome: string;
  destinatario_cnpj: string;
  valor_total: number;
  lancamento_id?: string;
  cliente_id?: string;
  maquina_id?: string;
  contrato_id?: string;
  clientes?: { razao_social: string };
  maquinas?: { nome: string };
  contratos?: { numero: string };
  created_at: string;
}

export interface NFeParseResult {
  numero: string;
  chaveAcesso: string;
  tipo: 'entrada' | 'saida';
  dataEmissao: string;
  emitenteNome: string;
  emitenteCnpj: string;
  destinatarioNome: string;
  destinatarioCnpj: string;
  valorTotal: number;
  produtos: Array<{ nome: string; qtd: string; vlrUnit: number; vlrTotal: number }>;
  cliente_sugerido?: { id: string; razao_social: string; cpf_cnpj: string } | null;
}

// ── MATERIAIS ────────────────────────────────────────────────
export function useMateriais(params?: { search?: string; finalidade?: string; ativo?: string }) {
  const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
  return useQuery({ queryKey: ['materiais', params], queryFn: () => api.get<Material[]>(`/api/materiais${qs ? `?${qs}` : ''}`) });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => api.post('/api/materiais', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materiais'] }); toast.success('Material cadastrado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateMaterial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => api.put(`/api/materiais/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materiais'] }); toast.success('Material atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── SERVIÇOS ────────────────────────────────────────────────
export function useServicos(params?: { search?: string; ativo?: string }) {
  const qs = params ? newSearchParams(params) : '';
  return useQuery({ queryKey: ['servicos', params], queryFn: () => api.get<Servico[]>(`/api/servicos${qs ? `?${qs}` : ''}`) });
}

export function useCreateServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Servico>) => api.post('/api/servicos', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicos'] }); toast.success('Serviço cadastrado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateServico(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Servico>) => api.put(`/api/servicos/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicos'] }); toast.success('Serviço atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── TIPOS DE EQUIPAMENTO ────────────────────────────────────
export function useTiposEquipamento(params?: { search?: string }) {
  const qs = params ? newSearchParams(params) : '';
  return useQuery({ queryKey: ['tipos_equipamento', params], queryFn: () => api.get<TipoEquipamento[]>(`/api/tipos-equipamento${qs ? `?${qs}` : ''}`) });
}

export function useCreateTipoEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TipoEquipamento>) => api.post('/api/tipos-equipamento', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tipos_equipamento'] }); toast.success('Tipo cadastrado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateTipoEquipamento(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TipoEquipamento>) => api.put(`/api/tipos-equipamento/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tipos_equipamento'] }); toast.success('Tipo atualizado!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// Helper para params
function newSearchParams(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

// ── ORDENS DE SERVIÇO ───────────────────────────────────
export function useOrdensServico(params?: { status?: string; cliente_id?: string; search?: string }) {
  const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
  return useQuery({ queryKey: ['ordens_servico', params], queryFn: () => api.get<OrdemServico[]>(`/api/ordens-servico${qs ? `?${qs}` : ''}`) });
}

export function useCreateOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/ordens-servico', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens_servico'] }); qc.invalidateQueries({ queryKey: ['lancamentos'] }); toast.success('OS criada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useUpdateOrdemServico(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/api/ordens-servico/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens_servico'] }); qc.invalidateQueries({ queryKey: ['lancamentos'] }); toast.success('OS atualizada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/ordens-servico/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens_servico'] }); toast.success('OS removida!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── COMPRAS ────────────────────────────────────────
export function useCompras(params?: { finalidade?: string; search?: string }) {
  const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
  return useQuery({ queryKey: ['compras', params], queryFn: () => api.get<Compra[]>(`/api/compras${qs ? `?${qs}` : ''}`) });
}

export function useCreateCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/compras', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); qc.invalidateQueries({ queryKey: ['lancamentos'] }); qc.invalidateQueries({ queryKey: ['materiais'] }); toast.success('Compra registrada!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDeleteCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/compras/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); qc.invalidateQueries({ queryKey: ['lancamentos'] }); toast.success('Compra removida!'); },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// ── NOVOS TIPOS ─────────────────────────────────────────────
export interface Material {
  id: string;
  nome: string;
  finalidade: 'consumo' | 'manutencao' | 'revenda' | 'multiplo';
  unidade_medida: string;
  custo_unitario: number;
  valor_venda: number;
  quantidade_estoque: number;
  observacoes?: string;
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

export interface VendaMaterial {
  id?: string;
  material_id: string;
  materiais?: { nome: string };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface ManutencaoMaterial {
  id?: string;
  material_id: string;
  materiais?: { nome: string };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface ManutencaoServico {
  id?: string;
  servico_id: string;
  servicos?: { nome: string };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface OrdemServico {
  id: string;
  numero: string;
  cliente_id: string;
  clientes?: { id: string; razao_social: string };
  maquina_id?: string;
  maquinas?: { id: string; nome: string; modelo?: string };
  maquina_terceiro_descricao?: string;
  status: string;
  data_abertura: string;
  data_conclusao?: string;
  descricao?: string;
  valor_total: number;
  lancamento_id?: string;
  observacoes?: string;
  os_servicos?: OsServico[];
  os_materiais?: OsMaterial[];
  created_at: string;
}

export interface OsServico {
  id: string;
  servico_id: string;
  servicos?: { nome: string };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface OsMaterial {
  id: string;
  material_id: string;
  materiais?: { nome: string };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
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
  lancamento_id?: string;
  observacoes?: string;
  created_at: string;
}
