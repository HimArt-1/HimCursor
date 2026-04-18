-- WASHA CONTROL - SETUP STORAGE BUCKET
-- This script creates a public bucket for product images and sets up RLS policies.

-- 1. Create the Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access to Read Images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 3. Allow Authenticated Users to Upload Images
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'product-images' );

-- 4. Allow Authenticated Users to Update/Delete their own files (or any in this bucket for simplicity in POS)
CREATE POLICY "Authenticated Manage"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'product-images' )
WITH CHECK ( bucket_id = 'product-images' );
