-- فواتير التطبيق الإدارية (JSON كامل لكل صف) — مزامنة مع الواجهة المحلية
CREATE TABLE IF NOT EXISTS public.app_invoices (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_invoices_user_id_idx ON public.app_invoices (user_id);
CREATE INDEX IF NOT EXISTS app_invoices_updated_at_idx ON public.app_invoices (user_id, updated_at DESC);

ALTER TABLE public.app_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_invoices_select_own"
  ON public.app_invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "app_invoices_insert_own"
  ON public.app_invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "app_invoices_update_own"
  ON public.app_invoices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "app_invoices_delete_own"
  ON public.app_invoices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
