import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type ProfileResponse } from '@/lib/forum-api';

type ActivityTab = 'questions' | 'answers';

const formatJoinedDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));

const formatFeedDate = (value: string) => {
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

export default function ProfileScreen() {
  const { logout, ready, user } = useAuth();
  const { palette, resolvedScheme } = useAppearance();
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarImageUrl, setAvatarImageUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState<ActivityTab>('questions');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await forumApi.getCurrentUser();
      setProfile(response);
      setAvatarImageUrl(response.avatarImageUrl);
      setBannerImageUrl(response.bannerImageUrl);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const confirmDeleteQuestion = (questionId: string) => {
    Alert.alert('Delete question', 'Delete this question and its answers?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeletingId(questionId);
              await forumApi.deleteQuestion(questionId);
              await loadProfile();
            } catch (error) {
              Alert.alert(
                'Could not delete question',
                error instanceof Error ? error.message : 'Unknown error'
              );
            } finally {
              setDeletingId(null);
            }
          })();
        },
      },
    ]);
  };

  const confirmDeleteAnswer = (answerId: string) => {
    Alert.alert('Delete answer', 'Delete this answer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeletingId(answerId);
              await forumApi.deleteAnswer(answerId);
              await loadProfile();
            } catch (error) {
              Alert.alert(
                'Could not delete answer',
                error instanceof Error ? error.message : 'Unknown error'
              );
            } finally {
              setDeletingId(null);
            }
          })();
        },
      },
    ]);
  };

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace('/auth');
      return;
    }

    if (isFocused) {
      void loadProfile();
    }
  }, [isFocused, loadProfile, ready, user]);

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  if (!profile) {
    return (
      <Animated.View
        style={[
          styles.loadingScreen,
          {
            backgroundColor: palette.background,
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={[styles.loadingCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.loadingBanner, { backgroundColor: palette.subtle }]} />
          <View style={styles.loadingIdentity}>
            <View style={[styles.loadingAvatar, { backgroundColor: palette.accentSoft }]} />
            <View style={styles.loadingCopy}>
              <View style={[styles.loadingLineLg, { backgroundColor: palette.subtle }]} />
              <View style={[styles.loadingLineSm, { backgroundColor: palette.subtle }]} />
            </View>
          </View>
          <View style={[styles.loadingBodyLine, { backgroundColor: palette.subtle }]} />
          <View style={[styles.loadingBodyLineShort, { backgroundColor: palette.subtle }]} />
        </View>
      </Animated.View>
    );
  }

  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bannerSource = bannerImageUrl.trim() || undefined;
  const avatarSource = avatarImageUrl.trim() || undefined;
  const profileEmail = profile.email;
  const cardBorder = resolvedScheme === 'dark' ? '#20304A' : palette.border;

  return (
    <Animated.ScrollView
      style={[
        styles.screen,
        {
          backgroundColor: palette.background,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [28, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            },
          ],
        },
      ]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadProfile()} />}>
      <View style={[styles.profileShell, { backgroundColor: palette.card, borderColor: cardBorder }]}>
        <View style={styles.topBar}>
          <ThemedText style={[styles.topBarName, { color: palette.text }]} numberOfLines={1}>
            {profile.name}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              logout();
              router.replace('/auth');
            }}
            style={[styles.iconButton, { borderColor: cardBorder }]}>
            <MaterialIcons name="logout" size={20} color="#DC2626" />
          </Pressable>
        </View>

        <View style={[styles.bannerFrame, { backgroundColor: palette.subtle }]}>
          {bannerSource ? (
            <View style={styles.bannerActionArea}>
              <Image source={bannerSource} contentFit="cover" style={styles.bannerImage} />
            </View>
          ) : (
            <View
              style={[
                styles.bannerFallback,
                {
                  backgroundColor: palette.accent,
                },
              ]}>
              <View style={styles.bannerGlow} />
              <MaterialIcons name="add-photo-alternate" size={28} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.identityBlock}>
          <View style={[styles.avatarRing, { borderColor: palette.card }]}>
            {avatarSource ? (
              <View style={styles.avatarPickerButton}>
                <Image source={avatarSource} contentFit="cover" style={styles.avatarImage} />
              </View>
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: palette.accent }]}>
                <MaterialIcons name="photo-camera" size={24} color="#FFFFFF" />
                <ThemedText style={styles.avatarHint}>Add photo</ThemedText>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/edit-profile')}
            style={[styles.editProfileButton, { borderColor: cardBorder }]}>
            <ThemedText style={[styles.editProfileButtonText, { color: palette.text }]}>Edit profile</ThemedText>
          </Pressable>
        </View>

        <View style={styles.profileCopy}>
          <ThemedText style={[styles.profileName, { color: palette.text }]}>{profile.name}</ThemedText>
          <ThemedText style={[styles.profileHandle, { color: palette.muted }]}>{profileEmail}</ThemedText>
          {!!profile.headline && (
            <ThemedText style={[styles.profileHeadline, { color: palette.text }]}>{profile.headline}</ThemedText>
          )}
          {!!profile.bio && <ThemedText style={[styles.profileBio, { color: palette.muted }]}>{profile.bio}</ThemedText>}
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <MaterialIcons name="location-on" size={20} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {profile.location || 'Add your location'}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons name="calendar-month" size={20} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              Joined {formatJoinedDate(profile.joinedAt)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.text }]}>{profile.stats.questions}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Posts</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.text }]}>{profile.stats.answers}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Answers</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.text }]}>{profile.stats.comments}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Comments</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={[styles.activityToggle, { backgroundColor: palette.card, borderColor: cardBorder }]}>
          <Pressable
            onPress={() => setActiveTab('questions')}
            style={[
              styles.activityToggleButton,
              activeTab === 'questions' ? { backgroundColor: palette.accent } : null,
            ]}>
            <ThemedText
              style={[
                styles.activityToggleText,
                { color: activeTab === 'questions' ? palette.textOnAccent : palette.muted },
              ]}>
              Questions
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('answers')}
            style={[
              styles.activityToggleButton,
              activeTab === 'answers' ? { backgroundColor: palette.accent } : null,
            ]}>
            <ThemedText
              style={[
                styles.activityToggleText,
                { color: activeTab === 'answers' ? palette.textOnAccent : palette.muted },
              ]}>
              Answers
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
          {activeTab === 'questions' ? 'Questions you asked' : 'Answers you gave'}
        </ThemedText>
      </View>

      <View style={styles.questionsList}>
        {activeTab === 'questions' ? (
          profile.recentQuestions.length ? (
            profile.recentQuestions.map((question) => (
              <Pressable
                key={question._id}
                onPress={() =>
                  router.push({
                    pathname: '/questions/[questionId]',
                    params: { questionId: question._id },
                  })
                }
                style={[styles.feedCard, { backgroundColor: palette.card, borderColor: cardBorder }]}>
                <View style={styles.feedHeader}>
                  <View style={styles.feedAuthorRow}>
                    <View style={[styles.feedAvatar, { backgroundColor: palette.accent }]}>
                      {avatarSource ? (
                        <Image source={avatarSource} contentFit="cover" style={styles.feedAvatarImage} />
                      ) : (
                        <ThemedText style={styles.feedAvatarText}>{initials}</ThemedText>
                      )}
                    </View>
                    <View style={styles.feedAuthorCopy}>
                      <ThemedText style={[styles.feedAuthorName, { color: palette.text }]}>{profile.name}</ThemedText>
                      <ThemedText numberOfLines={1} style={[styles.feedAuthorMeta, { color: palette.muted }]}>
                        {profileEmail} | {formatFeedDate(question.createdAt)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.feedHeaderActions}>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmDeleteQuestion(question._id);
                      }}
                      disabled={deletingId === question._id}
                      style={[styles.deleteIconButton, { borderColor: cardBorder }]}>
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color={deletingId === question._id ? palette.muted : '#DC2626'}
                      />
                    </Pressable>
                    <MaterialIcons name="chevron-right" size={20} color={palette.muted} />
                  </View>
                </View>

                <ThemedText style={[styles.feedQuestionTitle, { color: palette.text }]}>{question.title}</ThemedText>
                <ThemedText style={[styles.feedQuestionBody, { color: palette.muted }]} numberOfLines={3}>
                  {question.body}
                </ThemedText>

                <View style={[styles.questionPreview, { backgroundColor: palette.background, borderColor: cardBorder }]}>
                  <View style={styles.questionPreviewStats}>
                    <ThemedText style={[styles.questionPreviewStat, { color: palette.text }]}>
                      {Math.max(question.voteScore, 0)} votes
                    </ThemedText>
                    <ThemedText style={[styles.questionPreviewStat, { color: palette.text }]}>
                      {Math.max(question.answerCount ?? 0, 0)} repl{Math.max(question.answerCount ?? 0, 0) === 1 ? 'y' : 'ies'}
                    </ThemedText>
                  </View>
                  {question.tags.length ? (
                    <View style={styles.tagRow}>
                      {question.tags.slice(0, 4).map((tag) => (
                        <View key={tag} style={[styles.tagPill, { backgroundColor: palette.accentSoft }]}>
                          <ThemedText style={[styles.tagText, { color: palette.accent }]}>{tag}</ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: cardBorder }]}>
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No questions yet</ThemedText>
              <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
                Ask your first question and it will appear here under your profile.
              </ThemedText>
            </View>
          )
        ) : profile.recentAnswers.length ? (
          profile.recentAnswers.map((answer) => (
            <Pressable
              key={answer._id}
              onPress={() =>
                router.push({
                  pathname: '/questions/[questionId]',
                  params: { questionId: answer.questionId },
                })
              }
              style={[styles.feedCard, { backgroundColor: palette.card, borderColor: cardBorder }]}>
              <View style={styles.feedHeader}>
                <View style={styles.feedAuthorRow}>
                  <View style={[styles.feedAvatar, { backgroundColor: palette.accent }]}>
                    {avatarSource ? (
                      <Image source={avatarSource} contentFit="cover" style={styles.feedAvatarImage} />
                    ) : (
                      <ThemedText style={styles.feedAvatarText}>{initials}</ThemedText>
                    )}
                  </View>
                  <View style={styles.feedAuthorCopy}>
                      <ThemedText style={[styles.feedAuthorName, { color: palette.text }]}>{profile.name}</ThemedText>
                      <ThemedText numberOfLines={1} style={[styles.feedAuthorMeta, { color: palette.muted }]}>
                        {profileEmail} | {formatFeedDate(answer.createdAt)}
                      </ThemedText>
                  </View>
                </View>
                <View style={styles.feedHeaderActions}>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      confirmDeleteAnswer(answer._id);
                    }}
                    disabled={deletingId === answer._id}
                    style={[styles.deleteIconButton, { borderColor: cardBorder }]}>
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color={deletingId === answer._id ? palette.muted : '#DC2626'}
                    />
                  </Pressable>
                  <MaterialIcons name="chevron-right" size={20} color={palette.muted} />
                </View>
              </View>

              <ThemedText style={[styles.answerLabel, { color: palette.accent }]}>Answer to</ThemedText>
              <ThemedText style={[styles.feedQuestionTitle, { color: palette.text }]}>{answer.questionTitle}</ThemedText>
              <ThemedText style={[styles.feedQuestionBody, { color: palette.muted }]} numberOfLines={3}>
                {answer.body}
              </ThemedText>

              <View style={[styles.questionPreview, { backgroundColor: palette.background, borderColor: cardBorder }]}>
                <View style={styles.questionPreviewStats}>
                  <ThemedText style={[styles.questionPreviewStat, styles.questionPreviewVoteText, { color: palette.text }]}>
                    {Math.max(answer.voteScore, 0)} votes
                  </ThemedText>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.questionPreviewStat, styles.questionPreviewMetaText, { color: palette.text }]}>
                    asked by {answer.questionAuthorEmail || answer.questionAuthorId || 'community'}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: cardBorder }]}>
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No answers yet</ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
              Start replying to questions and your recent answers will show up here.
            </ThemedText>
          </View>
        )}
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  activityToggle: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
  },
  activityToggleButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  activityToggleText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 54,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  avatarHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarImage: {
    borderRadius: 54,
    height: '100%',
    width: '100%',
  },
  avatarPickerButton: {
    flex: 1,
  },
  avatarRing: {
    backgroundColor: '#FFFFFF',
    borderRadius: 58,
    borderWidth: 5,
    height: 116,
    overflow: 'hidden',
    width: 116,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },
  bannerActionArea: {
    flex: 1,
  },
  bannerFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 18,
  },
  bannerFrame: {
    borderRadius: 22,
    height: 220,
    overflow: 'hidden',
  },
  bannerGlow: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 180,
    height: 180,
    position: 'absolute',
    right: -30,
    top: -30,
    width: 180,
  },
  bannerImage: {
    height: '100%',
    width: '100%',
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  deleteIconButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  editProfileButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 10,
    marginLeft: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  editProfileButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  feedAuthorCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  feedAuthorMeta: {
    fontSize: 13,
  },
  feedAuthorName: {
    fontSize: 17,
    fontWeight: '800',
  },
  feedAuthorRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  feedAvatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  feedAvatarImage: {
    height: '100%',
    width: '100%',
  },
  feedAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  feedCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 16,
  },
  feedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  feedHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
    marginLeft: 'auto',
  },
  feedQuestionBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  feedQuestionTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  identityBlock: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginTop: -58,
    paddingHorizontal: 18,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  loadingAvatar: {
    borderRadius: 999,
    height: 82,
    width: 82,
  },
  loadingBanner: {
    borderRadius: 22,
    height: 220,
  },
  loadingBodyLine: {
    borderRadius: 999,
    height: 14,
    width: '88%',
  },
  loadingBodyLineShort: {
    borderRadius: 999,
    height: 14,
    width: '62%',
  },
  loadingCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 16,
  },
  loadingCopy: {
    flex: 1,
    gap: 10,
  },
  loadingIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  loadingLineLg: {
    borderRadius: 999,
    height: 18,
    width: '72%',
  },
  loadingLineSm: {
    borderRadius: 999,
    height: 14,
    width: '44%',
  },
  metaList: {
    gap: 8,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    fontSize: 16,
    lineHeight: 22,
  },
  profileBio: {
    fontSize: 15,
    lineHeight: 22,
  },
  profileCopy: {
    gap: 4,
    paddingHorizontal: 18,
  },
  profileHandle: {
    fontSize: 16,
  },
  profileHeadline: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  profileName: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  profileShell: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    overflow: 'hidden',
    padding: 16,
  },
  questionPreview: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
    padding: 14,
  },
  questionPreviewStat: {
    fontSize: 13,
    fontWeight: '700',
  },
  questionPreviewStats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  questionPreviewMetaText: {
    flex: 1,
  },
  questionPreviewVoteText: {
    flexShrink: 0,
    minWidth: 56,
  },
  questionsList: {
    gap: 14,
  },
  screen: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  statItem: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBarName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    marginRight: 12,
  },
});
