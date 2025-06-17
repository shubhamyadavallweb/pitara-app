import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@pitara/supabase';

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  video_url: string;
  thumbnail_url?: string;
  description?: string;
  duration?: number;
}

interface Series {
  id: string;
  title: string;
  description: string;
  genre: string;
  thumbnail_url: string;
  image_url: string;
  status: string;
  is_featured: boolean;
  episodes: Episode[];
  created_at: string;
  updated_at: string;
}

export const useSeriesData = () => {
  const [featuredSeries, setFeaturedSeries] = useState<Series[]>([]);
  const [latestSeries, setLatestSeries] = useState<Series[]>([]);
  const [recommendedSeries, setRecommendedSeries] = useState<Series[]>([]);
  const [popularSeries, setPopularSeries] = useState<Series[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeriesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all series with episodes
      const { data: seriesData, error: seriesError } = await supabase
        .from('series_meta')
        .select(`
          *,
          episodes (
            id,
            title,
            episode_number,
            video_url,
            thumbnail_url,
            description,
            duration
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (seriesError) throw seriesError;

      const series: Series[] = (seriesData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        genre: item.genre,
        thumbnail_url: item.thumbnail_url || item.image_url,
        image_url: item.image_url,
        status: item.status,
        is_featured: item.is_featured,
        episodes: (item.episodes || []).sort((a: any, b: any) => a.episode_number - b.episode_number),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      setAllSeries(series);

      // Categorize series
      setFeaturedSeries(series.filter(s => s.is_featured));
      setLatestSeries(series.slice(0, 10));
      setRecommendedSeries(series.filter(s => s.genre === 'Drama' || s.genre === 'Thriller').slice(0, 8));
      setPopularSeries(series.filter(s => s.episodes.length > 5).slice(0, 8));

    } catch (err: any) {
      setError(err.message || 'Failed to fetch series data');
      console.error('Error fetching series data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeriesData();
  }, [fetchSeriesData]);

  const refreshData = useCallback(() => {
    fetchSeriesData();
  }, [fetchSeriesData]);

  const getSeriesById = useCallback((id: string) => {
    return allSeries.find(series => series.id === id);
  }, [allSeries]);

  return {
    featuredSeries,
    latestSeries,
    recommendedSeries,
    popularSeries,
    allSeries,
    loading,
    error,
    refreshData,
    getSeriesById
  };
}; 