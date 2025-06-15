-- Add image_url column to notifications table if missing
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS image_url text; 