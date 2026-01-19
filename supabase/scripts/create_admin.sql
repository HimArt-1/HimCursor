-- ⚠️ IMPORTANT: First, create the user in Supabase Authentication -> Users
-- Use the email: admin@himcontrol.local (or your choice)
-- Use the password (PIN): 123456 (must be 6 digits)

-- THEN, Run this script to give them 'System Admin' role:

insert into public.profiles (id, name, role, email, pin, avatar_color)
select 
  id, 
  'Admin',           -- Name
  'System Admin',    -- Role (Must be 'System Admin' for full access)
  email, 
  '123456',          -- PIN (Make sure this matches the password you set)
  '#FF5733'          -- Avatar Color
from auth.users
where email = 'admin@himcontrol.local'  -- ⚠️ CHANGE THIS if you used a different email
on conflict (id) do update 
set role = 'System Admin', pin = EXCLUDED.pin;
