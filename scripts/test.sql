SET ROLE authenticated;
SET request.jwt.claim.sub = 'c7c4efa8-a629-4351-9b25-04d1a19461af';
SELECT * FROM public.get_jira_credentials();
