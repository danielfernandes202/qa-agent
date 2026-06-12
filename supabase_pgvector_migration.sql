-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create test_runs table to track each execution of the visual tester
CREATE TABLE IF NOT EXISTS test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tests_performed INT NOT NULL DEFAULT 1
);

-- Create visual_bugs table to store individual bugs with their embeddings
CREATE TABLE IF NOT EXISTS visual_bugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    screenshot_url TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_bugs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for now
CREATE POLICY "Allow select on test_runs for authenticated users" 
    ON test_runs FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow select on visual_bugs for authenticated users" 
    ON visual_bugs FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert on test_runs for authenticated users" 
    ON test_runs FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow insert on visual_bugs for authenticated users" 
    ON visual_bugs FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Create a function to match visual bugs using cosine distance
CREATE OR REPLACE FUNCTION match_visual_bugs (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  test_run_id uuid,
  description text,
  severity text,
  screenshot_url text,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    visual_bugs.id,
    visual_bugs.test_run_id,
    visual_bugs.description,
    visual_bugs.severity,
    visual_bugs.screenshot_url,
    visual_bugs.created_at,
    1 - (visual_bugs.embedding <=> query_embedding) AS similarity
  FROM visual_bugs
  WHERE 1 - (visual_bugs.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
