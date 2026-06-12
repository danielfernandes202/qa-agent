CREATE OR REPLACE FUNCTION public.get_jira_credentials()
 RETURNS TABLE(jira_url text, email text, api_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Ensure the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        c.jira_url,
        c.email,
        s.decrypted_secret AS api_token
    FROM public.user_jira_credentials c
    JOIN vault.decrypted_secrets s ON c.api_token_secret_id = s.id
    WHERE c.user_id = auth.uid();
END;
$function$;
