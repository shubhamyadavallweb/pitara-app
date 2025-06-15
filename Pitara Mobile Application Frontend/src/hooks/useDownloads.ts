import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { downloadDB, DownloadEntry } from '@/lib/downloadDB';

// Helper to stream-download a file with progress
async function fetchWithProgress(url: string, onProgress: (progress: number) => void): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error('Failed to download file');
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (contentLength) {
        onProgress(received / contentLength);
      }
    }
  }

  const blob = new Blob(chunks);
  onProgress(1);
  return blob;
}

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);

  const refreshDownloads = useCallback(async () => {
    const all = await downloadDB.downloads.orderBy('createdAt').reverse().toArray();
    setDownloads(all);
  }, []);

  useEffect(() => {
    refreshDownloads();

    // Dexie live updates via hooks
    const sub = downloadDB.downloads.hook('creating', () => refreshDownloads());
    const sub2 = downloadDB.downloads.hook('updating', () => refreshDownloads());
    const sub3 = downloadDB.downloads.hook('deleting', () => refreshDownloads());
    return () => {
      downloadDB.downloads.hook('creating').unsubscribe(sub);
      downloadDB.downloads.hook('updating').unsubscribe(sub2);
      downloadDB.downloads.hook('deleting').unsubscribe(sub3);
    };
  }, [refreshDownloads]);

  const addDownload = useCallback(
    async (seriesId: string, episodeId: string, remoteUrl: string, quality: string) => {
      const id = `${seriesId}_${episodeId}_${quality}_${uuidv4()}`;
      const entry: DownloadEntry = {
        id,
        seriesId,
        episodeId,
        quality,
        status: 'pending',
        progress: 0,
        remoteUrl,
        createdAt: Date.now()
      };
      await downloadDB.downloads.add(entry);

      // Start download in background (non-blocking)
      (async () => {
        try {
          await downloadDB.downloads.update(id, { status: 'downloading', progress: 0 });
          const blob = await fetchWithProgress(remoteUrl, async (p) => {
            await downloadDB.downloads.update(id, { progress: p });
          });
          await downloadDB.downloads.update(id, { status: 'completed', progress: 1, blob });
        } catch (err) {
          console.error('Download failed', err);
          await downloadDB.downloads.update(id, { status: 'failed' });
        }
      })();
    },
    []
  );

  const removeDownload = useCallback(async (downloadId: string) => {
    await downloadDB.downloads.delete(downloadId);
  }, []);

  return {
    downloads,
    addDownload,
    removeDownload,
    refreshDownloads,
  };
};
