import { env } from '../../config/env.js';
import { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './localStorageProvider.js';

export const storageProvider: IStorageProvider = new LocalStorageProvider(env.LOCAL_STORAGE_PATH);
