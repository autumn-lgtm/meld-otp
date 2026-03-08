import { useCallback, useEffect, useState } from 'react';
import type { AppStorage } from '../types';
import { loadStorage, saveStorage } from '../utils/storage';

export function useStorage() {
  const [storage, setStorage] = useState<AppStorage>(() => loadStorage());

  useEffect(() => {
    saveStorage(storage);
  }, [storage]);

  const update = useCallback((updater: (prev: AppStorage) => AppStorage) => {
    setStorage((prev) => updater(prev));
  }, []);

  return { storage, update };
}
