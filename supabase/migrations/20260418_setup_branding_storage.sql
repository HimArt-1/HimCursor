-- WASHA CONTROL - BRANDING STORAGE
-- This script creates a public bucket for branding assets (logos) and sets up RLS policies.

-- 1. Create the Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access to Read Logos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'branding' );

-- 3. Allow Authenticated Users to Upload Logos
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'branding' );

-- 4. Allow Authenticated Users to Manage Logos
DROP POLICY IF EXISTS "Authenticated Manage" ON storage.objects;
CREATE POLICY "Authenticated Manage"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'branding' )
WITH CHECK ( bucket_id = 'branding' );
