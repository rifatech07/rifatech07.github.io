-- Rifa Solidária — rode no SQL Editor do Supabase (Run)

-- Tabela principal
CREATE TABLE IF NOT EXISTS cotas (
  cota TEXT PRIMARY KEY,
  numero1 TEXT NOT NULL,
  numero2 TEXT NOT NULL,
  numero3 TEXT NOT NULL,
  comprador TEXT NOT NULL DEFAULT '',
  identificador TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'LIVRE'
    CHECK (status IN ('LIVRE', 'RESERVADA', 'VENDIDA')),
  pagamento TEXT NOT NULL DEFAULT ''
    CHECK (pagamento IN ('', 'PENDENTE', 'PAGO')),
  reservado_em TIMESTAMPTZ,
  whatsapp TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_cotas_status ON cotas (status);
CREATE INDEX IF NOT EXISTS idx_cotas_identificador ON cotas (identificador);

-- View pública (sem nome nem WhatsApp)
CREATE OR REPLACE VIEW cotas_public AS
SELECT cota, numero1, numero2, numero3, identificador, status, pagamento
FROM cotas;

-- Seed 300 cotas (só se vazio)
DO $$
DECLARE
  i INT;
  c TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM cotas) > 0 THEN
    RETURN;
  END IF;
  FOR i IN 1..300 LOOP
    c := lpad(i::text, 3, '0');
    INSERT INTO cotas (cota, numero1, numero2, numero3)
    VALUES (c, c, lpad((i + 300)::text, 3, '0'), lpad((i + 600)::text, 3, '0'));
  END LOOP;
END $$;

-- Identificador RF-XXXXXX
CREATE OR REPLACE FUNCTION gerar_identificador()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  id TEXT;
  n INT;
  i INT;
BEGIN
  FOR n IN 1..50 LOOP
    id := 'RF-';
    FOR i IN 1..6 LOOP
      id := id || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM cotas WHERE identificador = id) THEN
      RETURN id;
    END IF;
  END LOOP;
  RETURN 'RF-' || upper(substr(md5(random()::text), 1, 6));
END;
$$;

-- Reserva (comprador anônimo)
CREATE OR REPLACE FUNCTION reservar_cota(
  p_cota TEXT,
  p_comprador TEXT,
  p_whatsapp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cota TEXT;
  v_nome TEXT;
  v_wa TEXT;
  v_id TEXT;
  v_row cotas%ROWTYPE;
BEGIN
  v_cota := lpad(regexp_replace(COALESCE(p_cota, ''), '\D', '', 'g'), 3, '0');
  IF v_cota = '' OR v_cota = '000' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe uma cota válida.');
  END IF;

  v_nome := trim(regexp_replace(COALESCE(p_comprador, ''), '\s+', ' ', 'g'));
  IF length(v_nome) < 3 OR length(v_nome) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nome deve ter entre 3 e 80 caracteres.');
  END IF;

  v_wa := regexp_replace(COALESCE(p_whatsapp, ''), '\D', '', 'g');
  IF length(v_wa) < 10 OR length(v_wa) > 13 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Informe um WhatsApp válido com DDD (ex.: 11999999999).');
  END IF;

  SELECT * INTO v_row FROM cotas WHERE cota = v_cota FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cota não encontrada.');
  END IF;
  IF v_row.status <> 'LIVRE' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta cota já foi reservada ou vendida e não pode ser alterada.');
  END IF;

  v_id := gerar_identificador();
  UPDATE cotas
  SET comprador = v_nome,
      whatsapp = v_wa,
      identificador = v_id,
      status = 'RESERVADA',
      pagamento = 'PENDENTE',
      reservado_em = now()
  WHERE cota = v_cota AND status = 'LIVRE';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta cota acabou de ser reservada por outra pessoa. Escolha outra.');
  END IF;

  SELECT * INTO v_row FROM cotas WHERE cota = v_cota;
  RETURN jsonb_build_object(
    'ok', true,
    'mensagem', 'Reserva confirmada! Agora envie o pagamento pelo WhatsApp para confirmar sua cota.',
    'cota', jsonb_build_object(
      'cota', v_row.cota,
      'numero1', v_row.numero1,
      'numero2', v_row.numero2,
      'numero3', v_row.numero3,
      'identificador', v_row.identificador,
      'status', v_row.status,
      'pagamento', v_row.pagamento
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION confirmar_pagamento(p_cota TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cota TEXT;
  v_row cotas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Não autorizado.');
  END IF;

  v_cota := lpad(regexp_replace(COALESCE(p_cota, ''), '\D', '', 'g'), 3, '0');
  SELECT * INTO v_row FROM cotas WHERE cota = v_cota;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cota não encontrada.');
  END IF;
  IF v_row.status = 'LIVRE' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cota livre — não há pagamento para confirmar.');
  END IF;

  UPDATE cotas SET status = 'VENDIDA', pagamento = 'PAGO' WHERE cota = v_cota;
  SELECT * INTO v_row FROM cotas WHERE cota = v_cota;

  RETURN jsonb_build_object(
    'ok', true,
    'mensagem', 'Pagamento confirmado. Cota marcada como VENDIDA.',
    'cota', row_to_json(v_row)::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_reset_all()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Não autorizado.');
  END IF;

  UPDATE cotas
  SET comprador = '', whatsapp = '', identificador = '',
      status = 'LIVRE', pagamento = '', reservado_em = NULL;
  GET DIAGNOSTICS n = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'mensagem', 'Todas as cotas foram liberadas.', 'total', n);
END;
$$;

CREATE OR REPLACE FUNCTION admin_bulk_status(p_cotas TEXT[], p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c TEXT;
  v_cota TEXT;
  n INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Não autorizado.');
  END IF;
  IF p_status NOT IN ('LIVRE', 'RESERVADA', 'VENDIDA') THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Status inválido.');
  END IF;

  FOREACH c IN ARRAY p_cotas LOOP
    v_cota := lpad(regexp_replace(c, '\D', '', 'g'), 3, '0');
    UPDATE cotas SET
      status = p_status,
      comprador = CASE WHEN p_status = 'LIVRE' THEN '' ELSE comprador END,
      whatsapp = CASE WHEN p_status = 'LIVRE' THEN '' ELSE whatsapp END,
      identificador = CASE WHEN p_status = 'LIVRE' THEN '' ELSE identificador END,
      pagamento = CASE
        WHEN p_status = 'LIVRE' THEN ''
        WHEN pagamento = '' OR pagamento IS NULL THEN 'PENDENTE'
        ELSE pagamento
      END,
      reservado_em = CASE
        WHEN p_status = 'LIVRE' THEN NULL
        ELSE COALESCE(reservado_em, now())
      END
    WHERE cotas.cota = v_cota;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'mensagem', 'Cotas atualizadas.', 'total', n);
END;
$$;

-- RLS
ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cotas_admin_all ON cotas;
CREATE POLICY cotas_admin_all ON cotas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permissões
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON cotas_public TO anon, authenticated;
GRANT ALL ON cotas TO authenticated;
GRANT EXECUTE ON FUNCTION reservar_cota(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirmar_pagamento(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_all() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bulk_status(TEXT[], TEXT) TO authenticated;
