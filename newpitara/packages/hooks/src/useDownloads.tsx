import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

interface DownloadItem {
  id: string;
  title: string;
  seriesId: string;
  seriesTitle: string;
  episodeId: string;
  episodeNumber: number;
  videoUrl: string;
  thumbnailUrl?: string;
  localPath?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  size?: number;
  downloadedAt?: string;
  quality: string;
}

const DOWNLOADS_KEY = '@pitara_downloads';

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDownloads = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (stored) {
        setDownloads(JSON.parse(stored));
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading downloads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDownloads = useCallback(async (newDownloads: DownloadItem[]) => {
    try {
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
      setDownloads(newDownloads);
    } catch (err: any) {
      setError(err.message);
      console.error('Error saving downloads:', err);
    }
  }, []);

  const addDownload = useCallback(async (item: Omit<DownloadItem, 'id' | 'status' | 'progress'>) => {
    const newDownload: DownloadItem = {
      ...item,
      id: Date.now().toString(),
      status: 'pending',
      progress: 0
    };

    const newDownloads = [...downloads, newDownload];
    await saveDownloads(newDownloads);
    return newDownload;
  }, [downloads, saveDownloads]);

  const startDownload = useCallback(async (downloadId: string) => {
    const download = downloads.find(d => d.id === downloadId);
    if (!download) return;

    try {
      const updatedDownloads = downloads.map(d => 
        d.id === downloadId ? { ...d, status: 'downloading' as const } : d
      );
      await saveDownloads(updatedDownloads);

      const fileName = `${download.seriesId}_${download.episodeId}.mp4`;
      const localPath = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        download.videoUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          const updatedDownloads = downloads.map(d => 
            d.id === downloadId ? { ...d, progress: progress * 100 } : d
          );
          setDownloads(updatedDownloads);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        const completedDownloads = downloads.map(d => 
          d.id === downloadId ? { 
            ...d, 
            status: 'completed' as const, 
            progress: 100,
            localPath: result.uri,
            downloadedAt: new Date().toISOString()
          } : d
        );
        await saveDownloads(completedDownloads);
      }
    } catch (err: any) {
      const failedDownloads = downloads.map(d => 
        d.id === downloadId ? { ...d, status: 'failed' as const } : d
      );
      await saveDownloads(failedDownloads);
      setError(err.message);
    }
  }, [downloads, saveDownloads]);

  const removeDownload = useCallback(async (downloadId: string) => {
    const download = downloads.find(d => d.id === downloadId);
    if (download?.localPath) {
      try {
        await FileSystem.deleteAsync(download.localPath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    const newDownloads = downloads.filter(d => d.id !== downloadId);
    await saveDownloads(newDownloads);
  }, [downloads, saveDownloads]);

  const clearAllDownloads = useCallback(async () => {
    for (const download of downloads) {
      if (download.localPath) {
        try {
          await FileSystem.deleteAsync(download.localPath);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
    }
    await saveDownloads([]);
  }, [downloads, saveDownloads]);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const completedDownloads = downloads.filter(d => d.status === 'completed');
  const pendingDownloads = downloads.filter(d => d.status === 'pending');
  const activeDownloads = downloads.filter(d => d.status === 'downloading');

  return {
    downloads,
    completedDownloads,
    pendingDownloads,
    activeDownloads,
    loading,
    error,
    addDownload,
    startDownload,
    removeDownload,
    clearAllDownloads,
    refresh: loadDownloads
  };
}; 