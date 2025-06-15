import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Series {
  id: string;
  title: string;
  image: string;
  episodes: number;
  description: string;
  category?: string;
  release_date?: string;
  rating?: number;
  genre?: string;
  is_featured?: boolean;
}

export const useSeriesData = () => {
  const [featuredSeries, setFeaturedSeries] = useState<Series[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<Series[]>([]);
  const [latestSeries, setLatestSeries] = useState<Series[]>([]);
  const [recommendedSeries, setRecommendedSeries] = useState<Series[]>([]);
  const [popularSeries, setPopularSeries] = useState<Series[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeriesData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching series data from Supabase...');
      
      const { data: seriesData, error: seriesError } = await supabase
        .from('series_meta')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (seriesError) {
        throw seriesError;
      }

      if (!seriesData || seriesData.length === 0) {
        console.log('No series data found in database');
        setError('No series available');
        return;
      }

      // Transform Supabase data to match our Series interface
      const transformedSeries: Series[] = seriesData.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image_url,
        episodes: item.episodes,
        description: item.description,
        category: item.category ? String(item.category).toLowerCase() : undefined,
        release_date: item.release_date,
        rating: item.rating ? parseFloat(item.rating.toString()) : undefined,
        genre: item.genre,
        is_featured: item.is_featured ?? false
      }));

      // Determine featured series using explicit flag
      const featured = transformedSeries.filter(s => s.is_featured);

      // Categorize series based on category field
      const trending = transformedSeries.filter(s => s.category === 'trending');
      const latest = transformedSeries.filter(s => s.category === 'latest' || !s.category);
      const recommended = transformedSeries.filter(s => s.category === 'recommended');
      const popular = transformedSeries.filter(s => s.category === 'popular');

      setFeaturedSeries(featured.slice(0, 3));
      setTrendingSeries(trending);
      setLatestSeries(latest);
      setRecommendedSeries(recommended);
      setPopularSeries(popular);
      setAllSeries(transformedSeries);
      
      console.log('Series data loaded successfully:', transformedSeries.length);
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load series data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeriesData();

    // Set up real-time subscription for series updates
    const channel = supabase
      .channel('series-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'series_meta'
        },
        (payload) => {
          console.log('Series data changed:', payload);
          fetchSeriesData(); // Refetch data when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshData = () => {
    fetchSeriesData();
  };

  return {
    featuredSeries,
    trendingSeries,
    latestSeries,
    recommendedSeries,
    popularSeries,
    allSeries,
    loading,
    error,
    refreshData
  };
};
