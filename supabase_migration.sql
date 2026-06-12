-- Migration Script: Store Jira Credentials securely using Supabase Vault
-- Please run this script in your Supabase project's SQL Editor.

-- 1. Enable the Supabase Vault extension (required for vault.secrets)
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 2. Create the table for storing Jira credentials
CREATE TABLE IF NOT EXISTS public.user_jira_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    jira_url TEXT NOT NULL,
    email TEXT NOT NULL,
    api_token_secret_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_jira_credentials ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can only view their own credentials
CREATE POLICY "Users can view own credentials" 
ON public.user_jira_credentials
FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own credentials
CREATE POLICY "Users can update own credentials" 
ON public.user_jira_credentials
FOR UPDATE USING (auth.uid() = user_id);

-- Users can only insert their own credentials
CREATE POLICY "Users can insert own credentials" 
ON public.user_jira_credentials
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Create Security Definer RPCs to interact with the Vault securely
-- We use SECURITY DEFINER so this function has permission to write to vault.secrets,
-- but the logic strictly binds the secret to the authenticated user's ID.

CREATE OR REPLACE FUNCTION store_jira_credentials(
    p_jira_url TEXT,
    p_email TEXT,
    p_api_token TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    v_user_id UUID;
    v_secret_id UUID;
    v_old_secret_id UUID;
BEGIN
    -- Ensure the user is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if the user already has credentials stored
    SELECT api_token_secret_id INTO v_old_secret_id 
    FROM public.user_jira_credentials 
    WHERE user_id = v_user_id;

    -- Store the new API token in the vault with a unique name
    v_secret_id := vault.create_secret(p_api_token, 'Jira API Token for ' || v_user_id || '_' || extract(epoch from now())::text);

    -- Insert or update the credentials table to point to the new secret
    INSERT INTO public.user_jira_credentials (user_id, jira_url, email, api_token_secret_id, updated_at)
    VALUES (v_user_id, p_jira_url, p_email, v_secret_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET jira_url = EXCLUDED.jira_url,
        email = EXCLUDED.email,
        api_token_secret_id = EXCLUDED.api_token_secret_id,
        updated_at = NOW();

    -- Safely delete the old secret if it existed
    IF v_old_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_old_secret_id;
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION get_jira_credentials()
RETURNS TABLE (
    jira_url TEXT,
    email TEXT,
    api_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
    -- Ensure the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        c.jira_url,
        c.email,
        s.secret AS api_token
    FROM public.user_jira_credentials c
    JOIN vault.decrypted_secrets s ON c.api_token_secret_id = s.id
    WHERE c.user_id = auth.uid();
END;
$$;
