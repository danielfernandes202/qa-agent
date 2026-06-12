-- Migration Script: Create Storage Buckets for QA documents and Visual Test Images
-- Run this in your Supabase project's SQL Editor.

-- 1. Create the qa-documents bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qa-documents', 'qa-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the qa-visual-tests bucket (public for easier rendering on dashboard without signing URLs, since they are generic UI screenshots)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qa-visual-tests', 'qa-visual-tests', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS Policies for qa-documents (Authenticated users only)
-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'qa-documents' );

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT TO authenticated USING ( bucket_id = 'qa-documents' );

-- Allow authenticated users to update/delete their own documents
CREATE POLICY "Users can update/delete their own documents"
ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'qa-documents' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'qa-documents' AND auth.uid() = owner );

-- 4. Set up RLS Policies for qa-visual-tests (Public read, authenticated upload)
-- Allow public to read visual test screenshots
CREATE POLICY "Public can view visual test screenshots"
ON storage.objects FOR SELECT USING ( bucket_id = 'qa-visual-tests' );

-- Allow authenticated users to upload visual tests
CREATE POLICY "Authenticated users can upload visual tests"
ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'qa-visual-tests' );

-- Allow authenticated users to update/delete visual tests
CREATE POLICY "Authenticated users can update visual tests"
ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'qa-visual-tests' AND auth.uid() = owner );

CREATE POLICY "Authenticated users can delete visual tests"
ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'qa-visual-tests' AND auth.uid() = owner );
