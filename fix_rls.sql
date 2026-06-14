DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
CREATE POLICY "Users can view members of their workspaces"
ON workspace_members FOR SELECT
USING ( user_id = auth.uid() );
