import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const materialManutencaoSchema = z.object({
  material_id: z.string().uuid(),
  quantidade: z.number().positive(),
  valor_unitario: z.number().min(0),
  valor_total: z.number().min(0),
});

const servicoManutencaoSchema = z.object({
  servico_id: z.string().uuid(),
  quantidade: z.number().positive().default(1),
  valor_unitario: z.number().min(0),
  valor_total: z.number().min(0),
});

const manutencaoSchema = z.object({
  is_terceiro: z.boolean().optional().default(false),
  maquina_id: z.string().uuid().optional().nullable().transform(v => v === '' ? null : v),
  cliente_id: z.string().uuid().optional().nullable().transform(v => v === '' ? null : v),
  maquina_terceiro_descricao: z.string().optional().transform(v => v === '' ? null : v),
  
  tipo: z.enum(['preventiva', 'corretiva', 'reforma']),
  fornecedor: z.string().optional().transform(v => v === '' ? undefined : v),
  custo: z.number().min(0).default(0),
  data_inicio: z.string(),
  data_fim: z.string().optional().transform(v => v === '' ? undefined : v),
  descricao: z.string().optional().transform(v => v === '' ? undefined : v),
  pecas_trocadas: z.string().optional().transform(v => v === '' ? undefined : v),
  proxima_manutencao: z.string().optional().transform(v => v === '' ? undefined : v),
  status: z.enum(['agendada', 'em_andamento', 'concluida']).default('concluida'),
  observacoes: z.string().optional().transform(v => v === '' ? undefined : v),
  
  materiais: z.array(materialManutencaoSchema).optional().default([]),
  servicos: z.array(servicoManutencaoSchema).optional().default([]),
});

// GET /api/manutencoes
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { maquina_id, tipo, status, is_terceiro } = req.query;

    let query = supabase
      .from('manutencoes')
      .select('*, maquinas(nome, modelo, tipo), clientes(razao_social), manutencao_materiais(*, materiais(nome)), manutencao_servicos(*, servicos(nome))')
      .eq('empresa_id', empresa_id)
      .order('data_inicio', { ascending: false });

    if (maquina_id) query = query.eq('maquina_id', maquina_id as string);
    if (tipo) query = query.eq('tipo', tipo as string);
    if (status) query = query.eq('status', status as string);
    if (is_terceiro !== undefined) query = query.eq('is_terceiro', is_terceiro === 'true');

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar manutenções' });
  }
});

// GET /api/manutencoes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('manutencoes')
      .select('*, manutencao_materiais(*, materiais(*)), manutencao_servicos(*, servicos(*))')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Manutenção não encontrada' });
    
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar manutenção' });
  }
});

// POST /api/manutencoes
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = manutencaoSchema.parse(req.body);

    const materiais = body.materiais;
    const servicos = body.servicos;
    delete (body as any).materiais;
    delete (body as any).servicos;

    // Se for de máquina interna, gerenciar status da máquina
    if (!body.is_terceiro && body.maquina_id) {
      if (body.status === 'em_andamento' || body.tipo === 'corretiva') {
        await supabase.from('maquinas').update({ status: 'manutencao' }).eq('id', body.maquina_id).eq('empresa_id', empresa_id);
      }
      if (body.status === 'concluida') {
        const { data: maquina } = await supabase.from('maquinas').select('status').eq('id', body.maquina_id).single();
        if (maquina?.status === 'manutencao') {
          await supabase.from('maquinas').update({ status: 'disponivel' }).eq('id', body.maquina_id);
        }
      }
    }

    const { data, error } = await supabase
      .from('manutencoes')
      .insert({ ...body, empresa_id })
      .select('*, maquinas(nome, modelo)')
      .single();

    if (error) throw error;

    // Inserir materiais
    if (materiais && materiais.length > 0) {
      const inserts = materiais.map(m => ({
        manutencao_id: data.id,
        material_id: m.material_id,
        quantidade: m.quantidade,
        valor_unitario: m.valor_unitario,
        valor_total: m.valor_total,
      }));
      await supabase.from('manutencao_materiais').insert(inserts);
      
      // Descontar do estoque se material for de consumo/manutenção
      for (const m of materiais) {
        const { data: matData } = await supabase.from('materiais').select('quantidade_estoque').eq('id', m.material_id).single();
        if (matData) {
          await supabase.from('materiais').update({ quantidade_estoque: matData.quantidade_estoque - m.quantidade }).eq('id', m.material_id);
        }
      }
    }

    // Inserir serviços
    if (servicos && servicos.length > 0) {
      const inserts = servicos.map(s => ({
        manutencao_id: data.id,
        servico_id: s.servico_id,
        quantidade: s.quantidade,
        valor_unitario: s.valor_unitario,
        valor_total: s.valor_total,
      }));
      await supabase.from('manutencao_servicos').insert(inserts);
    }

    // Se for terceiro (OS), criar um lançamento de receita se cobrar
    // if (body.is_terceiro && body.custo > 0 && body.status === 'concluida') {
    //   Poderíamos criar a receita aqui automaticamente ou deixar para o financeiro.
    // }

    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar manutenção' });
  }
});

// PUT /api/manutencoes/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = manutencaoSchema.partial().parse(req.body);

    const materiais = body.materiais;
    const servicos = body.servicos;
    delete (body as any).materiais;
    delete (body as any).servicos;

    const { data, error } = await supabase
      .from('manutencoes')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Manutenção não encontrada' });

    // Atualizar materiais
    if (materiais !== undefined) {
      await supabase.from('manutencao_materiais').delete().eq('manutencao_id', id);
      if (materiais.length > 0) {
        const inserts = materiais.map(m => ({
          manutencao_id: id,
          material_id: m.material_id,
          quantidade: m.quantidade,
          valor_unitario: m.valor_unitario,
          valor_total: m.valor_total,
        }));
        await supabase.from('manutencao_materiais').insert(inserts);
      }
    }

    // Atualizar serviços
    if (servicos !== undefined) {
      await supabase.from('manutencao_servicos').delete().eq('manutencao_id', id);
      if (servicos.length > 0) {
        const inserts = servicos.map(s => ({
          manutencao_id: id,
          servico_id: s.servico_id,
          quantidade: s.quantidade,
          valor_unitario: s.valor_unitario,
          valor_total: s.valor_total,
        }));
        await supabase.from('manutencao_servicos').insert(inserts);
      }
    }

    // Atualizar status da máquina
    if (body.status && data.maquina_id && !data.is_terceiro) {
      if (body.status === 'concluida') {
        const { data: maquina } = await supabase.from('maquinas').select('status').eq('id', data.maquina_id).single();
        if (maquina?.status === 'manutencao') {
          await supabase.from('maquinas').update({ status: 'disponivel' }).eq('id', data.maquina_id);
        }
      } else if (body.status === 'em_andamento') {
        await supabase.from('maquinas').update({ status: 'manutencao' }).eq('id', data.maquina_id);
      }
    }

    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar manutenção' });
  }
});

// DELETE /api/manutencoes/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data: man } = await supabase.from('manutencoes').select('maquina_id, status').eq('id', id).eq('empresa_id', empresa_id).single();
    if (man && man.maquina_id && man.status !== 'concluida') {
       // Libera a máquina
       await supabase.from('maquinas').update({ status: 'disponivel' }).eq('id', man.maquina_id);
    }

    const { error } = await supabase.from('manutencoes').delete().eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;
    
    res.json({ message: 'Manutenção/OS removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover manutenção' });
  }
});

export default router;
