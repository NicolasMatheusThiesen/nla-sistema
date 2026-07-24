CREATE OR REPLACE FUNCTION atualizar_saldo_conta_bancaria()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for um INSERT de um lançamento PAGO
  IF TG_OP = 'INSERT' AND NEW.status = 'pago' AND NEW.conta_bancaria_id IS NOT NULL THEN
    IF NEW.tipo = 'receita' THEN
      UPDATE contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_bancaria_id;
    ELSIF NEW.tipo = 'despesa' THEN
      UPDATE contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_bancaria_id;
    END IF;
  END IF;

  -- Se for um UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Se a conta bancária mudou, reverter o antigo (se estava pago) e aplicar no novo (se estiver pago)
    IF OLD.conta_bancaria_id IS DISTINCT FROM NEW.conta_bancaria_id THEN
      -- Reverter na conta antiga
      IF OLD.status = 'pago' AND OLD.conta_bancaria_id IS NOT NULL THEN
        IF OLD.tipo = 'receita' THEN
          UPDATE contas_bancarias SET saldo_atual = saldo_atual - OLD.valor WHERE id = OLD.conta_bancaria_id;
        ELSIF OLD.tipo = 'despesa' THEN
          UPDATE contas_bancarias SET saldo_atual = saldo_atual + OLD.valor WHERE id = OLD.conta_bancaria_id;
        END IF;
      END IF;
      -- Aplicar na conta nova
      IF NEW.status = 'pago' AND NEW.conta_bancaria_id IS NOT NULL THEN
        IF NEW.tipo = 'receita' THEN
          UPDATE contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_bancaria_id;
        ELSIF NEW.tipo = 'despesa' THEN
          UPDATE contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_bancaria_id;
        END IF;
      END IF;
    ELSE
      -- Se a conta é a mesma
      IF OLD.conta_bancaria_id IS NOT NULL THEN
        -- Caso 1: Status mudou para pago (entrou dinheiro)
        IF OLD.status != 'pago' AND NEW.status = 'pago' THEN
          IF NEW.tipo = 'receita' THEN
            UPDATE contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_bancaria_id;
          ELSIF NEW.tipo = 'despesa' THEN
            UPDATE contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_bancaria_id;
          END IF;
        -- Caso 2: Status era pago e mudou para não-pago (saiu dinheiro / estorno)
        ELSIF OLD.status = 'pago' AND NEW.status != 'pago' THEN
          IF OLD.tipo = 'receita' THEN
            UPDATE contas_bancarias SET saldo_atual = saldo_atual - OLD.valor WHERE id = OLD.conta_bancaria_id;
          ELSIF OLD.tipo = 'despesa' THEN
            UPDATE contas_bancarias SET saldo_atual = saldo_atual + OLD.valor WHERE id = OLD.conta_bancaria_id;
          END IF;
        -- Caso 3: Sempre foi pago, mas o valor mudou
        ELSIF OLD.status = 'pago' AND NEW.status = 'pago' AND OLD.valor != NEW.valor THEN
          IF NEW.tipo = 'receita' THEN
            UPDATE contas_bancarias SET saldo_atual = saldo_atual - OLD.valor + NEW.valor WHERE id = NEW.conta_bancaria_id;
          ELSIF NEW.tipo = 'despesa' THEN
            UPDATE contas_bancarias SET saldo_atual = saldo_atual + OLD.valor - NEW.valor WHERE id = NEW.conta_bancaria_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Se for DELETE
  IF TG_OP = 'DELETE' AND OLD.status = 'pago' AND OLD.conta_bancaria_id IS NOT NULL THEN
    IF OLD.tipo = 'receita' THEN
      UPDATE contas_bancarias SET saldo_atual = saldo_atual - OLD.valor WHERE id = OLD.conta_bancaria_id;
    ELSIF OLD.tipo = 'despesa' THEN
      UPDATE contas_bancarias SET saldo_atual = saldo_atual + OLD.valor WHERE id = OLD.conta_bancaria_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_saldo ON lancamentos;
CREATE TRIGGER trigger_atualizar_saldo
AFTER INSERT OR UPDATE OR DELETE ON lancamentos
FOR EACH ROW
EXECUTE FUNCTION atualizar_saldo_conta_bancaria();
