import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import PDFDocumentKit from 'pdfkit';
import { PDFDocument as PDFLib, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const router = Router();

const EMPRESA = {
  nome: 'NLA LOCAÇÕES LTDA',
  cnpj: '54.533.178/0001-27',
  ie: '262.855.208',
  endereco: 'Rua Wilhelmina Witthoeft, 28 — Água Verde',
  cep: '89.042-090',
  cidade: 'Blumenau — SC',
  email: 'nlalocacoes@gmail.com',
  telefone: '',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
}
function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function extenso(n: number) {
  // Simplified: just returns the formatted value
  return fmtMoney(n);
}

// ── FATURA DE LOCAÇÃO ─────────────────────────────────────────
// GET /api/documentos/fatura/:contratoId?competencia=2026-04
router.get('/fatura/:contratoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { contratoId } = req.params;
    const competencia = (req.query.competencia as string) || format(new Date(), 'yyyy-MM');
    const numFatura = (req.query.num as string) || String(Math.floor(Math.random() * 900 + 100));

    const { data: contrato } = await supabase
      .from('contratos')
      .select(`*, clientes(*), contrato_itens(*, maquinas(*))`)
      .eq('id', contratoId)
      .eq('empresa_id', empresa_id)
      .single();

    if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
    const cliente = contrato.clientes as any;

    const templatePath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '..', 'templates', 'fatura_base.pdf')
      : path.join(__dirname, '..', '..', 'templates', 'fatura_base.pdf');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Template da fatura não encontrado no servidor.' });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFLib.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Aqui desenhamos os dados sobre o template.
    // As coordenadas (x, y) precisam ser ajustadas dependendo do seu PDF base.
    // No pdf-lib a origem (0,0) é no canto inferior esquerdo.
    firstPage.drawText(cliente?.razao_social || '', { x: 50, y: 700, size: 12, color: rgb(0,0,0) });
    firstPage.drawText(cliente?.cpf_cnpj || '', { x: 50, y: 680, size: 12, color: rgb(0,0,0) });
    firstPage.drawText(fmtMoney(contrato.valor_mensal), { x: 450, y: 700, size: 14, color: rgb(0,0,0) });
    firstPage.drawText(`Fatura N.º ${numFatura}`, { x: 450, y: 720, size: 12 });
    firstPage.drawText(`Competência: ${competencia}`, { x: 50, y: 660, size: 10 });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fatura-${numFatura}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar fatura' });
  }
});

// ── CONTRATO DE LOCAÇÃO ───────────────────────────────────────
// GET /api/documentos/contrato/:contratoId
router.get('/contrato/:contratoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { contratoId } = req.params;

    const { data: contrato } = await supabase
      .from('contratos')
      .select(`*, clientes(*), contrato_itens(*, maquinas(*))`)
      .eq('id', contratoId)
      .eq('empresa_id', empresa_id)
      .single();

    if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado' });
    const cliente = contrato.clientes as any;
    const itens = (contrato.contrato_itens as any[]) || [];
    const maquina = itens[0]?.maquinas;

    const templatePath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '..', 'templates', 'contrato_base.pdf')
      : path.join(__dirname, '..', '..', 'templates', 'contrato_base.pdf');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Template do contrato não encontrado no servidor.' });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFLib.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Desenhando os dados por cima do contrato
    // Ajuste as posições de acordo com os campos em branco do PDF base
    firstPage.drawText(cliente?.razao_social || '', { x: 100, y: 700, size: 10, color: rgb(0,0,0) });
    firstPage.drawText(cliente?.cpf_cnpj || '', { x: 100, y: 685, size: 10, color: rgb(0,0,0) });
    firstPage.drawText(fmtDate(contrato.data_inicio), { x: 100, y: 670, size: 10, color: rgb(0,0,0) });
    
    if (maquina) {
      firstPage.drawText(`Equip: ${maquina.nome} | Série: ${maquina.numero_serie || ''}`, { x: 100, y: 655, size: 10, color: rgb(0,0,0) });
    }
    
    firstPage.drawText(fmtMoney(contrato.valor_mensal), { x: 400, y: 655, size: 12, color: rgb(0,0,0) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-${contrato.numero}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar contrato' });
  }
});

// ── RECIBO DE VENDA ────────────────────────────────────────────
// GET /api/documentos/venda/:vendaId
router.get('/venda/:vendaId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { vendaId } = req.params;

    const { data: venda } = await supabase
      .from('vendas')
      .select('*, clientes(*), maquinas(*)')
      .eq('id', vendaId)
      .eq('empresa_id', empresa_id)
      .single();

    if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });

    const cliente = venda.clientes as any;
    const maquina = venda.maquinas as any;

    const doc = new PDFDocumentKit({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-venda-${venda.id.slice(0, 8)}.pdf"`);
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
      .text('RECIBO DE VENDA DE EQUIPAMENTO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text(EMPRESA.nome, { align: 'center' })
      .text(`CNPJ: ${EMPRESA.cnpj}`, { align: 'center' });
    doc.moveDown(1.5);

    // Dados
    doc.rect(50, doc.y, 495, 1).fill('#000');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
      .text('DADOS DO COMPRADOR');
    doc.font('Helvetica').text(`Razão Social: ${cliente?.razao_social || '—'}`);
    doc.text(`CNPJ/CPF: ${cliente?.cpf_cnpj || '—'}`);
    doc.text(`Endereço: ${cliente?.endereco || '—'} — ${cliente?.cidade || '—'}/${cliente?.estado || ''}`);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').text('DADOS DO EQUIPAMENTO VENDIDO');
    doc.font('Helvetica').text(`Equipamento: ${maquina?.nome || '—'}`);
    if (maquina?.modelo) doc.text(`Modelo: ${maquina.modelo}`);
    if (maquina?.numero_serie) doc.text(`Nº de Série: ${maquina.numero_serie}`);
    if (maquina?.capacidade_kg) doc.text(`Capacidade: ${maquina.capacidade_kg} kg`);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').text('DADOS DA VENDA');
    doc.font('Helvetica').text(`Data da Venda: ${fmtDate(venda.data_venda)}`);
    doc.text(`Forma de Pagamento: ${venda.forma_pagamento === 'avista' ? 'À Vista' : venda.forma_pagamento === 'parcelado' ? `Parcelado (${venda.numero_parcelas}x)` : 'Financiado'}`);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a5276')
      .text(`VALOR TOTAL: ${fmtMoney(venda.valor_venda)}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(10).font('Helvetica').fillColor('#000');
    doc.rect(50, doc.y, 495, 1).fill('#000');
    doc.moveDown(1);

    doc.text('Declaro que recebi o(s) equipamento(s) acima descrito(s) em perfeitas condições de funcionamento, nos termos acordados entre as partes.', { align: 'justify' });
    doc.moveDown(3);

    doc.text(`Blumenau/SC, ${fmtDate(venda.data_venda || new Date().toISOString())}`);
    doc.moveDown(2);

    doc.text('____________________________          ____________________________', { align: 'center' });
    doc.text(`${EMPRESA.nome}            ${cliente?.razao_social || 'COMPRADOR'}`, { align: 'center' });
    doc.text(`CNPJ: ${EMPRESA.cnpj}    CNPJ: ${cliente?.cpf_cnpj || '—'}`, { align: 'center' });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar recibo' });
  }
});

export default router;
