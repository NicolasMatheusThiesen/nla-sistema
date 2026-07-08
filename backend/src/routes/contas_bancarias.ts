import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const contaSchema = z.object({
  nome: z.string().min(1),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  saldo_inicial: z.coerce.number().default(0),
  saldo_atual: z.coerce.number().default(0),
  ativo: z.boolean().default(true)
});

// GET /api/contas-bancarias
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contas bancÃ¡rias' });
  }
});

// POST /api/contas-bancarias
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = contaSchema.parse(req.body);

    // Saldo atual comeÃ§a igual ao inicial
    if (body.saldo_inicial && !body.saldo_atual) {
      body.saldo_atual = body.saldo_inicial;
    }

    const { data, error } = await supabase
      .from('contas_bancarias')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erro ao criar conta bancÃ¡ria' });
  }
});

// PUT /api/contas-bancarias/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = contaSchema.parse(req.body);

    const { data, error } = await supabase
      .from('contas_bancarias')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Conta nÃ£o encontrada' });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erro ao atualizar conta bancÃ¡ria' });
  }
});

// DELETE /api/contas-bancarias/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    // Verificar se tem lanÃ§amentos atrelados (nÃ£o pode deletar se tiver)
    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('id')
      .eq('conta_bancaria_id', id)
      .limit(1);

    if (lancamentos && lancamentos.length > 0) {
      return res.status(400).json({ error: 'NÃ£o Ã© possÃ­vel excluir a conta bancÃ¡ria pois existem lanÃ§amentos vinculados a ela.' });
    }

    const { error } = await supabase
      .from('contas_bancarias')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    res.json({ message: 'Conta bancÃ¡ria removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover conta bancÃ¡ria' });
  }
});

export default router;
