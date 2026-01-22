-- Add missing columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS owner text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS tasks_domain_idx ON public.tasks(domain);
CREATE INDEX IF NOT EXISTS tasks_owner_idx ON public.tasks(owner);
