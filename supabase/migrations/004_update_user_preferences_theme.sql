-- Add new theme values and set default to 'aakash'
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_theme_check;
ALTER TABLE public.user_preferences ALTER COLUMN theme SET DEFAULT 'aakash';
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_theme_check CHECK (theme in ('light','dark','system','aakash','paatal','dharti','antariksh'));
