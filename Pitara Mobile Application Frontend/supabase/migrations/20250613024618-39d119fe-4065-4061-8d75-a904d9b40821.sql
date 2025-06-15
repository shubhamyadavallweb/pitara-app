
-- Create users profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create subscribers table for subscription management
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on subscribers
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers
CREATE POLICY "Users can view own subscription" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update own subscription" ON public.subscribers
  FOR UPDATE USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Service can insert subscriptions" ON public.subscribers
  FOR INSERT WITH CHECK (true);

-- Create series_meta table for web series management
CREATE TABLE public.series_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  episodes INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  genre TEXT,
  rating DECIMAL(3,1) DEFAULT 0.0,
  release_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on series_meta (public read access)
ALTER TABLE public.series_meta ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for series_meta (public read)
CREATE POLICY "Anyone can view active series" ON public.series_meta
  FOR SELECT USING (status = 'active');

-- Create episodes table
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES public.series_meta(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(series_id, episode_number)
);

-- Enable RLS on episodes
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for episodes (public read)
CREATE POLICY "Anyone can view episodes" ON public.episodes
  FOR SELECT USING (true);

-- Create user_downloads table for tracking downloads
CREATE TABLE public.user_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series_meta(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  download_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

-- Enable RLS on user_downloads
ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_downloads
CREATE POLICY "Users can manage own downloads" ON public.user_downloads
  FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for series_meta and episodes
ALTER TABLE public.series_meta REPLICA IDENTITY FULL;
ALTER TABLE public.episodes REPLICA IDENTITY FULL;
ALTER TABLE public.subscribers REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.series_meta;
ALTER PUBLICATION supabase_realtime ADD TABLE public.episodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;

-- Insert sample data for testing
INSERT INTO public.series_meta (title, description, image_url, episodes, category, genre, rating, release_date) VALUES
('Cosmic Chronicles', 'An amazing web series that will keep you hooked from start to finish.', 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=600&fit=crop', 12, 'trending', 'Sci-Fi', 4.8, '2024-01-15'),
('Urban Legends', 'Explore the mysteries of urban folklore in this thrilling series.', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop', 8, 'latest', 'Thriller', 4.5, '2024-02-20'),
('Time Travelers', 'Journey through different eras in this mind-bending adventure.', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=600&fit=crop', 10, 'recommended', 'Drama', 4.7, '2024-01-10'),
('Digital Detectives', 'Solving crimes in the digital age with cutting-edge technology.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop', 15, 'popular', 'Crime', 4.6, '2024-03-05');
