-- Fix tasks constraints to match frontend values

-- Drop existing constraints
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new constraints with correct values (matching frontend)
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('High', 'Medium', 'Low', 'high', 'medium', 'low', 'urgent'));

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('Backlog', 'Todo', 'Doing', 'Review', 'Done', 'backlog', 'todo', 'in_progress', 'review', 'done'));
