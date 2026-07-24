-- Migration to add tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    entry_fee NUMERIC NOT NULL DEFAULT 0,
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    exported BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable Row Level Security on the new table
ALTER TABLE public.tournaments DISABLE ROW LEVEL SECURITY;

-- Enable Realtime for the table
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
END $$;
