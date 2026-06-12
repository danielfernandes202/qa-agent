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
BEGIN
    -- Ensure the user is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Store the API token in the vault
    -- vault.create_secret returns a scalar UUID
    v_secret_id := vault.create_secret(p_api_token, 'Jira API Token for ' || v_user_id);

    -- Insert or update the credentials table
    INSERT INTO public.user_jira_credentials (user_id, jira_url, email, api_token_secret_id, updated_at)
    VALUES (v_user_id, p_jira_url, p_email, v_secret_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET jira_url = EXCLUDED.jira_url,
        email = EXCLUDED.email,
        api_token_secret_id = EXCLUDED.api_token_secret_id,
        updated_at = NOW();
END;
$$;
