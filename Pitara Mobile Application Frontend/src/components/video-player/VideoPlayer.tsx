import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { VideoControls } from './VideoControls';
import { VolumeOverlay } from './VolumeOverlay';
import { BrightnessOverlay } from './BrightnessOverlay';
import { supabase } from '@/integrations/supabase/client';
import { useDownloads } from '@/hooks/useDownloads';

export const VideoPlayer: React.FC = () => {
  const { seriesId, episodeId } = useParams<{ seriesId: string; episodeId: string }>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { state, videoRef, handlers, speeds, resolutions } = useVideoPlayer(videoUrl);
  const navigate = useNavigate();
  const { downloads } = useDownloads();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seriesId || !episodeId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('episodes')
        .select('video_url')
        .eq('series_id', seriesId)
        .eq('episode_number', Number(episodeId))
        .single();

      if (error) {
        console.error('Failed to load episode video', error);
      } else {
        setVideoUrl(data?.video_url ?? null);
      }
      setLoading(false);
    })();
  }, [seriesId, episodeId]);

  // Prefer offline copy if available
  useEffect(() => {
    if (!seriesId || !episodeId) return;
    const entry = downloads.find(
      (d: any) => d.seriesId === seriesId && d.episodeId === episodeId && d.status === 'completed'
    );
    if (entry && entry.blob) {
      const objectUrl = URL.createObjectURL(entry.blob);
      setVideoUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [downloads, seriesId, episodeId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        Loading video...
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        Video unavailable
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Persistent Back Button */}
      <button
        aria-label="Back"
        onClick={handleBack}
        className="absolute top-4 left-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Video Container */}
      <div
        className="relative w-full h-full"
        onClick={handlers.toggleControls}
        onTouchStart={handlers.handleTouchStart}
        onTouchMove={handlers.handleTouchMove}
      >
        {/* Actual Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
          preload="metadata"
        />

        {/* Double-tap areas */}
        <div
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          onDoubleClick={(e) => handlers.handleDoubleClick(e, 'left')}
        />
        <div
          className="absolute right-0 top-0 w-1/3 h-full z-10"
          onDoubleClick={(e) => handlers.handleDoubleClick(e, 'right')}
        />

        {/* Volume Overlay */}
        <VolumeOverlay
          show={state.showVolumeOverlay}
          volume={state.volume * 100}
          onVolumeChange={handlers.setVolume}
        />

        {/* Brightness Overlay */}
        <BrightnessOverlay
          show={state.showBrightnessOverlay}
          brightness={state.brightness * 100}
          onBrightnessChange={handlers.setBrightness}
        />

        {/* Controls */}
        <VideoControls
          show={state.showControls}
          state={state}
          onPlayPause={handlers.handlePlayPause}
          onSeek={handlers.handleSeek}
          onSkipBackward={handlers.skipBackward}
          onSkipForward={handlers.skipForward}
          onToggleSpeedMenu={handlers.toggleSpeedMenu}
          onToggleResolutionMenu={handlers.toggleResolutionMenu}
          onSetPlaybackSpeed={handlers.setPlaybackSpeed}
          onSetResolution={handlers.setResolution}
          onSetVolume={handlers.setVolume}
          onEnterFullscreen={handlers.enterFullscreen}
          speeds={speeds}
          resolutions={resolutions}
          formatTime={handlers.formatTime}
        />
      </div>
    </div>
  );
};
