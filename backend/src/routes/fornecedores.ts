import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const fornecedorSchema = z.object({
  tipo_pessoa: z.enum(['PF', 'PJ']),
  cpf_cnpj: z.string().min(11),
  razao_social: z.string().min(2),
  nome_fantasia: z.string().nullish().or(z.literal('')),
  email: z.string().email().nullish().or(z.literal('')),
  telefone: z.string().nullish().or(z.literal('')),
  cep: z.string().nullish().or(z.literal('')),
  endereco: z.string().nullish().or(z.literal('')),
  numero: z.string().nullish().or(z.literal('')),
  complemento: z.string().nullish().or(z.literal('')),
  bairro: z.string().nullish().or(z.literal('')),
  cidade: z.string().nullish().or(z.literal('')),
  estado: z.string().nullish().or(z.literal('')),
  observacoes: z.string().nullish().or(z.literal('')),
  ativo: z.boolean().default(true),
});

// GET /api/fornecedores
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { search, ativo } = req.query;

    let query = supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('razao_social');

    if (search) {
      query = query.or(`razao_social.ilike.%${search}%,cpf_cnpj.ilike.%${search}%`);
    }
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar fornecedores' });
  }
});

// GET /api/fornecedores/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar fornecedor' });
  }
});

// POST /api/fornecedores
router.post('/', authenticate, requireRole('admin', 'financeiro', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = fornecedorSchema.parse(req.body);

    const { data, error } = await supabase
      .from('fornecedores')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar fornecedor' });
  }
});

// PUT /api/fornecedores/:id
router.put('/:id', authenticate, requireRole('admin', 'financeiro', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = fornecedorSchema.partial().parse(req.body);

    const { data, error } = await supabase
      .from('fornecedores')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
  }
});

// DELETE /api/fornecedores/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    // Desativar ao invés de excluir para manter integridade
    const { error } = await supabase
      .from('fornecedores')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    res.json({ message: 'Fornecedor desativado' });
  } catch {
    res.status(500).json({ error: 'Erro ao desativar fornecedor' });
  }
});

export default router;
