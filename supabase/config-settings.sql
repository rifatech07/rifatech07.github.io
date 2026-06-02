-- Configurações da rifa — rode no SQL Editor (pode rodar de novo)

CREATE TABLE IF NOT EXISTS rifa_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp TEXT NOT NULL DEFAULT '5531982635834',
  premio TEXT NOT NULL DEFAULT 'Caixa de Som JBL',
  valor_cota TEXT NOT NULL DEFAULT 'R$ 10,00',
  data_sorteio TEXT NOT NULL DEFAULT '30/06/2026',
  chave_pix TEXT NOT NULL DEFAULT '',
  chave_pix_tipo TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rifa_config
  ADD COLUMN IF NOT EXISTS valor_cota TEXT NOT NULL DEFAULT 'R$ 10,00';

ALTER TABLE rifa_config
  ADD COLUMN IF NOT EXISTS chave_pix TEXT NOT NULL DEFAULT '';

ALTER TABLE rifa_config
  ADD COLUMN IF NOT EXISTS chave_pix_tipo TEXT NOT NULL DEFAULT '';

INSERT INTO rifa_config (id, whatsapp, premio, valor_cota, data_sorteio)
VALUES (1, '5531982635834', 'Caixa de Som JBL', 'R$ 10,00', '30/06/2026')
ON CONFLICT (id) DO NOTHING;

UPDATE rifa_config
SET valor_cota = 'R$ 10,00'
WHERE id = 1 AND (valor_cota IS NULL OR valor_cota = '');

ALTER TABLE rifa_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rifa_config_public_read ON rifa_config;
CREATE POLICY rifa_config_public_read ON rifa_config
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS rifa_config_admin_update ON rifa_config;
CREATE POLICY rifa_config_admin_update ON rifa_config
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE public.rifa_config TO anon, authenticated;
GRANT UPDATE ON TABLE public.rifa_config TO authenticated;

NOTIFY pgrst, 'reload schema';
