-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'alert', 'update', 'promotional')),
  target_all_users BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'scheduled', 'failed')),
  schedule_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create device_tokens table
CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Anyone can view notifications" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notifications" ON public.notifications
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable RLS on device_tokens
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for device_tokens
CREATE POLICY "Users can view own device tokens" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens" ON public.device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous users to insert device tokens (for web without auth)
CREATE POLICY "Anonymous can insert device tokens" ON public.device_tokens
  FOR INSERT WITH CHECK (true);

-- Simple approach: No complex triggers, admin panel will call edge function directly

-- Enable realtime for notifications and device_tokens
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.device_tokens REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_tokens;

-- Set default status to 'sent' for immediate notifications
ALTER TABLE public.notifications ALTER COLUMN status SET DEFAULT 'sent'; 