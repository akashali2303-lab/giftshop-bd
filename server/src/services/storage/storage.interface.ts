import { Readable } from 'stream';

export interface StoredFileMeta {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IStorageProvider {
  saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StoredFileMeta>;
  getFileStream(storageKey: string): Promise<{ stream: Readable; mimeType: string; sizeBytes: number }>;
  deleteFile(storageKey: string): Promise<void>;
  fileExists(storageKey: string): Promise<boolean>;
}
