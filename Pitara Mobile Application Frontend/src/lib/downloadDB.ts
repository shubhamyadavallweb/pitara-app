import Dexie, { Table } from 'dexie';

export interface DownloadEntry {
  /** Unique key: `${seriesId}_${episodeId}_${quality}` */
  id: string;
  seriesId: string;
  episodeId: string;
  quality: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  /** 0-1 */
  progress: number;
  /** Original remote URL used for download */
  remoteUrl: string;
  /** Stored Blob once completed */
  blob?: Blob;
  createdAt: number;
}

class DownloadDB extends Dexie {
  downloads!: Table<DownloadEntry, string>;

  constructor() {
    super('pitara_downloads');
    this.version(1).stores({
      downloads: '&id, seriesId, episodeId, status, createdAt'
    });
  }
}

export const downloadDB = new DownloadDB(); 