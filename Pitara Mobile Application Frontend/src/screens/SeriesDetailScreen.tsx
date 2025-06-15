import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Download, Star, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useDownloads } from '@/hooks/useDownloads';
import { useToast } from '@/hooks/use-toast';

interface EpisodeRow {
  id: string;
  title: string;
  episode_number: number;
  video_url: string;
  thumbnail_url: string | null;
  duration?: string | null;
}

interface SeriesRow {
  id: string;
  title: string;
  description: string;
  image_url: string;
  rating?: number | null;
  release_date?: string | null;
  genre?: string | null;
  episodes: number;
}

const SeriesDetailScreen = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { addDownload } = useDownloads();
  const { toast } = useToast();

  useEffect(() => {
    if (!seriesId) return;

    (async () => {
      setLoading(true);
      // Fetch series meta
      const { data: seriesData, error: seriesErr } = await supabase
        .from('series_meta')
        .select('*')
        .eq('id', seriesId)
        .single();

      if (seriesErr) {
        console.error('Failed to fetch series', seriesErr);
      } else {
        setSeries(seriesData as SeriesRow);
      }

      // Fetch episodes list
      const { data: epData, error: epErr } = await supabase
        .from('episodes')
        .select('*')
        .eq('series_id', seriesId)
        .order('episode_number', { ascending: true });

      if (epErr) {
        console.error('Failed to fetch episodes', epErr);
      } else {
        setEpisodes(epData as EpisodeRow[]);
      }

      setLoading(false);
    })();
  }, [seriesId]);

  const handlePlayEpisode = (episodeNumber: number) => {
    navigate(`/watch/${seriesId}/${episodeNumber}`);
  };

  const handleDownloadEpisode = async (episodeId: string) => {
    if (!seriesId) return;

    const episode = episodes.find((e) => e.id === episodeId);
    if (!episode) return;

    const quality = localStorage.getItem('pitara_download_quality') || '1080p';

    // Assuming Bunny.net serves quality variants via replacing {quality} placeholder
    // e.g., https://cdn.example.com/video_1080p.mp4
    const remoteUrl = episode.video_url.includes('{quality}')
      ? episode.video_url.replace('{quality}', quality)
      : episode.video_url;

    try {
      await addDownload(seriesId, episodeId, remoteUrl, quality);

      toast({
        title: 'Download Started',
        description: `Episode download queued at ${quality} quality.`
      });
    } catch (err) {
      console.error('Failed to start download', err);
      toast({
        title: 'Failed to queue download',
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pitara-dark pt-20 flex items-center justify-center text-white">Loading...</div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-pitara-dark pt-20 flex items-center justify-center text-white">Series not found</div>
    );
  }

  return (
    <div className="min-h-screen bg-pitara-dark text-white pt-20 pb-20">
      {/* Hero Section */}
      <motion.div
        className="relative h-96 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <img
          src={series.image_url}
          alt={series.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pitara-dark via-pitara-dark/50 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6">
          <motion.h1
            className="text-4xl font-bold mb-2"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {series.title}
          </motion.h1>
          
          <motion.div
            className="flex items-center space-x-4 mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center space-x-1">
              <Star className="w-5 h-5 text-pitara-gold fill-current" />
              <span>{series.rating ?? 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-5 h-5 text-pitara-gray-light" />
              <span>{series.release_date ?? ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-5 h-5 text-pitara-gray-light" />
              <span>{series.episodes} Episodes</span>
            </div>
          </motion.div>

          <motion.div
            className="flex space-x-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button
              onClick={() => handlePlayEpisode(1)}
              className="bg-pitara-gold hover:bg-pitara-gold/90 text-black font-semibold"
            >
              <Play className="w-5 h-5 mr-2" />
              Play Episode 1
            </Button>
            <Button
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground/10 hover:text-foreground dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
              onClick={() => {
                // Batch download every episode
                episodes.forEach((ep) => handleDownloadEpisode(ep.id));
              }}
            >
              <Download className="w-5 h-5 mr-2" />
              Download All
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Description */}
      <motion.div
        className="px-6 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="text-xl font-semibold mb-3 text-pitara-gold">About</h2>
        <p className="text-pitara-gray-light leading-relaxed">
          {series.description}
        </p>
        <div className="mt-4">
          <span className="inline-block bg-pitara-purple/20 text-pitara-gold px-3 py-1 rounded-full text-sm">
            {series.genre ?? ''}
          </span>
        </div>
      </motion.div>

      {/* Episodes List */}
      <motion.div
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <h2 className="text-xl font-semibold mb-6 text-pitara-gold">Episodes</h2>
        <div className="space-y-4">
          {episodes.map((episode, index) => (
            <motion.div
              key={episode.id}
              className="bg-pitara-gray rounded-lg p-4 border border-pitara-purple/20 hover:border-pitara-gold/50 transition-all cursor-pointer"
              onClick={() => handlePlayEpisode(episode.episode_number)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-4">
                <img
                  src={episode.thumbnail_url ?? series.image_url}
                  alt={episode.title}
                  className="w-24 h-14 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{episode.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-pitara-gray-light">{episode.duration ?? ''}</span>
                    <div className="flex space-x-3">
                      <Play className="w-5 h-5 text-pitara-gold cursor-pointer" />
                      <Download
                        className="w-5 h-5 text-pitara-gold cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadEpisode(episode.id);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SeriesDetailScreen;
