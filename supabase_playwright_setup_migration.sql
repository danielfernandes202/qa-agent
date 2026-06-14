-- Create the playwright_setups table
CREATE TABLE IF NOT EXISTS playwright_setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    base_url TEXT,
    auth_flow TEXT,
    common_selectors TEXT,
    boilerplate TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, project_id)
);

-- Enable Row Level Security
ALTER TABLE playwright_setups ENABLE ROW LEVEL SECURITY;

-- Policies

-- Allow users to view setups in their workspaces
CREATE POLICY "Users can view playwright setups in their workspaces"
ON playwright_setups FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = playwright_setups.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

-- Allow users to insert setups in their workspaces
CREATE POLICY "Users can create playwright setups in their workspaces"
ON playwright_setups FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = playwright_setups.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

-- Allow users to update setups in their workspaces
CREATE POLICY "Users can update playwright setups in their workspaces"
ON playwright_setups FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = playwright_setups.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

-- Allow users to delete setups in their workspaces
CREATE POLICY "Users can delete playwright setups in their workspaces"
ON playwright_setups FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = playwright_setups.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);
