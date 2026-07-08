import PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#1e3a5f',
  accent: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  text: '#1f2937',
  muted: '#6b7280',
  light: '#f3f4f6',
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function drawHeader(doc: PDFKit.PDFDocument, empresa: { razao_social?: string; cnpj?: string }, titulo: string) {
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(empresa?.razao_social || 'Empresa', 40, 25);
  doc.fontSize(10).font('Helvetica').text(titulo, 40, 50);
  if (empresa?.cnpj) doc.text(`CNPJ: ${empresa.cnpj}`, 40, 62);
  doc.fillColor(COLORS.text).moveDown(2);
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], widths: number[], rows: string[][], startY: number) {
  const startX = 40;
  let y = startY;

  // Header
  doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), 20).fill(COLORS.accent);
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(h, x + 4, y + 6, { width: widths[i] - 8 });
    x += widths[i];
  });
  y += 20;

  // Rows
  rows.forEach((row, rowIdx) => {
    if (y > doc.page.height - 80) { doc.addPage(); y = 60; }
    const bg = rowIdx % 2 === 0 ? 'white' : COLORS.light;
    doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), 18).fill(bg);
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(COLORS.text).fontSize(8).font('Helvetica').text(String(cell || '-'), x + 4, y + 5, { width: widths[i] - 8 });
      x += widths[i];
    });
    y += 18;
  });

  return y;
}

export async function generateFluxoCaixaPDF(dados: {
  empresa: { razao_social?: string; cnpj?: string } | null;
  periodo: { inicio: string; fim: string };
  parcelas: Array<Record<string, unknown>>;
  lancamentos: Array<Record<string, unknown>>;
  totais: { receitas: number; despesas: number; inadimplencia: number };
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, dados.empresa || {}, `Fluxo de Caixa — ${dados.periodo.inicio} a ${dados.periodo.fim}`);
    doc.y = 100;

    // KPI boxes
    const kpis = [
      { label: 'Total Entradas', valor: dados.totais.receitas, color: COLORS.success },
      { label: 'Total Saídas', valor: dados.totais.despesas, color: COLORS.danger },
      { label: 'Saldo', valor: dados.totais.receitas - dados.totais.despesas, color: COLORS.accent },
      { label: 'Inadimplência', valor: dados.totais.inadimplencia, color: COLORS.warning },
    ];

    let kpiX = 40;
    kpis.forEach(kpi => {
      doc.rect(kpiX, 100, 120, 50).fill(kpi.color);
      doc.fillColor('white').fontSize(8).font('Helvetica').text(kpi.label, kpiX + 6, 106);
      doc.fontSize(12).font('Helvetica-Bold').text(formatMoney(kpi.valor), kpiX + 6, 120, { width: 108 });
      kpiX += 128;
    });

    doc.y = 165;
    doc.fillColor(COLORS.text).fontSize(12).font('Helvetica-Bold').text('Parcelas de Locação', 40, 165);
    doc.moveDown(0.3);

    const parcelaRows = dados.parcelas.slice(0, 100).map(p => [
      formatDate(p.data_vencimento as string),
      (p.clientes as { razao_social?: string })?.razao_social || '-',
      (p.contratos as { numero?: string })?.numero || '-',
      p.status as string,
      formatMoney(p.status === 'pago' ? (p.valor_pago as number || p.valor as number) : p.valor as number),
    ]);

    const y1 = drawTable(doc, ['Vencimento', 'Cliente', 'Contrato', 'Status', 'Valor'], [80, 160, 80, 70, 80], parcelaRows, doc.y);
    doc.y = y1 + 15;

    doc.fontSize(12).font('Helvetica-Bold').text('Lançamentos Avulsos', 40, doc.y);
    doc.moveDown(0.3);

    const lancRows = dados.lancamentos.slice(0, 100).map(l => [
      formatDate(l.data_competencia as string),
      l.tipo as string,
      (l.categorias as { nome?: string })?.nome || '-',
      l.descricao as string,
      l.status as string,
      formatMoney(l.valor as number),
    ]);

    drawTable(doc, ['Data', 'Tipo', 'Categoria', 'Descrição', 'Status', 'Valor'], [70, 55, 80, 130, 60, 75], lancRows, doc.y);

    // Footer
    const pageCount = (doc as unknown as { _pageBuffer: unknown[] })._pageBuffer?.length || 1;
    doc.fontSize(8).fillColor(COLORS.muted).text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — Página ${pageCount}`, 40, doc.page.height - 30);

    doc.end();
  });
}

export async function generateRentabilidadePDF(dados: {
  empresa: { razao_social?: string; cnpj?: string } | null;
  periodo_meses: number;
  maquinas: Array<Record<string, unknown>>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, dados.empresa || {}, `Rentabilidade por Máquina — ${dados.periodo_meses} meses`);
    doc.y = 100;

    const rows = dados.maquinas.map(m => [
      m.nome as string,
      m.tipo as string,
      formatMoney(m.valor_aquisicao as number),
      formatMoney(m.receita_estimada as number),
      formatMoney(m.custo_total as number),
      formatMoney(m.lucro_liquido as number),
      `${((m.roi_percentual as number) || 0).toFixed(1)}%`,
      m.status as string,
    ]);

    drawTable(doc,
      ['Máquina', 'Tipo', 'Valor Aq.', 'Receita Est.', 'Custo Total', 'Lucro Líq.', 'ROI %', 'Status'],
      [150, 80, 80, 90, 80, 80, 60, 80],
      rows,
      doc.y
    );

    doc.end();
  });
}

export async function generateInadimplenciaPDF(dados: {
  empresa: { razao_social?: string; cnpj?: string } | null;
  total_inadimplencia: number;
  clientes_inadimplentes: Array<{ cliente: unknown; parcelas: unknown[]; total: number }>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, dados.empresa || {}, 'Relatório de Inadimplência');
    doc.y = 100;

    doc.fontSize(14).fillColor(COLORS.danger).font('Helvetica-Bold')
      .text(`Total em Aberto: ${formatMoney(dados.total_inadimplencia)}`, 40, 100);
    doc.y = 125;

    dados.clientes_inadimplentes.forEach(ci => {
      const cliente = ci.cliente as { razao_social?: string; telefone?: string };
      doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold').text(`${cliente?.razao_social || '-'} — ${formatMoney(ci.total)}`, 40, doc.y);
      if (cliente?.telefone) doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica').text(`Tel: ${cliente.telefone}`, 40);

      const parcelaRows = (ci.parcelas as Array<Record<string, unknown>>).map(p => [
        formatDate(p.data_vencimento as string),
        (p.contratos as { numero?: string })?.numero || '-',
        formatMoney(p.valor as number),
      ]);
      if (doc.y > doc.page.height - 100) doc.addPage();
      drawTable(doc, ['Vencimento', 'Contrato', 'Valor'], [100, 100, 80], parcelaRows, doc.y + 5);
      doc.moveDown(1.5);
    });

    doc.end();
  });
}
