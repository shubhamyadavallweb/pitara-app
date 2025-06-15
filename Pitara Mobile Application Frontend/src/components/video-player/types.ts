
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  brightness: number;
  playbackSpeed: number;
  resolution: string;
  showControls: boolean;
  showSpeedMenu: boolean;
  showResolutionMenu: boolean;
  showVolumeOverlay: boolean;
  showBrightnessOverlay: boolean;
  isFullscreen: boolean;
}

export interface TouchStart {
  x: number;
  y: number;
}

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const RESOLUTIONS = ['Auto', '360p', '480p', '720p', '1080p'];
