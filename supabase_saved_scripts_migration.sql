-- Migration for Persistent Test Case & Code Library

CREATE TABLE saved_scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    jira_issue_key TEXT,
    code TEXT NOT NULL,
    test_cases JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE saved_scripts ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own scripts
CREATE POLICY "Users can insert their own saved scripts" 
ON saved_scripts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own scripts
CREATE POLICY "Users can select their own saved scripts" 
ON saved_scripts FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to delete their own scripts
CREATE POLICY "Users can delete their own saved scripts" 
ON saved_scripts FOR DELETE 
USING (auth.uid() = user_id);

-- Allow users to update their own scripts
CREATE POLICY "Users can update their own saved scripts" 
ON saved_scripts FOR UPDATE 
USING (auth.uid() = user_id);
