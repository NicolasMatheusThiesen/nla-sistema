import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

interface NFeProduto {
  nome: string;
  qtd: string;
  vlrUnit: number;
  vlrTotal: number;
}

interface NFeData {
  numero: string;
  chaveAcesso: string;
  tipo: 'entrada' | 'saida';
  dataEmissao: string;
  emitenteNome: string;
  emitenteCnpj: string;
  destinatarioNome: string;
  destinatarioCnpj: string;
  valorTotal: number;
  produtos: NFeProduto[];
}

const importSchema = z.object({
  xml: z.string().min(10, 'XML inválido'),
  cliente_id: z.string().uuid().optional(),
  maquina_id: z.string().uuid().optional(),
  contrato_id: z.string().uuid().optional(),
  tipo_override: z.enum(['entrada', 'saida']).optional(),
});

function parseNFeXml(xmlStr: string): NFeData {
  // Parse simples via regex/string — funciona para NF-e padrão SEFAZ
  const get = (tag: string) => {
    const match = xmlStr.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'));
    return match ? match[1].trim() : '';
  };

  const numero = get('nNF');
  const chaveAcesso = (() => {
    const m = xmlStr.match(/Id="NFe(\d{44})"/i);
    return m ? m[1] : '';
  })();
  const tpNF = get('tpNF'); // 0=entrada, 1=saida
  const dhEmi = get('dhEmi') || get('dEmi');
  const dataEmissao = dhEmi ? dhEmi.split('T')[0] : '';

  // Emitente: bloco <emit>
  const emitBlock = xmlStr.match(/<emit>([\s\S]*?)<\/emit>/i)?.[1] || '';
  const getIn = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'));
    return m ? m[1].trim() : '';
  };
  const emitenteNome = getIn(emitBlock, 'xNome');
  const emitenteCnpj = getIn(emitBlock, 'CNPJ') || getIn(emitBlock, 'CPF');

  // Destinatário: bloco <dest>
  const destBlock = xmlStr.match(/<dest>([\s\S]*?)<\/dest>/i)?.[1] || '';
  const destinatarioNome = getIn(destBlock, 'xNome');
  const destinatarioCnpj = getIn(destBlock, 'CNPJ') || getIn(destBlock, 'CPF');

  // Valor total
  const valorTotal = parseFloat(get('vNF') || '0');

  // Produtos: blocos <det>
  const detMatches = [...xmlStr.matchAll(/<det\b[^>]*>([\s\S]*?)<\/det>/gi)];
  const produtos: NFeProduto[] = detMatches.map(m => {
    const det = m[1];
    return {
      nome: getIn(det, 'xProd'),
      qtd: getIn(det, 'qCom'),
      vlrUnit: parseFloat(getIn(det, 'vUnCom') || '0'),
      vlrTotal: parseFloat(getIn(det, 'vProd') || '0'),
    };
  });

  if (!numero || !valorTotal) {
    throw new Error('Arquivo não é uma NF-e válida ou está incompleto');
  }

  return {
    numero,
    chaveAcesso,
    tipo: tpNF === '1' ? 'saida' : 'entrada',
    dataEmissao,
    emitenteNome,
    emitenteCnpj,
    destinatarioNome,
    destinatarioCnpj,
    valorTotal,
    produtos,
  };
}

// POST /api/nfe/parse — apenas faz parse do XML e devolve dados para preview (não salva)
router.post('/parse', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { xml } = req.body;
    if (!xml) return res.status(400).json({ error: 'XML não informado' });

    const nfe = parseNFeXml(xml);

    // Tentar encontrar cliente pelo CNPJ automaticamente
    const { empresa_id } = req.user!;
    const cnpjBusca = nfe.tipo === 'saida' ? nfe.destinatarioCnpj : nfe.emitenteCnpj;
    const cnpjLimpo = cnpjBusca.replace(/\D/g, '');

    let clienteSugerido = null;
    if (cnpjLimpo) {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, razao_social, cpf_cnpj')
        .eq('empresa_id', empresa_id)
        .ilike('cpf_cnpj', `%${cnpjLimpo.slice(-8)}%`)
        .limit(1);
      clienteSugerido = clientes?.[0] || null;
    }

    res.json({ ...nfe, cliente_sugerido: clienteSugerido });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao processar XML' });
  }
});

// POST /api/nfe/importar — salva NF-e e cria lançamento financeiro
router.post('/importar', authenticate, requireRole('admin', 'financeiro', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = importSchema.parse(req.body);

    const nfe = parseNFeXml(body.xml);
    const tipo = body.tipo_override || nfe.tipo;
    const tipoLancamento = tipo === 'saida' ? 'receita' : 'despesa';

    // Criar lançamento financeiro
    const { data: lancamento, error: lancErr } = await supabase
      .from('lancamentos')
      .insert({
        empresa_id,
        tipo: tipoLancamento,
        descricao: `NF-e nº${nfe.numero} — ${tipo === 'saida' ? nfe.destinatarioNome : nfe.emitenteNome}`,
        valor: nfe.valorTotal,
        data_competencia: nfe.dataEmissao || new Date().toISOString().split('T')[0],
        status: 'pago',
        data_pagamento: nfe.dataEmissao || new Date().toISOString().split('T')[0],
        cliente_id: body.cliente_id || null,
        maquina_id: body.maquina_id || null,
        observacoes: `Importado via NF-e. Emitente: ${nfe.emitenteNome} (${nfe.emitenteCnpj}). Dest: ${nfe.destinatarioNome} (${nfe.destinatarioCnpj})`,
      })
      .select()
      .single();

    if (lancErr) throw lancErr;

    // Registrar NF-e na tabela de rastreabilidade
    await supabase.from('nfes').insert({
      empresa_id,
      numero: nfe.numero,
      chave_acesso: nfe.chaveAcesso || null,
      tipo,
      data_emissao: nfe.dataEmissao,
      emitente_nome: nfe.emitenteNome,
      emitente_cnpj: nfe.emitenteCnpj,
      destinatario_nome: nfe.destinatarioNome,
      destinatario_cnpj: nfe.destinatarioCnpj,
      valor_total: nfe.valorTotal,
      xml_raw: body.xml.length < 100000 ? body.xml : null,
      lancamento_id: lancamento.id,
      cliente_id: body.cliente_id || null,
      maquina_id: body.maquina_id || null,
      contrato_id: body.contrato_id || null,
    });

    res.status(201).json({
      message: `NF-e ${nfe.numero} importada como ${tipoLancamento}`,
      lancamento,
      nfe: { numero: nfe.numero, tipo, valorTotal: nfe.valorTotal },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: err.message || 'Erro ao importar NF-e' });
  }
});

// GET /api/nfe — lista NF-es importadas
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { data, error } = await supabase
      .from('nfes')
      .select('*, clientes(razao_social), maquinas(nome), contratos(numero)')
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar NF-es' });
  }
});

export default router;
