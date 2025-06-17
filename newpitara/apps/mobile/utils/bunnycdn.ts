import { ENV } from '../constants';

interface BunnyStreamingConfig {
  baseUrl: string;
  videoId: string;
  quality?: '480p' | '720p' | '1080p';
}

interface BunnyAsset {
  path: string;
  type: 'image' | 'video' | 'thumbnail';
}

export class BunnyCDN {
  private static baseUrl = ENV.BUNNY_CDN_URL || 'https://cdn.pitara.com';

  /**
   * Get the full CDN URL for an asset
   */
  static getAssetUrl(path: string): string {
    if (!path) return '';
    
    // If path already includes protocol, return as-is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    return `${this.baseUrl}/${cleanPath}`;
  }

  /**
   * Get optimized image URL with transformations
   */
  static getImageUrl(path: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }): string {
    const baseUrl = this.getAssetUrl(path);
    
    if (!options) return baseUrl;
    
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Get video streaming URL with quality options
   */
  static getVideoStreamUrl(videoPath: string, quality: '480p' | '720p' | '1080p' = '720p'): string {
    const baseUrl = this.getAssetUrl(videoPath);
    
    // For HLS streaming, append quality parameter
    if (videoPath.includes('.m3u8')) {
      return `${baseUrl}?quality=${quality}`;
    }
    
    return baseUrl;
  }

  /**
   * Get thumbnail URL for a video
   */
  static getVideoThumbnail(videoPath: string, timeOffset: number = 0): string {
    // Convert video path to thumbnail path
    const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '_thumb.jpg');
    
    const baseUrl = this.getAssetUrl(thumbnailPath);
    
    if (timeOffset > 0) {
      return `${baseUrl}?t=${timeOffset}`;
    }
    
    return baseUrl;
  }

  /**
   * Get poster image for a series
   */
  static getSeriesPoster(seriesId: string | number): string {
    return this.getAssetUrl(`series/${seriesId}/poster.jpg`);
  }

  /**
   * Get episode video URL
   */
  static getEpisodeVideo(seriesId: string | number, episodeNumber: number, quality: string = '720p'): string {
    const videoPath = `series/${seriesId}/episodes/${episodeNumber}/video_${quality}.mp4`;
    return this.getVideoStreamUrl(videoPath, quality as any);
  }

  /**
   * Get episode thumbnail
   */
  static getEpisodeThumbnail(seriesId: string | number, episodeNumber: number): string {
    const thumbnailPath = `series/${seriesId}/episodes/${episodeNumber}/thumb.jpg`;
    return this.getAssetUrl(thumbnailPath);
  }

  /**
   * Generate HLS playlist URL for adaptive streaming
   */
  static getHLSPlaylist(videoId: string): string {
    return this.getAssetUrl(`hls/${videoId}/playlist.m3u8`);
  }

  /**
   * Check if CDN is available
   */
  static async checkCDNHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('CDN health check failed:', error);
      return false;
    }
  }

  /**
   * Preload critical assets
   */
  static preloadAssets(assets: string[]): Promise<void[]> {
    const preloadPromises = assets.map(assetPath => {
      const url = this.getAssetUrl(assetPath);
      
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload ${url}`));
        img.src = url;
      });
    });
    
    return Promise.all(preloadPromises);
  }

  /**
   * Generate signed URL for protected content (if implemented)
   */
  static getSignedUrl(path: string, expiresIn: number = 3600): string {
    // This would integrate with your backend to generate signed URLs
    // For now, return regular URL
    return this.getAssetUrl(path);
  }
}

// Export convenient methods
export const {
  getAssetUrl,
  getImageUrl,
  getVideoStreamUrl,
  getVideoThumbnail,
  getSeriesPoster,
  getEpisodeVideo,
  getEpisodeThumbnail,
  getHLSPlaylist,
} = BunnyCDN; 