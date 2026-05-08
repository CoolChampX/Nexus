import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';
import {
  clearAiExplainerHistoryEntries,
  getAiExplainerHistoryEntries,
  preloadAiExplainerHistoryEntries,
  type AiExplainerHistoryEntry,
} from '@/lib/ai-explainer-history';

const formatTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
};

const previewCode = (code: string) =>
  code
    .trim()
    .split('\n')
    .join(' ')
    .slice(0, 120);

export default function AiHistoryScreen() {
  const { palette } = useAppearance();
  const isFocused = useIsFocused();
  const [entries, setEntries] = useState<AiExplainerHistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let isActive = true;

    const loadEntries = async () => {
      setIsLoading(true);

      try {
        await preloadAiExplainerHistoryEntries();
        const nextEntries = await getAiExplainerHistoryEntries();

        if (isActive) {
          setEntries(nextEntries);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadEntries();

    return () => {
      isActive = false;
    };
  }, [isFocused]);

  const clearHistory = () => {
    Alert.alert('Clear history', 'Remove all AI explainer history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearAiExplainerHistoryEntries();
            setExpandedId(null);
            setEntries([]);
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}>
      <View style={styles.topActions}>
        <View />
        <Pressable
          onPress={clearHistory}
          style={[styles.deleteButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
        </Pressable>
      </View>
      {isLoading ? (
        <View style={[styles.emptyState, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>Loading history...</ThemedText>
        </View>
      ) : entries.length ? (
        entries.map((entry) => {
          const expanded = expandedId === entry.id;

          return (
            <Pressable
              key={entry.id}
              onPress={() => setExpandedId(expanded ? null : entry.id)}
              style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.cardTop}>
                <View style={styles.metaBlock}>
                  <ThemedText style={[styles.metaEyebrow, { color: palette.accent }]}>
                    {entry.result.detectedLanguage} • {entry.mode.replace(/_/g, ' ')}
                  </ThemedText>
                  <ThemedText style={[styles.codePreview, { color: palette.text }]}>
                    {previewCode(entry.code)}
                  </ThemedText>
                </View>
                <MaterialIcons
                  name={expanded ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={palette.muted}
                />
              </View>

              <ThemedText style={[styles.summary, { color: palette.muted }]}>
                {entry.result.summary}
              </ThemedText>
              <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
                {formatTime(entry.createdAt)}
              </ThemedText>

              {expanded ? (
                <View style={[styles.expandedBlock, { borderTopColor: palette.border }]}>
                  <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Code</ThemedText>
                  <View
                    style={[styles.codeShell, { backgroundColor: palette.background, borderColor: palette.border }]}>
                    <ThemedText style={[styles.codeText, { color: palette.text }]}>{entry.code}</ThemedText>
                  </View>

                  <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>What it meant</ThemedText>
                  <ThemedText style={[styles.sectionBody, { color: palette.text }]}>
                    {entry.result.whatItDoes}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        })
      ) : (
        <View style={[styles.emptyState, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No AI explainer history yet</ThemedText>
          <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
            Explain a code snippet and it will show up here.
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  codePreview: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  codeShell: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  content: {
    gap: 14,
    padding: 16,
  },
  deleteButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  expandedBlock: {
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  metaBlock: {
    flex: 1,
    gap: 4,
  },
  metaEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  screen: {
    flex: 1,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  summary: {
    fontSize: 13,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
