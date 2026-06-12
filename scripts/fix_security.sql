-- 1. Fix test_runs schema (add user_id)
-- Add user_id column to test_runs. For existing rows, we set a default or leave it.
-- We'll add it as nullable first, then maybe set existing ones to the first user or delete them.
-- Given it's a test app, we can just add it as nullable, then update existing rows if needed, or leave them.
-- Actually, let's just make it nullable for now, or default to auth.uid() if that works.
-- But DEFAULT auth.uid() only works during inserts.
ALTER TABLE public.test_runs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Update test_runs RLS policies
DROP POLICY IF EXISTS "Allow insert on test_runs for authenticated users" ON public.test_runs;
DROP POLICY IF EXISTS "Allow select on test_runs for authenticated users" ON public.test_runs;

CREATE POLICY "Users can insert own test_runs" 
    ON public.test_runs FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own test_runs" 
    ON public.test_runs FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own test_runs" 
    ON public.test_runs FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own test_runs" 
    ON public.test_runs FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- 3. Update visual_bugs RLS policies
DROP POLICY IF EXISTS "Allow insert on visual_bugs for authenticated users" ON public.visual_bugs;
DROP POLICY IF EXISTS "Allow select on visual_bugs for authenticated users" ON public.visual_bugs;

-- We need to check if the user owns the test_run.
CREATE POLICY "Users can insert visual_bugs for own test_runs"
    ON public.visual_bugs FOR INSERT
    TO authenticated
    WITH CHECK (
        test_run_id IN (SELECT id FROM public.test_runs WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can select visual_bugs for own test_runs"
    ON public.visual_bugs FOR SELECT
    TO authenticated
    USING (
        test_run_id IN (SELECT id FROM public.test_runs WHERE user_id = auth.uid())
    );

-- 4. Fix user_jira_credentials UPDATE policy
DROP POLICY IF EXISTS "Users can update own credentials" ON public.user_jira_credentials;
CREATE POLICY "Users can update own credentials"
    ON public.user_jira_credentials FOR UPDATE
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Secure RPC functions
-- Revoke public execution
REVOKE EXECUTE ON FUNCTION public.get_jira_credentials() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_jira_credentials() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_jira_credentials() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.store_jira_credentials(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.store_jira_credentials(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.store_jira_credentials(text, text, text) TO authenticated;
