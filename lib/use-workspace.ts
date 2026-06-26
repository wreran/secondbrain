'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { type WorkspaceData } from '@/types';
import {
  getInitialWorkspaceSnapshot,
  loadWorkspace,
  saveWorkspace,
  WORKSPACE_STORAGE_EVENT,
  WORKSPACE_STORAGE_KEY,
} from '@/lib/workspace-store';

export function useWorkspace() {
  const workspace = useSyncExternalStore(
    (onStoreChange) => {
      const handleStorage = (event: Event) => {
        if (event instanceof StorageEvent && event.key && event.key !== WORKSPACE_STORAGE_KEY) {
          return;
        }
        onStoreChange();
      };

      window.addEventListener('storage', handleStorage);
      window.addEventListener(WORKSPACE_STORAGE_EVENT, handleStorage);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(WORKSPACE_STORAGE_EVENT, handleStorage);
      };
    },
    loadWorkspace,
    getInitialWorkspaceSnapshot
  );

  const updateWorkspace = useCallback((updater: (current: WorkspaceData) => WorkspaceData) => {
    const next = updater(loadWorkspace());
    saveWorkspace(next);
  }, []);

  return {
    workspace,
    isReady: true,
    updateWorkspace,
  };
}
