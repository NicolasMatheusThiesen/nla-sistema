const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateComissao, buildContratoLancamentos } = require('../src/services/financeiro.service');

test('calcula comissão em percentual', () => {
  const result = calculateComissao({
    tipoComissao: 'percentual',
    valorMensal: 1000,
    percentualComissao: 10,
    valorComissao: 0,
  });

  assert.equal(result, 100);
});

test('prioriza valor fixo para comissão', () => {
  const result = calculateComissao({
    tipoComissao: 'fixo',
    valorMensal: 1000,
    percentualComissao: 10,
    valorComissao: 150,
  });

  assert.equal(result, 150);
});

test('gera lançamentos financeiros para contrato', () => {
  const lancamentos = buildContratoLancamentos({
    contratoNumero: 'LOC-2026-0001',
    empresaId: '11111111-1111-1111-1111-111111111111',
    clienteId: '22222222-2222-2222-2222-222222222222',
    contratoId: '33333333-3333-3333-3333-333333333333',
    valorMensal: 1000,
    valorComissao: 150,
    dataInicio: '2026-06-01',
  });

  assert.equal(lancamentos.length, 2);
  assert.equal(lancamentos[0].tipo, 'receita');
  assert.equal(lancamentos[1].tipo, 'despesa');
  assert.equal(lancamentos[1].valor, 150);
});
