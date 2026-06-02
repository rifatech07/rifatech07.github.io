-- Corrige "Liberar todas" — UPDATE requires a WHERE clause
-- Rode no SQL Editor do Supabase

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
      status = 'LIVRE', pagamento = '', reservado_em = NULL
  WHERE true;

  GET DIAGNOSTICS n = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'mensagem', 'Todas as cotas foram liberadas.', 'total', n);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_all() TO authenticated;

NOTIFY pgrst, 'reload schema';
