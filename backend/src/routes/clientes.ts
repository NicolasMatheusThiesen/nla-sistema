import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const clienteSchema = z.object({
  tipo_pessoa: z.enum(['PF', 'PJ']),
  cpf_cnpj: z.string().min(11).max(18),
  razao_social: z.string().min(1),
  nome_fantasia: z.string().optional().transform(v => v === '' ? undefined : v),
  inscricao_estadual: z.string().optional().transform(v => v === '' ? undefined : v),
  email: z.string().email().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  telefone: z.string().optional().transform(v => v === '' ? undefined : v),
  telefone2: z.string().optional().transform(v => v === '' ? undefined : v),
  contato_financeiro: z.string().optional().transform(v => v === '' ? undefined : v),
  telefone_financeiro: z.string().optional().transform(v => v === '' ? undefined : v),
  cep: z.string().optional().transform(v => v === '' ? undefined : v),
  endereco: z.string().optional().transform(v => v === '' ? undefined : v),
  numero: z.string().optional().transform(v => v === '' ? undefined : v),
  complemento: z.string().optional().transform(v => v === '' ? undefined : v),
  bairro: z.string().optional().transform(v => v === '' ? undefined : v),
  cidade: z.string().optional().transform(v => v === '' ? undefined : v),
  estado: z.string().optional().transform(v => v === '' ? undefined : v),
  limite_credito: z.coerce.number().min(0).default(0),
  status_credito: z.enum(['bom', 'regular', 'bloqueado']).default('bom'),
  observacoes: z.string().optional().transform(v => v === '' ? undefined : v),
});

// GET /api/clientes
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { search, status_credito } = req.query;

    let query = supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('razao_social');

    if (search) {
      query = query.or(`razao_social.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,nome_fantasia.ilike.%${search}%`);
    }
    if (status_credito) query = query.eq('status_credito', status_credito as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// GET /api/clientes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const [clienteResult, contratosResult, parcelasResult] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).eq('empresa_id', empresa_id).single(),
      supabase.from('contratos').select('*, contrato_itens(*, maquinas(nome, modelo))').eq('cliente_id', id).eq('empresa_id', empresa_id).order('created_at', { ascending: false }),
      supabase.from('parcelas').select('*').eq('cliente_id', id).eq('empresa_id', empresa_id).order('data_vencimento', { ascending: false }).limit(50),
    ]);

    if (!clienteResult.data) return res.status(404).json({ error: 'Cliente nÃ£o encontrado' });

    const totalDevido = parcelasResult.data?.filter(p => p.status === 'pendente' || p.status === 'vencido').reduce((s, p) => s + p.valor, 0) || 0;
    const totalPago = parcelasResult.data?.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor_pago || p.valor), 0) || 0;
    const inadimplencia = parcelasResult.data?.filter(p => p.status === 'vencido').reduce((s, p) => s + p.valor, 0) || 0;

    res.json({
      ...clienteResult.data,
      contratos: contratosResult.data || [],
      parcelas: parcelasResult.data || [],
      financeiro: { total_devido: totalDevido, total_pago: totalPago, inadimplencia },
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

// POST /api/clientes
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = clienteSchema.parse(req.body);

    // Verificar CPF/CNPJ duplicado
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('cpf_cnpj', body.cpf_cnpj)
      .eq('ativo', true)
      .single();

    if (existente) return res.status(409).json({ error: 'Cliente com este CPF/CNPJ jÃ¡ cadastrado' });

    const { data, error } = await supabase.from('clientes').insert({ ...body, empresa_id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = clienteSchema.partial().parse(req.body);

    const { data, error } = await supabase.from('clientes').update(body).eq('id', id).eq('empresa_id', empresa_id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cliente nÃ£o encontrado' });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;
    res.json({ message: 'Cliente removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover cliente' });
  }
});

export default router;
