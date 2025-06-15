import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoPlayerState, SPEEDS, RESOLUTIONS } from '../components/video-player/types';
import Hls from 'hls.js';

export const useVideoPlayer = (src?: string | null) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Initial state – duration will be updated once metadata is loaded
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    brightness: 1,
    playbackSpeed: 1,
    resolution: 'Auto',
    showControls: true,
    showSpeedMenu: false,
    showResolutionMenu: false,
    showVolumeOverlay: false,
    showBrightnessOverlay: false,
    isFullscreen: false,
  });

  // Expose dynamic resolutions discovered from HLS manifest
  const [availableResolutions, setAvailableResolutions] = useState<string[]>(RESOLUTIONS);

  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  // Auto-hide controls after 3 seconds
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    setState(prev => ({ ...prev, showControls: true }));
    
    const timeout = setTimeout(() => {
      setState(prev => ({ ...prev, showControls: false }));
    }, 3000);
    
    setControlsTimeout(timeout);
  }, [controlsTimeout]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleSeek = useCallback((values: number[]) => {
    const time = values[0];
    console.log('Seeking to:', time);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const skipBackward = useCallback(() => {
    console.log('Skipping backward');
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 10);
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const skipForward = useCallback(() => {
    console.log('Skipping forward');
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const setVolume = useCallback((volume: number) => {
    console.log('Volume set to:', volume);
    const video = videoRef.current;
    if (video) {
      video.volume = volume / 100;
    }
    setState(prev => ({ ...prev, volume: volume / 100 }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const setBrightness = useCallback((brightness: number) => {
    console.log('Brightness set to:', brightness);
    const newBrightness = brightness / 100;
    const video = videoRef.current;
    if (video) {
      (video.style as any).filter = `brightness(${newBrightness})`;
    }
    setState(prev => ({ ...prev, brightness: newBrightness }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    console.log('Playback speed set to:', speed);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
    setState(prev => ({ 
      ...prev, 
      playbackSpeed: speed,
      showSpeedMenu: false 
    }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const setResolution = useCallback((resolution: string) => {
    console.log('Resolution set to:', resolution);

    if (hlsRef.current) {
      if (resolution === 'Auto') {
        hlsRef.current.currentLevel = -1; // Let hls.js decide
      } else {
        const height = parseInt(resolution.replace('p', ''));
        const levelIndex = hlsRef.current.levels.findIndex(l => l.height === height);
        if (levelIndex !== -1) {
          hlsRef.current.currentLevel = levelIndex;
        }
      }
    }

    setState(prev => ({ 
      ...prev, 
      resolution,
      showResolutionMenu: false 
    }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleSpeedMenu = useCallback(() => {
    console.log('Speed menu toggled');
    setState(prev => ({ 
      ...prev, 
      showSpeedMenu: !prev.showSpeedMenu,
      showResolutionMenu: false 
    }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleResolutionMenu = useCallback(() => {
    console.log('Resolution menu toggled');
    setState(prev => ({ 
      ...prev, 
      showResolutionMenu: !prev.showResolutionMenu,
      showSpeedMenu: false 
    }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const enterFullscreen = useCallback(() => {
    console.log('Entering fullscreen');
    setState(prev => ({ ...prev, isFullscreen: true }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleControls = useCallback(() => {
    console.log('Controls toggled');
    setState(prev => ({ ...prev, showControls: !prev.showControls }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    console.log('Touch started at:', { x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Vertical swipe on right side for volume
    if (touchStart.x > window.innerWidth * 0.6) {
      const volumeDelta = -deltaY / 3;
      const newVolume = Math.max(0, Math.min(100, state.volume * 100 + volumeDelta));
      setState(prev => ({ 
        ...prev, 
        volume: newVolume / 100,
        showVolumeOverlay: true 
      }));
    }
    // Vertical swipe on left side for brightness
    else if (touchStart.x < window.innerWidth * 0.4) {
      const brightnessDelta = -deltaY / 3;
      const newBrightness = Math.max(0, Math.min(100, state.brightness * 100 + brightnessDelta));
      setState(prev => ({ 
        ...prev, 
        brightness: newBrightness / 100,
        showBrightnessOverlay: true 
      }));
    }
  }, [touchStart, state.volume, state.brightness]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    console.log('Double click on:', side);
    if (side === 'left') {
      skipBackward();
    } else {
      skipForward();
    }
  }, [skipBackward, skipForward]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Hide overlays after 2 seconds
  useEffect(() => {
    if (state.showVolumeOverlay) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, showVolumeOverlay: false }));
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.showVolumeOverlay]);

  useEffect(() => {
    if (state.showBrightnessOverlay) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, showBrightnessOverlay: false }));
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.showBrightnessOverlay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  /* --------------------------------------------------
   * Sync React state with underlying <video> element
   * ------------------------------------------------*/

  // Attach basic event listeners once the ref becomes available
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: video.duration }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: video.currentTime }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Ensure video element stays in sync with React state changes that
  // may originate from keyboard shortcuts or other external factors.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - state.currentTime) > 0.25) {
      video.currentTime = state.currentTime;
    }
    if (video.volume !== state.volume) {
      video.volume = state.volume;
    }
    if (video.playbackRate !== state.playbackSpeed) {
      video.playbackRate = state.playbackSpeed;
    }
  }, [state.currentTime, state.volume, state.playbackSpeed]);

  /* --------------------------------------------------
   *  Initialise / update HLS instance whenever src changes
   * ------------------------------------------------*/

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup existing instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // If browser can natively play HLS (Safari/iOS) or src is not m3u8 just set src directly
    if (video.canPlayType('application/vnd.apple.mpegurl') || !src.endsWith('.m3u8')) {
      video.src = src;
      return;
    }

    // Otherwise use hls.js for adaptive streaming
    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // Build list of unique heights available from the manifest
      const heightsSet = new Set<number>(
        hls.levels
          .map(l => l.height)
          .filter((h): h is number => typeof h === 'number')
      );
      const heights = Array.from(heightsSet).sort((a, b) => a - b);
      const res = ['Auto', ...heights.map(h => `${h}p`)];
      setAvailableResolutions(res);
    });

    hlsRef.current = hls;

    return () => {
      hls.destroy();
    };
  }, [src]);

  return {
    videoRef,
    state,
    handlers: {
      handlePlayPause,
      handleSeek,
      skipBackward,
      skipForward,
      setVolume,
      setBrightness,
      setPlaybackSpeed,
      setResolution,
      toggleSpeedMenu,
      toggleResolutionMenu,
      enterFullscreen,
      toggleControls,
      handleTouchStart,
      handleTouchMove,
      handleDoubleClick,
      formatTime,
    },
    speeds: SPEEDS,
    resolutions: availableResolutions,
  };
};
