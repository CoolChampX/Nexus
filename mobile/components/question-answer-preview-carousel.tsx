import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type Answer } from '@/lib/forum-api';

type QuestionAnswerPreviewCarouselProps = {
  questionId: string;
};

const AUTO_ADVANCE_MS = 2800;

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

export function QuestionAnswerPreviewCarousel({
  questionId,
}: QuestionAnswerPreviewCarouselProps) {
  const { palette, resolvedScheme } = useAppearance();
  const { width } = useWindowDimensions();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const translateIndex = useRef(new Animated.Value(0)).current;
  const indicatorAnimation = useRef(new Animated.Value(0)).current;
  const indicatorMorphAnimation = useRef(new Animated.Value(0)).current;
  const viewportWidth = Math.max(220, width - 92);

  useEffect(() => {
    let active = true;

    const loadAnswers = async () => {
      try {
        setLoading(true);
        const nextAnswers = await forumApi.listAnswers(questionId);

        if (!active) {
          return;
        }

        const topAnswers = [...nextAnswers]
          .sort((left, right) => {
            if (right.voteScore !== left.voteScore) {
              return right.voteScore - left.voteScore;
            }

            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
          })
          .slice(0, 3);

        setAnswers(topAnswers);
        translateIndex.setValue(0);
        indicatorAnimation.setValue(0);
        indicatorMorphAnimation.setValue(0);
      } catch {
        if (active) {
          setAnswers([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAnswers();

    return () => {
      active = false;
    };
  }, [indicatorAnimation, indicatorMorphAnimation, questionId, translateIndex]);

  useEffect(() => {
    translateIndex.stopAnimation();
    indicatorAnimation.stopAnimation();
    indicatorMorphAnimation.stopAnimation();
    translateIndex.setValue(0);
    indicatorAnimation.setValue(0);
    indicatorMorphAnimation.setValue(0);

    if (answers.length <= 1) {
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % answers.length;

      Animated.parallel([
        Animated.timing(translateIndex, {
          toValue: index,
          duration: 700,
          easing: Easing.out(Easing.bezier(0.22, 1, 0.36, 1)),
          useNativeDriver: true,
        }),
        Animated.spring(indicatorAnimation, {
          toValue: index,
          damping: 18,
          mass: 1,
          stiffness: 125,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(indicatorMorphAnimation, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(indicatorMorphAnimation, {
            toValue: 0,
            damping: 16,
            mass: 0.95,
            stiffness: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, AUTO_ADVANCE_MS);

    return () => {
      clearInterval(interval);
    };
  }, [answers.length, indicatorAnimation, indicatorMorphAnimation, translateIndex]);

  const trackTranslateX = useMemo(
    () =>
      translateIndex.interpolate({
        inputRange: [0, Math.max(answers.length - 1, 1)],
        outputRange: [0, -viewportWidth * Math.max(answers.length - 1, 1)],
      }),
    [answers.length, translateIndex, viewportWidth]
  );

  const dotSpacing = 18;
  const indicatorTranslateX = indicatorAnimation.interpolate({
    inputRange: [0, Math.max(answers.length - 1, 1)],
    outputRange: [0, dotSpacing * Math.max(answers.length - 1, 1)],
  });
  const activeDotScaleX = indicatorMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });
  const activeDotScaleY = indicatorMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.82],
  });
  const activeDotGlowScale = indicatorMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const activeDotGlowOpacity = indicatorMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.38],
  });

  const cardSurface = resolvedScheme === 'dark' ? '#0F172A' : '#F8FAFC';
  const metaSurface = resolvedScheme === 'dark' ? '#132033' : '#FFFFFF';

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: cardSurface,
          borderColor: palette.border,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText style={[styles.eyebrow, { color: palette.accent }]}>TOP ANSWERS</ThemedText>
          <ThemedText style={[styles.title, { color: palette.text }]}>
            {loading ? 'Loading answers...' : answers.length ? 'Highest-voted replies' : 'No answers yet'}
          </ThemedText>
        </View>
        <View style={styles.headerAction}>
          <BouncyPressable
            style={styles.viewAllButton}
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: '/questions/[questionId]',
                params: { questionId },
              })
            }>
            <ThemedText numberOfLines={1} style={[styles.viewAll, { color: palette.accent }]}>
              View all answers
            </ThemedText>
          </BouncyPressable>
        </View>
      </View>

      {answers.length ? (
        <>
          <View style={[styles.viewport, { width: viewportWidth }]}>
            <Animated.View
              style={[
                styles.track,
                {
                  width: viewportWidth * answers.length,
                  transform: [{ translateX: trackTranslateX }],
                },
              ]}>
              {answers.map((answer) => (
                <BouncyPressable
                  key={answer._id}
                  onPress={() =>
                    router.push({
                      pathname: '/questions/[questionId]',
                      params: { questionId },
                    })
                  }
                  style={{ width: viewportWidth }}>
                  <View
                    style={[
                      styles.answerCard,
                      {
                        backgroundColor: metaSurface,
                        borderColor: palette.border,
                      },
                    ]}>
                    <View style={styles.answerHeader}>
                      <View style={styles.answerIdentity}>
                        <View style={[styles.avatarShell, { borderColor: palette.border }]}>
                          {answer.author?.avatarImageUrl?.trim() ? (
                            <Image
                              source={answer.author.avatarImageUrl}
                              contentFit="cover"
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: palette.accentSoft }]}>
                              <ThemedText style={[styles.avatarInitials, { color: palette.accent }]}>
                                {(answer.author?.name?.trim() || answer.authorId)
                                  .split(' ')
                                  .map((part) => part[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase() || '?'}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.answerMeta}>
                        <ThemedText numberOfLines={1} style={[styles.answerAuthor, { color: palette.text }]}>
                          {answer.author?.name?.trim() || answer.authorId}
                        </ThemedText>
                        <ThemedText style={[styles.answerSubmeta, { color: palette.muted }]}>
                          {Math.max(answer.voteScore, 0)} upvotes - {formatRelativeTime(answer.createdAt)}
                        </ThemedText>
                      </View>
                      <MaterialIcons name="north-east" size={16} color={palette.muted} />
                    </View>
                    <ThemedText numberOfLines={3} style={[styles.answerBody, { color: palette.text }]}>
                      {answer.body}
                    </ThemedText>
                    {answer.codeSnippet.trim() ? (
                      <View style={[styles.codeBadge, { backgroundColor: palette.cardAlt }]}>
                        <MaterialIcons name="code" size={14} color={palette.accent} />
                        <ThemedText numberOfLines={1} style={[styles.codeBadgeText, { color: palette.accent }]}>
                          Includes code
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </BouncyPressable>
              ))}
            </Animated.View>
          </View>

          {answers.length > 1 ? (
            <View style={styles.indicatorWrap}>
              <View style={styles.indicatorDots}>
                {answers.map((answer, index) => (
                  <View
                    key={answer._id}
                    style={[
                      styles.indicatorDot,
                      { backgroundColor: palette.border },
                    ]}
                  />
                ))}
              </View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeDotGlow,
                  {
                    backgroundColor: palette.accentSoft,
                    opacity: activeDotGlowOpacity,
                    transform: [{ translateX: indicatorTranslateX }, { scale: activeDotGlowScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.indicatorActiveDot,
                  {
                    backgroundColor: palette.accent,
                    transform: [
                      { translateX: indicatorTranslateX },
                      { scaleX: activeDotScaleX },
                      { scaleY: activeDotScaleY },
                    ],
                  },
                ]}
              />
            </View>
          ) : null}
        </>
      ) : (
        <BouncyPressable
          onPress={() =>
            router.push({
              pathname: '/questions/[questionId]',
              params: { questionId },
            })
          }>
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: metaSurface,
                borderColor: palette.border,
              },
            ]}>
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>Start the thread</ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
              No answers yet. Open the thread and post the first solution.
            </ThemedText>
          </View>
        </BouncyPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 34,
    width: 34,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  avatarShell: {
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: '900',
  },
  answerAuthor: {
    fontSize: 14,
    fontWeight: '800',
  },
  answerBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  answerCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginRight: 10,
    minHeight: 116,
    padding: 14,
  },
  answerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  answerIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  answerMeta: {
    flex: 1,
    gap: 2,
  },
  answerSubmeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    minWidth: 112,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
    marginTop: 12,
    padding: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: 44,
    position: 'relative',
    width: '100%',
  },
  headerAction: {
    alignItems: 'flex-end',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 124,
  },
  indicatorActiveDot: {
    borderRadius: 999,
    height: 8,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 8,
  },
  indicatorDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  indicatorDots: {
    flexDirection: 'row',
    gap: 10,
  },
  indicatorWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 10,
    minWidth: 8,
    position: 'relative',
  },
  activeDotGlow: {
    borderRadius: 999,
    height: 10,
    left: -1,
    position: 'absolute',
    top: -1,
    width: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  track: {
    flexDirection: 'row',
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '800',
  },
  viewAllButton: {
    marginTop: 2,
    minWidth: 112,
  },
  viewport: {
    marginTop: 12,
    overflow: 'hidden',
  },
  wrapper: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    position: 'relative',
  },
});
