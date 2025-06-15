import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Maximize, Settings, RotateCcw, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VideoPlayerState } from './types';

interface VideoControlsProps {
  show: boolean;
  state: VideoPlayerState;
  onPlayPause: () => void;
  onSeek: (value: number[]) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onToggleSpeedMenu: () => void;
  onToggleResolutionMenu: () => void;
  onSetPlaybackSpeed: (speed: number) => void;
  onSetResolution: (resolution: string) => void;
  onSetVolume: (volume: number) => void;
  onEnterFullscreen: () => void;
  speeds: number[];
  resolutions: string[];
  formatTime: (seconds: number) => string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  show,
  state,
  onPlayPause,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onToggleSpeedMenu,
  onToggleResolutionMenu,
  onSetPlaybackSpeed,
  onSetResolution,
  onSetVolume,
  onEnterFullscreen,
  speeds,
  resolutions,
  formatTime,
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    console.log('Back button clicked - navigating to previous page');
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleRotationToggle = () => {
    console.log('Rotation toggle clicked');
    try {
      if ('screen' in window && 'orientation' in screen) {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.lock === 'function') {
          orientation.lock('landscape').catch(() => {
            console.log('Screen rotation not supported');
          });
        }
      }
    } catch (error) {
      console.log('Screen rotation not available');
    }
  };

  const handleFullscreen = () => {
    console.log('Fullscreen button clicked');
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
      onEnterFullscreen();
    } catch (error) {
      console.log('Fullscreen not supported');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-transparent to-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleRotationToggle}
              >
                <RotateCcw className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Center Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPlayPause}
              className="text-white hover:bg-white/20 w-20 h-20 rounded-full bg-black/30"
            >
              {state.isPlaying ? (
                <Pause className="w-10 h-10" />
              ) : (
                <Play className="w-10 h-10 ml-1" />
              )}
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[state.currentTime]}
                onValueChange={onSeek}
                max={state.duration}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-white text-sm mt-2">
                <span>{formatTime(state.currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-6 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onSkipBackward}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-6 h-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onPlayPause}
                className="text-white hover:bg-white/20 w-16 h-16"
              >
                {state.isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onSkipForward}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>

            {/* Additional Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Volume Control */}
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-5 h-5 text-white" />
                  <div className="w-20">
                    <Slider
                      value={[state.volume * 100]}
                      onValueChange={(vals) => vals.length && onSetVolume(vals[0])}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Speed Control */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    onClick={onToggleSpeedMenu}
                    className="text-white hover:bg-white/20 text-sm"
                  >
                    {state.playbackSpeed}×
                  </Button>
                  {state.showSpeedMenu && (
                    <div className="absolute bottom-full mb-2 bg-black/90 rounded-lg p-2">
                      {speeds.map((speed) => (
                        <Button
                          key={speed}
                          variant="ghost"
                          onClick={() => onSetPlaybackSpeed(speed)}
                          className="text-white hover:bg-white/20 w-full text-sm"
                        >
                          {speed}×
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolution Control */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    onClick={onToggleResolutionMenu}
                    className="text-white hover:bg-white/20 text-sm"
                  >
                    {state.resolution}
                  </Button>
                  {state.showResolutionMenu && (
                    <div className="absolute bottom-full mb-2 bg-black/90 rounded-lg p-2">
                      {resolutions.map((res) => (
                        <Button
                          key={res}
                          variant="ghost"
                          onClick={() => onSetResolution(res)}
                          className="text-white hover:bg-white/20 w-full text-sm"
                        >
                          {res}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
