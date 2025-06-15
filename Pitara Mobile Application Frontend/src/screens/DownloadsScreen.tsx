import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Download, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDownloads } from '@/hooks/useDownloads';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

const DownloadsScreen = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Real downloads fetched from Supabase
  const { downloads, removeDownload } = useDownloads();

  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  const seriesMap = React.useMemo(() => new Map(seriesList.map((s) => [s.id, s])), [seriesList]);

  useEffect(() => {
    const fetchSeries = async () => {
      setLoadingSeries(true);
      const { data, error: seriesErr } = await supabase
        .from('series_meta')
        .select('*')
        .order('title');
      if (seriesErr) {
        console.error('Failed to load series list', seriesErr);
      } else {
        setSeriesList(data ?? []);
      }
      setLoadingSeries(false);
    };

    fetchSeries();
  }, []);

  const handlePlayDownload = (seriesId: string, episodeId: string) => {
    navigate(`/watch/${seriesId}/${episodeId}`);
  };

  const handleDeleteDownload = (downloadId: string) => {
    removeDownload(downloadId).catch(console.error);
  };

  const completedDownloads = downloads.filter(d => d.status === 'completed');
  const activeDownloads = downloads.filter(d => d.status !== 'completed');

  // Identify series not yet downloaded by user
  const downloadedSeriesIds = new Set(downloads.map((d) => d.seriesId));
  const availableSeries = seriesList.filter((s) => !downloadedSeriesIds.has(s.id));

  if (loadingSeries) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <LoadingSpinner text="Loading downloads..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-20 px-4">
      {/* Connection Status */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Downloads</h1>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
          isOnline ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </motion.div>

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Currently Downloading</h2>
          <div className="space-y-4">
            {activeDownloads.map((download) => (
              <div key={download.id} className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-4">
                  <img
                    src={seriesMap.get(download.seriesId)?.image_url}
                    alt={seriesMap.get(download.seriesId)?.title || ''}
                    className="w-16 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{seriesMap.get(download.seriesId)?.title}</h3>
                    <p className="text-sm text-muted-foreground">Episode {download.episodeId}</p>
                    <p className="text-xs text-muted-foreground">{download.status}</p>
                    
                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{download.status}</span>
                        <span></span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(download.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteDownload(download.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Completed Downloads */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Downloaded</h2>
        
        {completedDownloads.length === 0 ? (
          <div className="text-center py-12">
            <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Downloads</h3>
            <p className="text-muted-foreground">Your downloaded content will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {completedDownloads.map((download, index) => (
              <motion.div
                key={download.id}
                className="bg-card rounded-lg p-4 border border-border cursor-pointer hover:bg-card/80 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handlePlayDownload(download.seriesId, download.episodeId)}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={seriesMap.get(download.seriesId)?.image_url}
                      alt={seriesMap.get(download.seriesId)?.title || ''}
                      className="w-16 h-20 rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{seriesMap.get(download.seriesId)?.title}</h3>
                    <p className="text-sm text-muted-foreground">Episode {download.episodeId}</p>
                    <p className="text-xs text-muted-foreground">
                      {download.status} • {new Date(download.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayDownload(download.seriesId, download.episodeId);
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDownload(download.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Available Series to Download */}
      {availableSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Browse Series</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {availableSeries.map((series) => (
              <div
                key={series.id}
                className="cursor-pointer group"
                onClick={() => navigate(`/series/${series.id}`)}
              >
                <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-border">
                  <img
                    src={series.image_url}
                    alt={series.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="mt-2 text-center text-sm text-foreground truncate" title={series.title}>{series.title}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DownloadsScreen;
