import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

function generateNumeroOS(): string {
  const now = new Date();
  return `OS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const osSchema = z.object({
  cliente_id: z.string().uuid(),
  maquina_id: z.string().uuid().nullish().or(z.literal('')),
  maquina_terceiro_descricao: z.string().nullish().or(z.literal('')),
  status: z.enum(['aberta', 'em_andamento', 'concluida', 'cancelada']).default('aberta'),
  data_abertura: z.string(),
  data_conclusao: z.string().nullish().or(z.literal('')),
  descricao: z.string().nullish().or(z.literal('')),
  observacoes: z.string().nullish().or(z.literal('')),
  servicos: z.array(z.object({
    servico_id: z.string().uuid(),
    quantidade: z.coerce.number().positive().default(1),
    valor_unitario: z.coerce.number().min(0),
    valor_total: z.coerce.number().min(0),
  })).default([]),
  materiais: z.array(z.object({
    material_id: z.string().uuid(),
    quantidade: z.coerce.number().positive(),
    valor_unitario: z.coerce.number().min(0),
    valor_total: z.coerce.number().min(0),
  })).default([]),
});

// GET /api/ordens-servico
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { status, cliente_id, search } = req.query;

    let query = supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes(id, razao_social),
        maquinas(id, nome, modelo),
        os_servicos(*, servicos(nome)),
        os_materiais(*, materiais(nome))
      `)
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status as string);
    if (cliente_id) query = query.eq('cliente_id', cliente_id as string);
    if (search) query = query.ilike('numero', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar ordens de serviÃ§o' });
  }
});

// GET /api/ordens-servico/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes(*),
        maquinas(id, nome, modelo, tipo),
        os_servicos(*, servicos(nome, valor_padrao)),
        os_materiais(*, materiais(nome, unidade_medida))
      `)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'OS nÃ£o encontrada' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar OS' });
  }
});

// POST /api/ordens-servico
router.post('/', authenticate, requireRole('admin', 'operacional', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = osSchema.parse(req.body);

    if (body.maquina_id === '') body.maquina_id = null;
    if (body.data_conclusao === '') body.data_conclusao = null;

    const valorTotal = [
      ...body.servicos.map(s => s.valor_total),
      ...body.materiais.map(m => m.valor_total),
    ].reduce((sum, v) => sum + v, 0);

    const numero = generateNumeroOS();

    const { data: os, error: osError } = await supabase
      .from('ordens_servico')
      .insert({
        empresa_id,
        numero,
        cliente_id: body.cliente_id,
        maquina_id: body.maquina_id || null,
        maquina_terceiro_descricao: body.maquina_terceiro_descricao,
        status: body.status,
        data_abertura: body.data_abertura,
        data_conclusao: body.data_conclusao || null,
        descricao: body.descricao,
        observacoes: body.observacoes,
        valor_total: valorTotal,
      })
      .select()
      .single();

    if (osError || !os) throw osError;

    if (body.servicos.length > 0) {
      await supabase.from('os_servicos').insert(body.servicos.map(s => ({ os_id: os.id, ...s })));
    }
    if (body.materiais.length > 0) {
      await supabase.from('os_materiais').insert(body.materiais.map(m => ({ os_id: os.id, ...m })));
    }

    // Se concluÃ­da, gerar lanÃ§amento de receita
    let lancamento_id: string | null = null;
    if (body.status === 'concluida' && valorTotal > 0) {
      const { data: lanc } = await supabase
        .from('lancamentos')
        .insert({
          empresa_id,
          tipo: 'receita',
          descricao: `OS ${numero} â€” ${body.descricao || 'Ordem de ServiÃ§o'}`,
          valor: valorTotal,
          data_competencia: body.data_conclusao || body.data_abertura,
          status: 'pendente',
          cliente_id: body.cliente_id,
          maquina_id: body.maquina_id || null,
        })
        .select('id')
        .single();

      if (lanc) {
        lancamento_id = lanc.id;
        await supabase.from('ordens_servico').update({ lancamento_id }).eq('id', os.id);
      }
    }

    res.status(201).json({ ...os, lancamento_id });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    res.status(500).json({ error: 'Erro ao criar OS' });
  }
});

// PUT /api/ordens-servico/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = osSchema.partial().parse(req.body);

    if (body.maquina_id === '') body.maquina_id = null;
    if (body.data_conclusao === '') body.data_conclusao = null;

    const valorTotal = body.servicos && body.materiais
      ? [...body.servicos.map(s => s.valor_total), ...body.materiais.map(m => m.valor_total)].reduce((sum, v) => sum + v, 0)
      : undefined;

    const { servicos, materiais, ...osData } = body;

    const { data, error } = await supabase
      .from('ordens_servico')
      .update({ ...osData, ...(valorTotal !== undefined ? { valor_total: valorTotal } : {}) })
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;

    if (servicos !== undefined) {
      await supabase.from('os_servicos').delete().eq('os_id', id);
      if (servicos.length > 0) await supabase.from('os_servicos').insert(servicos.map(s => ({ os_id: id, ...s })));
    }
    if (materiais !== undefined) {
      await supabase.from('os_materiais').delete().eq('os_id', id);
      if (materiais.length > 0) await supabase.from('os_materiais').insert(materiais.map(m => ({ os_id: id, ...m })));
    }

    // Se foi concluÃ­da agora e nÃ£o tem lanÃ§amento, criar
    if (body.status === 'concluida' && data && !data.lancamento_id && valorTotal && valorTotal > 0) {
      const { data: current } = await supabase.from('ordens_servico').select('*').eq('id', id).single();
      if (current && !current.lancamento_id) {
        const { data: lanc } = await supabase.from('lancamentos').insert({
          empresa_id,
          tipo: 'receita',
          descricao: `OS ${current.numero} â€” ${current.descricao || 'Ordem de ServiÃ§o'}`,
          valor: valorTotal,
          data_competencia: body.data_conclusao || current.data_abertura,
          status: 'pendente',
          cliente_id: current.cliente_id,
          maquina_id: current.maquina_id || null,
        }).select('id').single();
        if (lanc) await supabase.from('ordens_servico').update({ lancamento_id: lanc.id }).eq('id', id);
      }
    }

    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    res.status(500).json({ error: 'Erro ao atualizar OS' });
  }
});

// DELETE /api/ordens-servico/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    
    // Cancelar lanÃ§amento vinculado se houver
    const { data: os } = await supabase.from('ordens_servico').select('lancamento_id').eq('id', id).single();
    if (os?.lancamento_id) {
      await supabase.from('lancamentos').update({ status: 'cancelado' }).eq('id', os.lancamento_id);
    }
    
    const { error } = await supabase.from('ordens_servico').delete().eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;
    res.json({ message: 'OS removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover OS' });
  }
});

export default router;
