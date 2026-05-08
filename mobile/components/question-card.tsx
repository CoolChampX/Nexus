import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { useAppearance } from '@/lib/appearance';
import { Question } from '@/lib/forum-api';

import { QuestionAnswerPreviewCarousel } from './question-answer-preview-carousel';
import { ThemedText } from './themed-text';

type QuestionCardProps = {
  index?: number;
  question: Question;
  onPress?: () => void;
  onVote?: (value: -1 | 1) => void;
};

const formatRelativeTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.round(diffHours / 24)}d`;
};

export function QuestionCard({ index = 0, question, onPress, onVote }: QuestionCardProps) {
  const { palette, resolvedScheme } = useAppearance();
  const authorName = question.author?.name?.trim() || question.authorId;
  const authorEmail = question.author?.email?.trim() || question.authorId;
  const avatarSource = question.author?.avatarImageUrl?.trim() || undefined;
  const avatarColor = question.author?.avatarColor || palette.accent;
  const initials = authorName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const answerCount = Math.max(question.answerCount ?? 0, 0);
  const voteScore = Math.max(question.voteScore, 0);
  const activeUpvote = question.currentUserVote === 1;
  const activeDownvote = question.currentUserVote === -1;
  const elevatedSurface = resolvedScheme === 'dark' ? '#162033' : '#FFFFFF';
  const mutedSurface = resolvedScheme === 'dark' ? '#0F172A' : '#F8FAFC';
  const entrance = useRef(new Animated.Value(0)).current;
  const accentDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 70, 350),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(accentDrift, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(accentDrift, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [accentDrift]);

  const entranceTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const cardScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });
  const accentTranslateX = accentDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 28],
  });
  const accentOpacity = accentDrift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.24, 0.1],
  });

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{ translateY: entranceTranslateY }, { scale: cardScale }],
      }}>
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: elevatedSurface,
            borderColor: palette.border,
          },
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cardAccentGlow,
            {
              backgroundColor: palette.accentSoft,
              opacity: accentOpacity,
              transform: [{ translateX: accentTranslateX }, { rotate: '-10deg' }],
            },
          ]}
        />

        <View style={styles.header}>
          <View style={styles.authorRow}>
            {avatarSource ? (
              <Image source={avatarSource} contentFit="cover" style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </View>
            )}

            <View style={styles.authorCopy}>
              <ThemedText style={[styles.authorName, { color: palette.text }]}>{authorName}</ThemedText>
              <ThemedText style={[styles.authorMeta, { color: palette.muted }]}>
                {authorEmail} • {formatRelativeTime(question.createdAt)}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.answerPill, { backgroundColor: palette.accentSoft }]}>
            <ThemedText style={[styles.answerPillText, { color: palette.accent }]}>
              {answerCount} answers
            </ThemedText>
          </View>
        </View>

        <View style={styles.bodyColumn}>
          <ThemedText numberOfLines={2} style={[styles.title, { color: palette.text }]}>
            {question.title}
          </ThemedText>
          <ThemedText numberOfLines={3} style={[styles.body, { color: palette.muted }]}>
            {question.body}
          </ThemedText>
          {question.codeSnippet.trim() ? (
            <View style={styles.codePreview}>
              <ThemedText numberOfLines={4} style={styles.codePreviewText}>
                {question.codeSnippet}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <QuestionAnswerPreviewCarousel questionId={question._id} />

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <View style={styles.voteRow}>
            <Pressable
              hitSlop={8}
              onPress={() => onVote?.(1)}
              style={[
                styles.voteButton,
                {
                  backgroundColor: activeUpvote ? palette.accentSoft : mutedSurface,
                  borderColor: activeUpvote ? palette.accent : palette.border,
                },
              ]}>
              <MaterialIcons
                name="keyboard-arrow-up"
                size={20}
                color={activeUpvote ? palette.accent : palette.muted}
              />
            </Pressable>
            <ThemedText style={[styles.voteScore, { color: palette.text }]}>{voteScore}</ThemedText>
            <Pressable
              hitSlop={8}
              onPress={() => onVote?.(-1)}
              style={[
                styles.voteButton,
                {
                  backgroundColor: activeDownvote ? palette.dangerSoft : mutedSurface,
                  borderColor: activeDownvote ? palette.danger : palette.border,
                },
              ]}>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={activeDownvote ? palette.danger : palette.muted}
              />
            </Pressable>
          </View>

          <View style={styles.metaStats}>
            <View style={styles.metaStat}>
              <MaterialIcons name="chat-bubble-outline" size={16} color={palette.muted} />
              <ThemedText style={[styles.metaStatText, { color: palette.muted }]}>
                {answerCount}
              </ThemedText>
            </View>
            <View style={styles.metaStat}>
              <MaterialIcons name="code" size={16} color={palette.muted} />
              <ThemedText style={[styles.metaStatText, { color: palette.muted }]}>
                {question.codeSnippet.trim() ? 'Snippet' : 'Discussion'}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  answerPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  answerPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  authorCopy: {
    flex: 1,
    gap: 2,
  },
  authorMeta: {
    fontSize: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '800',
  },
  authorRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarImage: {
    borderRadius: 999,
    height: 48,
    width: 48,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  bodyColumn: {
    gap: 8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginHorizontal: 16,
    marginTop: 14,
    overflow: 'hidden',
    padding: 16,
  },
  cardAccentGlow: {
    borderRadius: 999,
    height: 124,
    position: 'absolute',
    right: -24,
    top: -20,
    width: 124,
  },
  codePreview: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 12,
  },
  codePreviewText: {
    color: '#DCE7F5',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metaStat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  metaStats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  metaStatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 27,
  },
  voteButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  voteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  voteScore: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'center',
  },
});
