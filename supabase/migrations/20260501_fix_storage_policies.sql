-- FIX STORAGE POLICIES
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Manage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create global policies for all our buckets
CREATE POLICY "Public Read All Washa Buckets"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('product-images', 'invoices', 'branding') );

CREATE POLICY "Authenticated Insert Washa Buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('product-images', 'invoices', 'branding') );

CREATE POLICY "Authenticated Update Washa Buckets"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id IN ('product-images', 'invoices', 'branding') )
WITH CHECK ( bucket_id IN ('product-images', 'invoices', 'branding') );

CREATE POLICY "Authenticated Delete Washa Buckets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id IN ('product-images', 'invoices', 'branding') );
