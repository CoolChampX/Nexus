import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedRefreshIndicator } from '@/components/feed-refresh-indicator';
import { NexusLogo } from '@/components/nexus-logo';
import { QuestionCard } from '@/components/question-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type Question } from '@/lib/forum-api';
import { animateLayoutTransition, enableLayoutTransitions } from '@/lib/ui-transitions';

const FILTER_OPTIONS = ['Python', 'JavaScript', 'TypeScript', 'SQL', 'React', 'Node', 'Java', 'C++'];
const FEED_TABS = ['Newest', 'Active', 'Unanswered'] as const;
const FLOATING_BUTTON_WIDTH = 160;
const FLOATING_TAB_BAR_HEIGHT = 78;
const FLOATING_TAB_BAR_OFFSET = 8;
const ASK_BUTTON_GAP = 12;

type FeedTab = (typeof FEED_TABS)[number];

const isAuthErrorMessage = (message: string) =>
  message === 'Not authenticated.' ||
  message === 'Unauthorized' ||
  message === 'User not found.' ||
  message === 'This account has been disabled. Please contact an administrator.';

const getOptimisticVoteState = (
  currentVote: -1 | 0 | 1 | undefined,
  currentScore: number,
  pressedValue: -1 | 1
) => {
  const normalizedCurrentVote = currentVote ?? 0;
  const nextVote = normalizedCurrentVote === pressedValue ? 0 : pressedValue;

  return {
    currentUserVote: nextVote as -1 | 0 | 1,
    voteScore: Math.max(0, currentScore - normalizedCurrentVote + nextVote),
  };
};

export default function HomeScreen() {
  const isFocused = useIsFocused();
  const { logout, ready, isRefreshingSession, user } = useAuth();
  const { palette, resolvedScheme } = useAppearance();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [savedFilters, setSavedFilters] = useState<string[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>('Newest');
  const [feedTabsWidth, setFeedTabsWidth] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const feedTabAnimation = useRef(new Animated.Value(0)).current;
  const filterPanelAnimation = useRef(new Animated.Value(0)).current;
  const filterIconAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enableLayoutTransitions();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace('/auth');
    }
  }, [ready, user]);

  useEffect(() => {
    setSavedFilters(user?.preferredTags ?? []);
  }, [user?.preferredTags]);

  const loadQuestions = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!user) {
      return;
    }

    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError('');
      const nextQuestions = await forumApi.listQuestions();
      setQuestions(nextQuestions);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not load questions';

      if (isAuthErrorMessage(message)) {
        setQuestions([]);
        setError('');
        logout();
        router.replace('/auth');
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout, user]);

  const handleVote = async (questionId: string, value: -1 | 1) => {
    const previousQuestion = questions.find((question) => question._id === questionId);

    if (!previousQuestion) {
      return;
    }

    setQuestions((current) =>
      current.map((question) =>
        question._id === questionId
          ? {
              ...question,
              ...getOptimisticVoteState(question.currentUserVote, question.voteScore, value),
            }
          : question
      )
    );

    try {
      const result = await forumApi.castVote('question', questionId, value);
      setQuestions((current) =>
        current.map((question) =>
          question._id === questionId
            ? {
                ...question,
                voteScore: result.voteScore,
                currentUserVote: result.currentUserVote,
              }
            : question
        )
      );
    } catch (nextError) {
      setQuestions((current) =>
        current.map((question) => (question._id === questionId ? previousQuestion : question))
      );
      setError(nextError instanceof Error ? nextError.message : 'Could not update vote');
    }
  };

  useEffect(() => {
    if (isFocused && ready && user && !isRefreshingSession) {
      void loadQuestions();
    }
  }, [isFocused, isRefreshingSession, loadQuestions, ready, user]);

  useEffect(() => {
    if (isRefreshingSession) {
      setError('');
    }
  }, [isRefreshingSession]);

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextQuestions = questions.filter((question) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          question.title,
          question.body,
          question.tags.join(' '),
          question.authorId,
          question.author?.name ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesSavedFilters =
        savedFilters.length === 0 ||
        question.tags.some((tag) =>
          savedFilters.some((savedFilter) => savedFilter.toLowerCase() === tag.toLowerCase())
        );

      return matchesSearch && matchesSavedFilters;
    });

    if (activeFeedTab === 'Unanswered') {
      return nextQuestions.filter((question) => (question.answerCount ?? 0) === 0);
    }

    if (activeFeedTab === 'Active') {
      return [...nextQuestions].sort((left, right) => {
        const rightScore = (right.answerCount ?? 0) * 4 + right.voteScore;
        const leftScore = (left.answerCount ?? 0) * 4 + left.voteScore;
        return rightScore - leftScore;
      });
    }

    return [...nextQuestions].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [activeFeedTab, query, questions, savedFilters]);

  const totalAnswers = useMemo(
    () => questions.reduce((sum, question) => sum + (question.answerCount ?? 0), 0),
    [questions]
  );
  const appliedFilterCount = savedFilters.length;

  const isCompactScreen = width < 390;
  const heroTopPadding = Math.max(insets.top + 10, 22);
  const floatingTabBarBottom = Math.max(insets.bottom, 10) + FLOATING_TAB_BAR_OFFSET;
  const askButtonBottom = floatingTabBarBottom + FLOATING_TAB_BAR_HEIGHT + ASK_BUTTON_GAP;
  const askButtonRight = 16;
  const listBottomPadding = askButtonBottom + 72;
  const utilitySurface = resolvedScheme === 'dark' ? '#172033' : palette.card;
  const utilityBorder = resolvedScheme === 'dark' ? '#334155' : palette.border;
  const utilityText = resolvedScheme === 'dark' ? '#F8FAFC' : palette.text;
  const searchIconColor = resolvedScheme === 'dark' ? '#94A3B8' : palette.muted;
  const filterDrawerSurface = resolvedScheme === 'dark' ? '#101827' : palette.card;
  const filterDrawerChipText = resolvedScheme === 'dark' ? '#E2E8F0' : palette.text;
  const filterDrawerTitleColor = resolvedScheme === 'dark' ? '#F8FAFC' : palette.text;
  const headerAvatarSource = user?.avatarImageUrl?.trim() || undefined;
  const filterButtonActive = filterMenuOpen || appliedFilterCount > 0;
  const filterButtonSurface =
    filterButtonActive
      ? resolvedScheme === 'dark'
        ? '#1E293B'
        : '#FFF7ED'
      : utilitySurface;
  const filterButtonBorder =
    filterButtonActive
      ? resolvedScheme === 'dark'
        ? '#F59E0B'
        : '#FDBA74'
      : utilityBorder;
  const filterButtonIcon = filterButtonActive ? '#F59E0B' : utilityText;
  const feedTabSlotWidth = feedTabsWidth > 0 ? (feedTabsWidth - 12) / FEED_TABS.length : 0;
  const filterPanelTranslateY = filterPanelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });
  const filterPanelScale = filterPanelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const filterIconRotate = filterIconAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  useEffect(() => {
    const nextIndex = FEED_TABS.indexOf(activeFeedTab);

    Animated.timing(feedTabAnimation, {
      toValue: nextIndex,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeFeedTab, feedTabAnimation]);

  useEffect(() => {
    if (!refreshing) {
      setPullDistance(0);
    }
  }, [refreshing]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(filterPanelAnimation, {
        toValue: filterMenuOpen ? 1 : 0,
        damping: 18,
        mass: 0.9,
        stiffness: 170,
        useNativeDriver: true,
      }),
      Animated.timing(filterIconAnimation, {
        toValue: filterMenuOpen ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [filterIconAnimation, filterMenuOpen, filterPanelAnimation]);

  const toggleSavedFilter = async (filter: string) => {
    const nextFilters = savedFilters.includes(filter)
      ? savedFilters.filter((item) => item !== filter)
      : [...savedFilters, filter];

    animateLayoutTransition();
    setSavedFilters(nextFilters);

    try {
      await forumApi.updateCurrentUser({ preferredTags: nextFilters });
    } catch (nextError) {
      setSavedFilters(savedFilters);
      setError(nextError instanceof Error ? nextError.message : 'Could not save filters');
    }
  };

  if (loading || !ready || isRefreshingSession) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
        <ThemedText style={{ color: palette.muted }}>
          {isRefreshingSession ? 'Refreshing your session...' : 'Loading the latest questions...'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <FeedRefreshIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
        topInset={insets.top}
      />
      <FlatList
        data={filteredQuestions}
        keyExtractor={(item) => item._id}
        style={styles.list}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        onScroll={({ nativeEvent }) => {
          const nextPullDistance = Math.max(0, -nativeEvent.contentOffset.y);

          setPullDistance((current) => {
            if (Math.abs(current - nextPullDistance) < 2) {
              return current;
            }

            return nextPullDistance;
          });
        }}
        refreshControl={
          <RefreshControl
            colors={['transparent']}
            progressBackgroundColor="transparent"
            tintColor="transparent"
            refreshing={refreshing}
            onRefresh={() => void loadQuestions('refresh')}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.heroShell, { backgroundColor: palette.hero }]}>
              <View style={[styles.heroContent, { paddingTop: heroTopPadding }]}>
                <View style={styles.topBar}>
                  <NexusLogo inverted flushLeft />
                  <View style={styles.headerActions}>
                    <Pressable
                      onPress={() => {
                        animateLayoutTransition();
                        setFilterMenuOpen((current) => !current);
                      }}
                      style={[
                        styles.iconOnlyButton,
                        {
                          backgroundColor: filterButtonSurface,
                          borderColor: filterButtonBorder,
                        },
                      ]}>
                      <Animated.View style={{ transform: [{ rotate: filterIconRotate }] }}>
                        <IconSymbol name="slider.horizontal.3" size={18} color={filterButtonIcon} />
                      </Animated.View>
                      {appliedFilterCount > 0 ? (
                        <View
                          style={[
                            styles.filterCountBadge,
                            {
                              backgroundColor: palette.accent,
                              borderColor: palette.hero,
                            },
                          ]}>
                          <ThemedText style={[styles.filterCountBadgeText, { color: palette.textOnAccent }]}>
                            {appliedFilterCount}
                          </ThemedText>
                        </View>
                      ) : null}
                    </Pressable>
                    <Pressable
                      onPress={() => router.push('/profile')}
                      style={[
                        styles.profileButton,
                        {
                          backgroundColor: utilitySurface,
                          borderColor: utilityBorder,
                        },
                      ]}>
                      {headerAvatarSource ? (
                        <Image source={headerAvatarSource} contentFit="cover" style={styles.profileAvatar} />
                      ) : (
                        <IconSymbol name="person.crop.circle.fill" size={19} color={utilityText} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View
                  style={[
                    styles.searchShell,
                    isCompactScreen && styles.searchShellCompact,
                    {
                      backgroundColor: utilitySurface,
                      borderColor: utilityBorder,
                    },
                  ]}>
                  <IconSymbol name="magnifyingglass" size={18} color={searchIconColor} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search questions, tags, users..."
                    placeholderTextColor={searchIconColor}
                    style={[
                      styles.searchInput,
                      isCompactScreen && styles.searchInputCompact,
                      { color: palette.text },
                    ]}
                  />
                </View>
                {filterMenuOpen ? (
                  <Animated.View
                    style={[
                      styles.filterDrawer,
                      {
                        backgroundColor: filterDrawerSurface,
                        borderColor: utilityBorder,
                        opacity: filterPanelAnimation,
                        transform: [{ translateY: filterPanelTranslateY }, { scale: filterPanelScale }],
                      },
                    ]}>
                    <ThemedText style={[styles.filterDrawerTitle, { color: filterDrawerTitleColor }]}>
                      Your feed, tuned on purpose
                    </ThemedText>
                    <ThemedText style={[styles.filterDrawerBody, { color: palette.muted }]}>
                      Save technologies you care about and Nexus will keep the home feed tighter.
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filterDrawerList}>
                      {FILTER_OPTIONS.map((filter) => {
                        const active = savedFilters.includes(filter);

                        return (
                          <Pressable
                            key={filter}
                            onPress={() => void toggleSavedFilter(filter)}
                            style={[
                              styles.filterPill,
                              active
                                ? { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }
                                : { backgroundColor: 'transparent', borderColor: utilityBorder },
                            ]}>
                            <ThemedText
                              style={[
                                styles.filterPillText,
                                { color: active ? '#EA580C' : filterDrawerChipText },
                              ]}>
                              {filter}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </Animated.View>
                ) : null}
              </View>
            </View>

            <View style={[styles.feedPanel, { backgroundColor: palette.background }]}>
              <View
                style={[
                  styles.feedCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}>
                <View style={styles.feedHeader}>
                  <View style={styles.feedHeaderCopy}>
                    <ThemedText style={[styles.feedEyebrow, { color: palette.accent }]}>DISCUSSION FEED</ThemedText>
                    <ThemedText style={[styles.feedTitle, { color: palette.text }]}>
                      {filteredQuestions.length} results for your current view
                    </ThemedText>
                    <ThemedText style={[styles.feedBody, { color: palette.muted }]}>
                      {totalAnswers} total answers across the board.
                    </ThemedText>
                  </View>
                </View>

                <View
                  onLayout={({ nativeEvent }) => setFeedTabsWidth(nativeEvent.layout.width)}
                  style={[styles.feedTabs, { backgroundColor: palette.subtle }]}>
                  {feedTabSlotWidth > 0 ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.feedTabSlider,
                        {
                          backgroundColor: palette.card,
                          borderColor: palette.border,
                          width: feedTabSlotWidth,
                          transform: [
                            {
                              translateX: feedTabAnimation.interpolate({
                                inputRange: [0, FEED_TABS.length - 1],
                                outputRange: [0, feedTabSlotWidth * (FEED_TABS.length - 1)],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ) : null}
                  {FEED_TABS.map((item) => {
                    const active = activeFeedTab === item;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => {
                          animateLayoutTransition();
                          setActiveFeedTab(item);
                        }}
                        style={[
                          styles.feedTab,
                          active ? styles.feedTabActive : styles.feedTabInactive,
                        ]}>
                        <ThemedText
                          style={[
                            styles.feedTabText,
                            { color: active ? palette.text : palette.muted },
                          ]}>
                          {item}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {error ? (
                <View
                  style={[
                    styles.errorCard,
                    {
                      backgroundColor: palette.dangerSoft,
                      borderColor: palette.danger,
                    },
                  ]}>
                  <ThemedText style={[styles.errorTitle, { color: palette.danger }]}>
                    Could not reach the backend
                  </ThemedText>
                  <ThemedText style={[styles.errorBody, { color: palette.danger }]}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <QuestionCard
            index={index}
            question={item}
            onVote={(value) => void handleVote(item._id, value)}
            onPress={() =>
              router.push({
                pathname: '/questions/[questionId]',
                params: { questionId: item._id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
              },
            ]}>
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No questions found</ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
              Try another keyword, switch feed tabs, or ask the first question in Nexus.
            </ThemedText>
          </View>
        }
      />

      <Pressable
        onPress={() => router.push('/(tabs)/explore')}
        style={[
          styles.askButton,
          {
            backgroundColor: palette.accent,
            borderColor: palette.accent,
            bottom: askButtonBottom,
            right: askButtonRight,
          },
        ]}>
        <IconSymbol name="plus" size={18} color={palette.textOnAccent} />
        <ThemedText style={[styles.askButtonText, { color: palette.textOnAccent }]}>Ask Question</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  askButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: 'absolute',
    width: FLOATING_BUTTON_WIDTH,
  },
  askButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    margin: 16,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  feedBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  feedCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: -26,
    padding: 16,
  },
  feedEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  feedHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  feedHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  feedPanel: {
    paddingBottom: 4,
  },
  feedTab: {
    alignItems: 'center',
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  feedTabActive: {
    transform: [{ scale: 1.01 }],
  },
  feedTabInactive: {
    borderColor: 'transparent',
  },
  feedTabSlider: {
    borderRadius: 999,
    borderWidth: 1,
    bottom: 6,
    left: 6,
    minHeight: 42,
    position: 'absolute',
    top: 6,
  },
  feedTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedTabs: {
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    position: 'relative',
    padding: 6,
  },
  filterCountBadge: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 5,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  filterCountBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  feedTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  filterDrawer: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  filterDrawerBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  filterDrawerList: {
    gap: 8,
  },
  filterDrawerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroContent: {
    gap: 18,
  },
  heroShell: {
    overflow: 'hidden',
    paddingBottom: 44,
    paddingLeft: 0,
    paddingRight: 16,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconOnlyButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  profileAvatar: {
    borderRadius: 999,
    height: 100,
    width: 100,
  },
  profileButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 42,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchInputCompact: {
    fontSize: 14,
  },
  searchShell: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  searchShellCompact: {
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 0,
  },
});
