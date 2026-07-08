import ExcelJS from 'exceljs';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: {
    bottom: { style: 'thin', color: { argb: 'FF3b82f6' } },
  },
};

export async function generateFluxoCaixaExcel(dados: {
  empresa: { razao_social?: string } | null;
  periodo: { inicio: string; fim: string };
  parcelas: Array<Record<string, unknown>>;
  lancamentos: Array<Record<string, unknown>>;
  totais: { receitas: number; despesas: number; inadimplencia: number };
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = dados.empresa?.razao_social || 'Sistema';
  workbook.created = new Date();

  // Aba 1: Resumo
  const resumo = workbook.addWorksheet('Resumo');
  resumo.columns = [{ width: 25 }, { width: 20 }];
  resumo.addRow(['RELATÓRIO DE FLUXO DE CAIXA']).font = { bold: true, size: 14, color: { argb: 'FF1e3a5f' } };
  resumo.addRow([`Empresa: ${dados.empresa?.razao_social || '-'}`]);
  resumo.addRow([`Período: ${dados.periodo.inicio} a ${dados.periodo.fim}`]);
  resumo.addRow([]);
  resumo.addRow(['RESUMO', '']);
  const headerRow = resumo.lastRow!;
  headerRow.font = { bold: true };
  resumo.addRow(['Total de Entradas', dados.totais.receitas]);
  resumo.addRow(['Total de Saídas', dados.totais.despesas]);
  resumo.addRow(['Saldo', dados.totais.receitas - dados.totais.despesas]);
  resumo.addRow(['Total Inadimplência', dados.totais.inadimplencia]);

  resumo.getColumn(2).numFmt = 'R$ #,##0.00';

  // Aba 2: Parcelas
  const parcelasSheet = workbook.addWorksheet('Parcelas de Locação');
  parcelasSheet.columns = [
    { header: 'Vencimento', key: 'vencimento', width: 15 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'Contrato', key: 'contrato', width: 15 },
    { header: 'Competência', key: 'competencia', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Valor', key: 'valor', width: 15 },
    { header: 'Valor Pago', key: 'valor_pago', width: 15 },
    { header: 'Pagamento', key: 'pagamento', width: 15 },
  ];

  const headerRowParcelas = parcelasSheet.getRow(1);
  headerRowParcelas.eachCell(cell => Object.assign(cell, HEADER_STYLE));

  dados.parcelas.forEach(p => {
    parcelasSheet.addRow({
      vencimento: p.data_vencimento,
      cliente: (p.clientes as { razao_social?: string })?.razao_social || '-',
      contrato: (p.contratos as { numero?: string })?.numero || '-',
      competencia: p.competencia,
      status: p.status,
      valor: p.valor,
      valor_pago: p.valor_pago,
      pagamento: p.data_pagamento,
    });
  });

  parcelasSheet.getColumn('valor').numFmt = 'R$ #,##0.00';
  parcelasSheet.getColumn('valor_pago').numFmt = 'R$ #,##0.00';

  // Aba 3: Lançamentos
  const lancSheet = workbook.addWorksheet('Lançamentos');
  lancSheet.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Descrição', key: 'descricao', width: 35 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Valor', key: 'valor', width: 15 },
  ];

  const headerLanc = lancSheet.getRow(1);
  headerLanc.eachCell(cell => Object.assign(cell, HEADER_STYLE));

  dados.lancamentos.forEach(l => {
    lancSheet.addRow({
      data: l.data_competencia,
      tipo: l.tipo,
      categoria: (l.categorias as { nome?: string })?.nome || '-',
      descricao: l.descricao,
      status: l.status,
      valor: l.valor,
    });
  });

  lancSheet.getColumn('valor').numFmt = 'R$ #,##0.00';

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateRentabilidadeExcel(dados: {
  empresa: { razao_social?: string } | null;
  periodo_meses: number;
  maquinas: Array<Record<string, unknown>>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = dados.empresa?.razao_social || 'Sistema';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Rentabilidade por Máquina');
  sheet.columns = [
    { header: 'Máquina', key: 'nome', width: 25 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Modelo', key: 'modelo', width: 20 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Valor Aquisição', key: 'valor_aquisicao', width: 18 },
    { header: 'Receita Estimada', key: 'receita_estimada', width: 18 },
    { header: 'Custo Manutenção', key: 'custo_manutencao', width: 18 },
    { header: 'Custo Depreciação', key: 'custo_depreciacao', width: 18 },
    { header: 'Custo Total', key: 'custo_total', width: 18 },
    { header: 'Lucro Líquido', key: 'lucro_liquido', width: 18 },
    { header: 'ROI %', key: 'roi_percentual', width: 10 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => Object.assign(cell, HEADER_STYLE));

  dados.maquinas.forEach(m => sheet.addRow(m));

  ['valor_aquisicao', 'receita_estimada', 'custo_manutencao', 'custo_depreciacao', 'custo_total', 'lucro_liquido'].forEach(col => {
    sheet.getColumn(col).numFmt = 'R$ #,##0.00';
  });
  sheet.getColumn('roi_percentual').numFmt = '0.00%';

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
