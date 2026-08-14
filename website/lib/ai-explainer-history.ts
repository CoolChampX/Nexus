import * as FileSystem from 'expo-file-system/legacy';

import type { ExplainMode, ExplainResponse } from './forum-api';

export type AiExplainerHistoryEntry = {
  id: string;
  code: string;
  mode: ExplainMode;
  result: ExplainResponse;
  createdAt: string;
};

const HISTORY_LIMIT = 25;
const HISTORY_FILE_URI = `${FileSystem.documentDirectory ?? ''}ai-explainer-history.json`;
const historyEntries: AiExplainerHistoryEntry[] = [];

let hasLoadedHistory = false;
let loadHistoryPromise: Promise<AiExplainerHistoryEntry[]> | null = null;

const persistAiExplainerHistoryEntries = async () => {
  if (!FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.writeAsStringAsync(HISTORY_FILE_URI, JSON.stringify(historyEntries));
};

const isAiExplainerHistoryEntry = (value: unknown): value is AiExplainerHistoryEntry => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<AiExplainerHistoryEntry>;

  return (
    typeof entry.id === 'string' &&
    typeof entry.code === 'string' &&
    typeof entry.mode === 'string' &&
    typeof entry.createdAt === 'string' &&
    !!entry.result &&
    typeof entry.result === 'object'
  );
};

export const preloadAiExplainerHistoryEntries = async () => {
  if (hasLoadedHistory) {
    return [...historyEntries];
  }

  if (loadHistoryPromise) {
    return loadHistoryPromise;
  }

  loadHistoryPromise = (async () => {
    if (!FileSystem.documentDirectory) {
      hasLoadedHistory = true;
      return [...historyEntries];
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(HISTORY_FILE_URI);

      if (!fileInfo.exists) {
        historyEntries.length = 0;
        hasLoadedHistory = true;
        return [...historyEntries];
      }

      const rawHistory = await FileSystem.readAsStringAsync(HISTORY_FILE_URI);
      const parsedHistory = JSON.parse(rawHistory);

      historyEntries.length = 0;

      if (Array.isArray(parsedHistory)) {
        historyEntries.push(...parsedHistory.filter(isAiExplainerHistoryEntry).slice(0, HISTORY_LIMIT));
      }
    } catch {
      historyEntries.length = 0;
    } finally {
      hasLoadedHistory = true;
      loadHistoryPromise = null;
    }

    return [...historyEntries];
  })();

  return loadHistoryPromise;
};

export const addAiExplainerHistoryEntry = async (
  entry: Omit<AiExplainerHistoryEntry, 'id' | 'createdAt'>
) => {
  await preloadAiExplainerHistoryEntries();

  const nextEntry: AiExplainerHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  historyEntries.unshift(nextEntry);

  if (historyEntries.length > HISTORY_LIMIT) {
    historyEntries.length = HISTORY_LIMIT;
  }

  await persistAiExplainerHistoryEntries();

  return nextEntry;
};

export const getAiExplainerHistoryEntries = async () => {
  await preloadAiExplainerHistoryEntries();
  return [...historyEntries];
};

export const clearAiExplainerHistoryEntries = async () => {
  await preloadAiExplainerHistoryEntries();
  historyEntries.length = 0;
  await persistAiExplainerHistoryEntries();
};
