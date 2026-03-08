import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStorage } from '../types';
import { loadStorageAsync, saveStorageAsync } from '../utils/storage';
import { DEFAULT_MELDERS } from '../data/melders';
import { DEFAULT_ROLES } from '../data/roles';

const LOADING_PLACEHOLDER: AppStorage = { melders: DEFAULT_MELDERS, reports: [], roles: DEFAULT_ROLES, version: 1 };

export function useStorage() {
  const [storage, setStorage] = useState<AppStorage>(LOADING_PLACEHOLDER);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // Load from server on mount
  useEffect(() => {
    loadStorageAsync().then((data) => {
      setStorage(data);
      setLoading(false);
      initialized.current = true;
    });
  }, []);

  // Debounced save on every change after initial load
  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveStorageAsync(storage);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [storage]);

  const update = useCallback((updater: (prev: AppStorage) => AppStorage) => {
    setStorage((prev) => updater(prev));
  }, []);

  return { storage, update, loading };
}
