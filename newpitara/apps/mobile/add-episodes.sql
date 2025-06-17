-- Add sample episodes for each series in the database
INSERT INTO public.episodes (series_id, episode_number, title, description, video_url, thumbnail_url) VALUES

-- Episodes for Cosmic Chronicles
((SELECT id FROM public.series_meta WHERE title = 'Cosmic Chronicles'), 1, 'The Beginning', 'The first episode of our space adventure', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300'),
((SELECT id FROM public.series_meta WHERE title = 'Cosmic Chronicles'), 2, 'Strange Worlds', 'Exploring new planets and civilizations', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300'),
((SELECT id FROM public.series_meta WHERE title = 'Cosmic Chronicles'), 3, 'The Encounter', 'First contact with alien life', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300'),

-- Episodes for Urban Legends
((SELECT id FROM public.series_meta WHERE title = 'Urban Legends'), 1, 'The Phantom', 'A mysterious figure haunts the city', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300'),
((SELECT id FROM public.series_meta WHERE title = 'Urban Legends'), 2, 'Midnight Stories', 'Tales from the dark side of the city', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300'),

-- Episodes for Time Travelers
((SELECT id FROM public.series_meta WHERE title = 'Time Travelers'), 1, 'Journey Begins', 'The first time travel experiment', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300'),
((SELECT id FROM public.series_meta WHERE title = 'Time Travelers'), 2, 'Ancient Rome', 'A trip to the Roman Empire', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300'),
((SELECT id FROM public.series_meta WHERE title = 'Time Travelers'), 3, 'Future Vision', 'What lies ahead for humanity', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300'),

-- Episodes for Digital Detectives
((SELECT id FROM public.series_meta WHERE title = 'Digital Detectives'), 1, 'Cyber Crime', 'The first digital mystery', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300'),
((SELECT id FROM public.series_meta WHERE title = 'Digital Detectives'), 2, 'Data Trail', 'Following the digital breadcrumbs', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300'); 