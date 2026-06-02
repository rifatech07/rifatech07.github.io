-- Chave PIX nas configurações — rode no SQL Editor do Supabase

ALTER TABLE rifa_config
  ADD COLUMN IF NOT EXISTS chave_pix TEXT NOT NULL DEFAULT '';

ALTER TABLE rifa_config
  ADD COLUMN IF NOT EXISTS chave_pix_tipo TEXT NOT NULL DEFAULT '';

NOTIFY pgrst, 'reload schema';
