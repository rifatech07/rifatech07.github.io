-- CORREÇÃO ADMIN — cole no SQL Editor e clique Run (pode rodar de novo sem problema)

-- 1) Função que lista cotas para usuário logado
CREATE OR REPLACE FUNCTION admin_list_cotas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cotas JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Não autorizado. Faça login novamente.');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.cota), '[]'::jsonb)
  INTO v_cotas
  FROM cotas c;

  RETURN jsonb_build_object('ok', true, 'cotas', v_cotas);
END;
$$;

-- 2) Permissões
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cotas TO authenticated;
GRANT SELECT ON TABLE public.cotas TO anon;
GRANT SELECT ON TABLE public.cotas_public TO anon, authenticated;

ALTER TABLE public.cotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cotas_admin_all ON public.cotas;
CREATE POLICY cotas_admin_all ON public.cotas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.reservar_cota(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_status(TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cotas() TO authenticated;

-- 3) Recarrega API do Supabase
NOTIFY pgrst, 'reload schema';
