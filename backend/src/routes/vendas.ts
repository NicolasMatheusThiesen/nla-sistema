import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { calculateComissao } from '../services/financeiro.service';

const router = Router();

const materialVendaSchema = z.object({
  material_id: z.string().uuid(),
  quantidade: z.coerce.number().positive(),
  valor_unitario: z.coerce.number().min(0),
  valor_total: z.coerce.number().min(0),
});

const vendaSchema = z.object({
  maquina_id: z.string().uuid().optional().nullable().transform(v => v === '' ? null : v),
  cliente_id: z.string().uuid(),
  valor_venda: z.coerce.number().min(0),
  valor_custo: z.coerce.number().min(0).default(0),
  forma_pagamento: z.enum(['avista', 'parcelado', 'financiado']),
  numero_parcelas: z.coerce.number().int().min(1).default(1),
  data_venda: z.string(),
  observacoes: z.string().optional().transform(v => v === '' ? undefined : v),
  // Campos de comissÃ£o
  vendedor_id: z.string().uuid().optional().nullable().transform(v => v === '' ? null : v),
  percentual_comissao: z.coerce.number().min(0).max(100).default(0),
  tipo_comissao: z.enum(['percentual', 'fixo']).default('percentual'),
  valor_comissao: z.coerce.number().min(0).default(0),
  // Materiais (Produtos)
  materiais: z.array(materialVendaSchema).optional().default([]),
});

// GET /api/vendas
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { data, error } = await supabase
      .from('vendas')
      .select('*, maquinas(nome, modelo, tipo), clientes(razao_social), vendedores(nome), venda_materiais(*, materiais(nome))')
      .eq('empresa_id', empresa_id)
      .order('data_venda', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar vendas' });
  }
});

// GET /api/vendas/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('vendas')
      .select('*, venda_materiais(*, materiais(*))')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Venda nÃ£o encontrada' });
    
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

// POST /api/vendas
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = vendaSchema.parse(req.body);

    let custoMaquina = 0;

    // Verificar mÃ¡quina (opcional agora)
    if (body.maquina_id) {
      const { data: maquina } = await supabase.from('maquinas').select('status, valor_aquisicao').eq('id', body.maquina_id).eq('empresa_id', empresa_id).single();
      if (!maquina) return res.status(404).json({ error: 'MÃ¡quina nÃ£o encontrada' });
      if (maquina.status === 'locada') return res.status(400).json({ error: 'MÃ¡quina estÃ¡ locada e nÃ£o pode ser vendida' });
      custoMaquina = maquina.valor_aquisicao;
    }

    // Calcular valor da comissÃ£o
    const valor_comissao = calculateComissao({
      tipoComissao: body.tipo_comissao,
      valorMensal: body.valor_venda,
      percentualComissao: body.percentual_comissao,
      valorComissao: body.valor_comissao,
    });

    const materiais = body.materiais;
    delete (body as any).materiais; // Removemos do body da venda para o insert

    const { data: venda, error } = await supabase
      .from('vendas')
      .insert({
        ...body,
        empresa_id,
        valor_custo: body.valor_custo || custoMaquina,
        valor_comissao,
        tipo_comissao: body.tipo_comissao,
      })
      .select()
      .single();

    if (error) throw error;

    // Marcar mÃ¡quina como vendida se houver
    if (body.maquina_id) {
      await supabase.from('maquinas').update({ status: 'vendida', ativo: false }).eq('id', body.maquina_id);
    }

    // Inserir materiais da venda se houver
    if (materiais && materiais.length > 0) {
      const inserts = materiais.map(m => ({
        venda_id: venda.id,
        material_id: m.material_id,
        quantidade: m.quantidade,
        valor_unitario: m.valor_unitario,
        valor_total: m.valor_total,
      }));
      await supabase.from('venda_materiais').insert(inserts);

      // Descontar do estoque (opcional, pode ser feito depois ou via trigger)
      for (const m of materiais) {
        // busca qtd atual (simplificado)
        const { data: matData } = await supabase.from('materiais').select('quantidade_estoque').eq('id', m.material_id).single();
        if (matData) {
          await supabase.from('materiais').update({ quantidade_estoque: matData.quantidade_estoque - m.quantidade }).eq('id', m.material_id);
        }
      }
    }

    // Criar lanÃ§amento de receita
    await supabase.from('lancamentos').insert({
      empresa_id,
      tipo: 'receita',
      descricao: body.maquina_id ? `Venda de equipamento e/ou produtos` : `Venda de produtos`,
      valor: body.valor_venda,
      data_competencia: body.data_venda,
      status: 'pago',
      data_pagamento: body.data_venda,
      maquina_id: body.maquina_id || null,
      cliente_id: body.cliente_id,
    });

    res.status(201).json(venda);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao registrar venda' });
  }
});

// PUT /api/vendas/:id (EdiÃ§Ã£o parcial)
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = vendaSchema.partial().parse(req.body);

    const materiais = body.materiais;
    delete (body as any).materiais;

    // Recalcular comissÃ£o se percentual, tipo ou valor_venda mudaram
    if (body.valor_venda !== undefined || body.percentual_comissao !== undefined || body.tipo_comissao !== undefined || body.valor_comissao !== undefined) {
       const { data: current } = await supabase.from('vendas').select('*').eq('id', id).single();
       if (current) {
         const novoValor = body.valor_venda ?? current.valor_venda;
         const novoPercentual = body.percentual_comissao ?? current.percentual_comissao;
         const novoTipo = body.tipo_comissao ?? current.tipo_comissao ?? 'percentual';
         const novoValorComissao = body.valor_comissao ?? current.valor_comissao ?? 0;
         (body as any).valor_comissao = calculateComissao({
           tipoComissao: novoTipo,
           valorMensal: novoValor,
           percentualComissao: novoPercentual,
           valorComissao: novoValorComissao,
         });
         (body as any).tipo_comissao = novoTipo;
       }
    }

    const { data: venda, error } = await supabase
      .from('vendas')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!venda) return res.status(404).json({ error: 'Venda nÃ£o encontrada' });

    // Atualizar materiais (simplificado: apagar tudo e recriar)
    if (materiais !== undefined) {
      await supabase.from('venda_materiais').delete().eq('venda_id', id);
      if (materiais.length > 0) {
        const inserts = materiais.map(m => ({
          venda_id: id,
          material_id: m.material_id,
          quantidade: m.quantidade,
          valor_unitario: m.valor_unitario,
          valor_total: m.valor_total,
        }));
        await supabase.from('venda_materiais').insert(inserts);
      }
    }

    res.json(venda);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

// DELETE /api/vendas/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { error } = await supabase.from('vendas').delete().eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;
    
    // (Opcional: Voltar status da mÃ¡quina e estornar estoque)

    res.json({ message: 'Venda removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover venda' });
  }
});

export default router;
