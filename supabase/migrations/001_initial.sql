-- ============================================================
-- ScadenzaIT — schema iniziale Supabase
-- Incolla questo script nel SQL Editor del progetto Supabase:
--   Dashboard → SQL Editor → New query → Esegui
-- ============================================================

-- ── Scadenze ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.deadlines (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  uuid         text        NOT NULL,
  catalog_id   text,
  custom_name  text        NOT NULL,
  category     text        NOT NULL,
  due_date     timestamptz NOT NULL,
  amount_cents integer,
  recurrence   text        NOT NULL DEFAULT 'once',
  reminders    integer[]   NOT NULL DEFAULT '{}',
  completed    boolean     NOT NULL DEFAULT false,
  vehicle_id   text,
  notes        text,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deadlines_uuid_user_unique UNIQUE (uuid, user_id)
);

-- Indici per le query più comuni
CREATE INDEX IF NOT EXISTS idx_deadlines_user    ON public.deadlines (user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due     ON public.deadlines (due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_updated ON public.deadlines (updated_at);

-- RLS: ogni utente vede e modifica solo le proprie scadenze
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deadlines: accesso solo proprio utente"
  ON public.deadlines FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Veicoli ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vehicles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  uuid             text NOT NULL,
  targa            text NOT NULL,
  marca            text,
  modello          text,
  kw               integer,
  regione_code     text,
  immat_date       date,
  ultima_revisione date,
  assic_expiry     date,
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vehicles_uuid_user_unique UNIQUE (uuid, user_id),
  CONSTRAINT vehicles_targa_user_unique UNIQUE (targa, user_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user    ON public.vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_updated ON public.vehicles (updated_at);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles: accesso solo proprio utente"
  ON public.vehicles FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Documenti (metadati) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  uuid         text NOT NULL,
  filename     text NOT NULL,
  storage_path text,           -- path nel bucket Supabase Storage
  mime_type    text,
  size_bytes   integer,
  notes        text,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT documents_uuid_user_unique UNIQUE (uuid, user_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_user    ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON public.documents (updated_at);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents: accesso solo proprio utente"
  ON public.documents FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Storage bucket "documents" ────────────────────────────────────────────
-- Crea il bucket dalla Dashboard → Storage → New bucket → name: "documents"
-- oppure via API:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Policy Storage: ogni utente accede solo alla propria cartella /{user_id}/
CREATE POLICY "storage documents: accesso proprio utente"
  ON storage.objects FOR ALL
  USING  (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
