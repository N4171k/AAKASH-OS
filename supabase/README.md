# Supabase setup

1. Create a new Supabase project.
2. Copy your project URL and anon key into `.env`.
3. Open the SQL editor and run [migrations/001_init.sql](migrations/001_init.sql).
4. Verify that the following tables exist:
   - `profiles`
   - `files`
   - `notes`
   - `projects`
   - `project_files`
   - `user_preferences`
   - `workspace_layouts`

This migration creates:
- auth trigger for automatic profile creation
- row level security policies for per-user access
- default preferences rows for new users
