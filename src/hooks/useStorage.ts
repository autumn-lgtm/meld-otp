import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStorage } from '../types';
import { loadStorageAsync, saveStorageAsync } from '../utils/storage';
import { DEFAULT_MELDERS } from '../data/melders';
import { DEFAULT_ROLES } from '../data/roles';

function defaultStorage(): AppStorage {
  return { melders: DEFAULT_MELDERS, reports: [], roles: DEFAULT_ROLES, version: 1 };
}

export function useStorage() {
  const [storage, setStorage] = useState<AppStorage>(defaultStorage);
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from server on mount — update silently when ready
  useEffect(() => {
    loadStorageAsync().then((data) => {
      initialized.current = true;
      setStorage(data);
    });
  }, []);

  // Debounced save after every change, but only after first load
  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveStorageAsync(storage), 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [storage]);

  const update = useCallback((updater: (prev: AppStorage) => AppStorage) => {
    setStorage((prev) => updater(prev));
  }, []);

  return { storage, update };
}
