-- Create the test_run_events table to store live streaming logs from the Visual Tester
CREATE TABLE IF NOT EXISTS public.test_run_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index the session_id for fast lookups by the frontend
CREATE INDEX IF NOT EXISTS idx_test_run_events_session_id ON public.test_run_events (session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.test_run_events ENABLE ROW LEVEL SECURITY;

-- Create policies so authenticated users can insert and view their logs
-- Note: You may want to restrict this further to only the user's own session ID if you have user IDs
CREATE POLICY "Enable insert for authenticated users" 
ON public.test_run_events 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users" 
ON public.test_run_events 
FOR SELECT 
TO authenticated 
USING (true);

-- CRITICAL: Enable realtime broadcasts for the table so Supabase Realtime can push events to the frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_run_events;
