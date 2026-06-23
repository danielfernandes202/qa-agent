DO $$ BEGIN
    CREATE TYPE public.run_state AS ENUM ('planned', 'exploring', 'awaiting_input', 'judging', 'reporting', 'done', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.test_runs 
ADD COLUMN IF NOT EXISTS current_state public.run_state DEFAULT 'planned',
ADD COLUMN IF NOT EXISTS current_step text,
ADD COLUMN IF NOT EXISTS action_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_action_budget integer DEFAULT 0;

DROP TABLE IF EXISTS public.test_run_events;

CREATE TABLE public.test_run_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_run_id uuid REFERENCES public.test_runs(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    from_state public.run_state,
    to_state public.run_state,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.test_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert test_run_events for own test_runs"
    ON public.test_run_events FOR INSERT
    TO authenticated
    WITH CHECK (
        test_run_id IN (SELECT id FROM public.test_runs WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can select test_run_events for own test_runs"
    ON public.test_run_events FOR SELECT
    TO authenticated
    USING (
        test_run_id IN (SELECT id FROM public.test_runs WHERE user_id = auth.uid())
    );

-- Enable Realtime for test_run_events table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'test_run_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.test_run_events;
    END IF;
END $$;

