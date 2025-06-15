-- Allow "push" as a valid notification type
-- Drop existing constraint and recreate with new value, if constraint name is known.
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the CHECK constraint on notifications.type column
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%type IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', constraint_name);
  END IF;

  -- Re-create constraint allowing the new value
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
      CHECK (type IN (''info'', ''alert'', ''update'', ''promotional'', ''push''));
END $$; 