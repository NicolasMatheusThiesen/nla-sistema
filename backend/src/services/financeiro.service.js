function toFixedCurrency(value) {
  return Number((value || 0).toFixed(2));
}

function calculateComissao({ tipoComissao = 'percentual', valorMensal = 0, percentualComissao = 0, valorComissao = 0 } = {}) {
  if (tipoComissao === 'fixo') {
    return toFixedCurrency(valorComissao);
  }

  return toFixedCurrency((valorMensal * percentualComissao) / 100);
}

function buildContratoLancamentos({
  contratoNumero,
  empresaId,
  clienteId,
  contratoId,
  valorMensal,
  valorComissao,
  dataInicio,
}) {
  const base = {
    empresa_id: empresaId,
    contrato_id: contratoId,
    cliente_id: clienteId,
    data_competencia: dataInicio,
    data_vencimento: dataInicio,
    status: 'pendente',
    observacoes: 'Gerado automaticamente a partir do contrato',
    recorrente: false,
  };

  const lancamentos = [
    {
      ...base,
      tipo: 'receita',
      descricao: `Receita do contrato ${contratoNumero}`,
      valor: toFixedCurrency(valorMensal),
    },
  ];

  if (valorComissao > 0) {
    lancamentos.push({
      ...base,
      tipo: 'despesa',
      descricao: `Comissão do contrato ${contratoNumero}`,
      valor: toFixedCurrency(valorComissao),
    });
  }

  return lancamentos;
}

module.exports = {
  calculateComissao,
  buildContratoLancamentos,
};
