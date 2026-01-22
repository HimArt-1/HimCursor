-- Add last_seen column for online status tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- Add avatar_url column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create index for fast queries on last_seen
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON public.profiles(last_seen);

-- Update existing profiles to have a last_seen value
UPDATE public.profiles 
SET last_seen = updated_at 
WHERE last_seen IS NULL;
