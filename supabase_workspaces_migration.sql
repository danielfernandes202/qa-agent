-- Migration Script: Multi-player Team Workspaces
-- Run this in your Supabase SQL Editor.

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. Workspace Policies
-- Users can view workspaces they are members of
CREATE POLICY "Users can view workspaces they belong to"
ON workspaces FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
);

-- Users can insert new workspaces
CREATE POLICY "Users can create workspaces"
ON workspaces FOR INSERT
WITH CHECK (true);

-- Owners can update workspaces
CREATE POLICY "Owners can update workspaces"
ON workspaces FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'owner'
    )
);

-- Owners can delete workspaces
CREATE POLICY "Owners can delete workspaces"
ON workspaces FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'owner'
    )
);

-- 4. Workspace Members Policies
-- Users can view members of their workspaces
CREATE POLICY "Users can view members of their workspaces"
ON workspace_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- Owners can manage members
CREATE POLICY "Owners can insert members"
ON workspace_members FOR INSERT
WITH CHECK (
    -- Let users insert themselves when creating a workspace (circular dependency check workaround by just checking if it's the owner role for yourself, or being an existing owner)
    (auth.uid() = user_id AND role = 'owner') OR
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
);

CREATE POLICY "Owners can update members"
ON workspace_members FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
);

CREATE POLICY "Owners can delete members"
ON workspace_members FOR DELETE
USING (
    -- Users can leave (delete themselves) OR owners can remove members
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
);

-- 5. Modify saved_scripts table
-- Add workspace_id column
ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 6. MIGRATION: Create default workspaces for existing users and map scripts
DO $$ 
DECLARE
    rec RECORD;
    v_workspace_id UUID;
BEGIN
    FOR rec IN SELECT DISTINCT user_id FROM saved_scripts LOOP
        -- Create a default workspace for the user
        INSERT INTO workspaces (name) VALUES ('My Workspace') RETURNING id INTO v_workspace_id;
        
        -- Add user as owner
        INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (v_workspace_id, rec.user_id, 'owner');
        
        -- Update their saved_scripts to belong to this workspace
        UPDATE saved_scripts SET workspace_id = v_workspace_id WHERE user_id = rec.user_id;
    END LOOP;
END $$;

-- Drop old RLS policies on saved_scripts
DROP POLICY IF EXISTS "Users can insert their own saved scripts" ON saved_scripts;
DROP POLICY IF EXISTS "Users can select their own saved scripts" ON saved_scripts;
DROP POLICY IF EXISTS "Users can update their own saved scripts" ON saved_scripts;
DROP POLICY IF EXISTS "Users can delete their own saved scripts" ON saved_scripts;

-- Create new RLS policies for saved_scripts based on workspace membership
CREATE POLICY "Workspace members can view scripts"
ON saved_scripts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = saved_scripts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can insert scripts"
ON saved_scripts FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = saved_scripts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can update scripts"
ON saved_scripts FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = saved_scripts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

CREATE POLICY "Workspace members can delete scripts"
ON saved_scripts FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = saved_scripts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

-- Function to handle new user registration: automatically create a default workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    INSERT INTO public.workspaces (name) VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace')) RETURNING id INTO v_workspace_id;
    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (v_workspace_id, NEW.id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after an auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
