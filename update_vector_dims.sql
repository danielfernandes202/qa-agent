-- Update vector dimensions for Gemini embeddings
ALTER TABLE visual_bugs ALTER COLUMN embedding TYPE vector(3072);

-- Also need to update the RPC function to expect 3072 dimensions
DROP FUNCTION IF EXISTS match_visual_bugs;

create or replace function match_visual_bugs (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  test_run_id uuid,
  description text,
  severity text,
  screenshot_url text,
  created_at timestamp with time zone,
  similarity float
)
language sql stable
as $$
  select
    visual_bugs.id,
    visual_bugs.test_run_id,
    visual_bugs.description,
    visual_bugs.severity,
    visual_bugs.screenshot_url,
    visual_bugs.created_at,
    1 - (visual_bugs.embedding <=> query_embedding) as similarity
  from visual_bugs
  where 1 - (visual_bugs.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
