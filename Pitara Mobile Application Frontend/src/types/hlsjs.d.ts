declare module 'hls.js' {
  // Minimal stub for Hls.js typings
  export default class Hls {
    static isSupported(): boolean;
    static Events: any;
    levels: { height?: number }[];
    currentLevel: number;
    loadSource(src: string): void;
    attachMedia(video: HTMLVideoElement): void;
    on(event: any, handler: (...args: any[]) => void): void;
    destroy(): void;
  }
} 