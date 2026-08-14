import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentRef } from 'react';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { CodeSymbolToolbar } from '@/components/code-symbol-toolbar';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type Answer, type Comment, type FeedAuthor, type Question } from '@/lib/forum-api';

type AnswerCommentMap = Record<string, Comment[]>;
type SelectionRange = { start: number; end: number };

const TOOLBAR_HEIGHT = 54;
const FOCUS_PADDING = 16;
const TOOLBAR_GAP = 0;
const TOOLBAR_KEYBOARD_CLEARANCE = 28;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const insertIntoSelection = (currentValue: string, selection: SelectionRange, token: string) => {
  const start = Math.max(0, selection.start);
  const end = Math.max(start, selection.end);
  const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
  const cursor = start + token.length;

  return {
    nextValue,
    nextSelection: { start: cursor, end: cursor },
  };
};

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

function CodeBlock({ code }: { code: string }) {
  if (!code.trim()) {
    return null;
  }

  return (
    <View style={styles.codeBlock}>
      <ThemedText style={styles.codeText}>{code}</ThemedText>
    </View>
  );
}

function AuthorIdentity({
  author,
  fallbackId,
  timestamp,
  palette,
}: {
  author?: FeedAuthor;
  fallbackId: string;
  timestamp: string;
  palette: ReturnType<typeof useAppearance>['palette'];
}) {
  const displayName = author?.name?.trim() || fallbackId;
  const displayEmail = author?.email?.trim() || fallbackId;
  const avatarSource = author?.avatarImageUrl?.trim() || undefined;
  const avatarColor = author?.avatarColor || palette.accent;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.identityRow}>
      {avatarSource ? (
        <Image source={avatarSource} contentFit="cover" style={styles.identityAvatar} />
      ) : (
        <View style={[styles.identityAvatarFallback, { backgroundColor: avatarColor }]}>
          <ThemedText style={styles.identityAvatarText}>{initials}</ThemedText>
        </View>
      )}
      <View style={styles.identityCopy}>
        <ThemedText style={[styles.identityName, { color: palette.text }]}>{displayName}</ThemedText>
        <ThemedText numberOfLines={1} style={[styles.identityMeta, { color: palette.muted }]}>
          {displayEmail} - {formatDateTime(timestamp)}
        </ThemedText>
      </View>
    </View>
  );
}

function VoteControls({
  score,
  currentVote,
  onVote,
  accent,
  cardAlt,
  text,
  muted,
  danger,
  dangerSoft,
}: {
  score: number;
  currentVote?: -1 | 0 | 1;
  onVote: (value: -1 | 1) => void;
  accent: string;
  cardAlt: string;
  text: string;
  muted: string;
  danger: string;
  dangerSoft: string;
}) {
  const activeUpvote = currentVote === 1;
  const activeDownvote = currentVote === -1;

  return (
    <View style={styles.voteColumn}>
      <BouncyPressable onPress={() => onVote(1)} scaleTo={0.9}>
        <View
          style={[
            styles.voteButton,
            { backgroundColor: activeUpvote ? `${accent}22` : cardAlt, borderColor: activeUpvote ? accent : cardAlt },
          ]}>
          <MaterialIcons name="keyboard-arrow-up" size={24} color={activeUpvote ? accent : muted} />
        </View>
      </BouncyPressable>
      <ThemedText style={[styles.voteScore, { color: text }]}>{Math.max(score, 0)}</ThemedText>
      <BouncyPressable onPress={() => onVote(-1)} scaleTo={0.9}>
        <View
          style={[
            styles.voteButton,
            {
              backgroundColor: activeDownvote ? dangerSoft : cardAlt,
              borderColor: activeDownvote ? danger : cardAlt,
            },
          ]}>
          <MaterialIcons name="keyboard-arrow-down" size={24} color={activeDownvote ? danger : muted} />
        </View>
      </BouncyPressable>
    </View>
  );
}

function CommentThread({
  comments,
  draft,
  onDraftChange,
  onSubmit,
  onFocusInput,
  setInputRef,
  onDeleteComment,
  currentUserId,
  isAdmin,
  deletingCommentId,
  palette,
}: {
  comments: Comment[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onFocusInput: () => void;
  setInputRef: (instance: TextInput | null) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId?: string;
  isAdmin: boolean;
  deletingCommentId: string | null;
  palette: ReturnType<typeof useAppearance>['palette'];
}) {
  const [expanded, setExpanded] = useState(false);
  const orderedComments = useMemo(
    () =>
      [...comments].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [comments]
  );
  const previewComments = expanded ? orderedComments : orderedComments.slice(0, 1);

  return (
    <View style={styles.replyThread}>
      <View style={styles.replyHeader}>
        <ThemedText style={[styles.replyPreviewLabel, { color: palette.muted }]}>
          {comments.length ? 'Latest reply' : 'No replies yet'}
        </ThemedText>
      </View>

      {previewComments.length ? (
        <View style={styles.replyList}>
          {previewComments.map((comment) => (
            <View key={comment._id} style={styles.commentThreadRow}>
              <View style={[styles.commentStem, { backgroundColor: palette.border }]} />
              <View
                style={[
                  styles.commentRow,
                  {
                    backgroundColor: palette.input,
                    borderColor: palette.border,
                  },
                ]}>
                <AuthorIdentity
                  author={comment.author}
                  fallbackId={comment.authorId}
                  timestamp={comment.createdAt}
                  palette={palette}
                />
                <ThemedText style={[styles.commentBody, { color: palette.text }]}>{comment.body}</ThemedText>
                <View style={styles.replyMetaRow}>
                  <ThemedText style={[styles.commentMeta, { color: palette.muted }]}>
                    {formatDateTime(comment.createdAt)}
                  </ThemedText>
                  {(comment.author?.id || comment.authorId) === currentUserId || isAdmin ? (
                    <BouncyPressable
                      onPress={() => onDeleteComment(comment._id)}
                      disabled={deletingCommentId === comment._id}
                      scaleTo={0.92}>
                      <View style={[styles.commentDeleteButton, { borderColor: palette.border }]}>
                        <MaterialIcons
                          name="delete-outline"
                          size={14}
                          color={deletingCommentId === comment._id ? palette.muted : '#DC2626'}
                        />
                      </View>
                    </BouncyPressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText style={[styles.emptyMuted, { color: palette.muted }]}>No comments yet.</ThemedText>
      )}

      {comments.length ? (
        <BouncyPressable onPress={() => setExpanded((current) => !current)} hitSlop={8} scaleTo={0.92}>
          <View style={styles.replyToggleRow}>
            <MaterialIcons
              name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={18}
              color={palette.accent}
            />
            <ThemedText numberOfLines={1} style={[styles.replyToggle, { color: palette.accent }]}>
              {expanded ? 'Hide replies' : `${comments.length} repl${comments.length === 1 ? 'y' : 'ies'}`}
            </ThemedText>
          </View>
        </BouncyPressable>
      ) : null}

      <View
        style={[
          styles.replyComposer,
          {
            backgroundColor: palette.input,
            borderColor: palette.border,
          },
        ]}>
        <TextInput
          ref={setInputRef}
          value={draft}
          onChangeText={onDraftChange}
          onFocus={onFocusInput}
          placeholder="Write a reply..."
          placeholderTextColor={palette.muted}
          style={[styles.inlineInput, { color: palette.text }]}
        />
        <BouncyPressable onPress={onSubmit} scaleTo={0.95}>
          <View style={[styles.secondaryButton, { backgroundColor: palette.cardAlt }]}>
            <ThemedText numberOfLines={1} style={[styles.secondaryButtonText, { color: palette.text }]}>Reply</ThemedText>
          </View>
        </BouncyPressable>
      </View>
    </View>
  );
}

export default function QuestionDetailScreen() {
  const params = useLocalSearchParams<{ questionId: string }>();
  const questionId = Array.isArray(params.questionId) ? params.questionId[0] : params.questionId;
  const { ready, user } = useAuth();
  const { palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const screenRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const answerCodeRef = useRef<TextInput>(null);
  const replyInputRefs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
  const keyboardScreenYRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerComments, setAnswerComments] = useState<AnswerCommentMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [answerBody, setAnswerBody] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [answerCodeSelection, setAnswerCodeSelection] = useState<SelectionRange>({ start: 0, end: 0 });
  const [answerCommentDrafts, setAnswerCommentDrafts] = useState<Record<string, string>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [toolbarBottomInset, setToolbarBottomInset] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [activeCodeField, setActiveCodeField] = useState<'answer' | null>(null);
  const [activeReplyFieldId, setActiveReplyFieldId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const toolbarBottom = toolbarBottomInset;
  const isAdmin = user?.role === 'admin';

  const sortedAnswers = useMemo(
    () =>
      [...answers].sort((left, right) => {
        if (right.voteScore !== left.voteScore) {
          return right.voteScore - left.voteScore;
        }

        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }),
    [answers]
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace('/auth');
    }
  }, [ready, user]);

  useEffect(() => {
    const syncToolbarToKeyboard = (keyboardScreenY: number | null) => {
      if (!keyboardScreenY) {
        setToolbarBottomInset(0);
        return;
      }

      requestAnimationFrame(() => {
        screenRef.current?.measureInWindow((_x, y, _width, height) => {
          const screenBottom = y + height;
          setToolbarBottomInset(
            Math.max(screenBottom - keyboardScreenY + TOOLBAR_KEYBOARD_CLEARANCE, 0)
          );
        });
      });
    };

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardScreenYRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      syncToolbarToKeyboard(event.endCoordinates.screenY);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardScreenYRef.current = null;
      setKeyboardHeight(0);
      syncToolbarToKeyboard(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleScreenLayout = () => {
    if (keyboardScreenYRef.current === null) {
      return;
    }

    screenRef.current?.measureInWindow((_x, y, _width, height) => {
      const screenBottom = y + height;
      setToolbarBottomInset(
        Math.max(screenBottom - keyboardScreenYRef.current! + TOOLBAR_KEYBOARD_CLEARANCE, 0)
      );
    });
  };

  useEffect(() => {
    if (keyboardHeight <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      if (activeCodeField) {
        scrollFocusedFieldIntoView(activeCodeField);
      } else if (activeReplyFieldId) {
        scrollReplyFieldIntoView(activeReplyFieldId);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [activeCodeField, activeReplyFieldId, keyboardHeight, scrollOffset]);

  const scrollFocusedFieldIntoView = (field: 'answer') => {
    const targetRef = field === 'answer' ? answerCodeRef : null;
    const nodeHandle = findNodeHandle(targetRef?.current ?? null);

    if (!nodeHandle) {
      return;
    }

    (
      scrollRef.current as unknown as {
        scrollResponderScrollNativeHandleToKeyboard?: (
          node: number,
          additionalOffset?: number,
          preventNegativeScrollOffset?: boolean
        ) => void;
      } | null
    )?.scrollResponderScrollNativeHandleToKeyboard?.(
      nodeHandle,
      TOOLBAR_HEIGHT + TOOLBAR_GAP + FOCUS_PADDING,
      true
    );
  };

  const focusCodeField = (field: 'answer') => {
    setActiveCodeField(field);
    setActiveReplyFieldId(null);

    setTimeout(() => {
      scrollFocusedFieldIntoView(field);
    }, keyboardHeight > 0 ? 20 : 120);
  };

  const scrollReplyFieldIntoView = (replyId: string) => {
    const targetRef = replyInputRefs.current[replyId];
    const nodeHandle = findNodeHandle(targetRef ?? null);

    if (!nodeHandle) {
      return;
    }

    (
      scrollRef.current as unknown as {
        scrollResponderScrollNativeHandleToKeyboard?: (
          node: number,
          additionalOffset?: number,
          preventNegativeScrollOffset?: boolean
        ) => void;
      } | null
    )?.scrollResponderScrollNativeHandleToKeyboard?.(
      nodeHandle,
      TOOLBAR_HEIGHT + TOOLBAR_GAP + FOCUS_PADDING,
      true
    );
  };

  const focusReplyField = (replyId: string) => {
    setActiveCodeField(null);
    setActiveReplyFieldId(replyId);

    setTimeout(() => {
      scrollReplyFieldIntoView(replyId);
    }, keyboardHeight > 0 ? 20 : 120);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const loadQuestion = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!questionId) {
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [nextQuestion, nextAnswers] = await Promise.all([
          forumApi.getQuestion(questionId),
          forumApi.listAnswers(questionId),
        ]);

        const commentsByAnswer = await Promise.all(
          nextAnswers.map(async (answer) => [
            answer._id,
            await forumApi.listComments('answer', answer._id),
          ])
        );

        setQuestion(nextQuestion);
        setAnswers(nextAnswers);
        setAnswerComments(Object.fromEntries(commentsByAnswer));
      } catch (error) {
        Alert.alert('Could not load question', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [questionId]
  );

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

  const submitAnswer = async () => {
    if (!questionId || !answerBody.trim()) {
      return;
    }

    try {
      await forumApi.createAnswer(questionId, {
        body: answerBody.trim(),
        codeSnippet: answerCode.trim(),
      });
      setAnswerBody('');
      setAnswerCode('');
      setActiveCodeField(null);
      setActiveReplyFieldId(null);
      await loadQuestion('refresh');
    } catch (error) {
      Alert.alert('Could not post answer', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const submitComment = async (targetId: string) => {
    const draft = answerCommentDrafts[targetId] ?? '';

    if (!draft.trim()) {
      return;
    }

    try {
      await forumApi.createComment('answer', targetId, { body: draft.trim() });
      setAnswerCommentDrafts((current) => ({ ...current, [targetId]: '' }));
      await loadQuestion('refresh');
    } catch (error) {
      Alert.alert('Could not post comment', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleVote = async (targetType: 'question' | 'answer', targetId: string, value: -1 | 1) => {
    const previousQuestion = targetType === 'question' ? question : null;
    const previousAnswer = targetType === 'answer' ? answers.find((answer) => answer._id === targetId) ?? null : null;

    if (targetType === 'question' && previousQuestion) {
      setQuestion((current) =>
        current
          ? {
              ...current,
              ...getOptimisticVoteState(current.currentUserVote, current.voteScore, value),
            }
          : current
      );
    }

    if (targetType === 'answer' && previousAnswer) {
      setAnswers((current) =>
        current.map((answer) =>
          answer._id === targetId
            ? {
                ...answer,
                ...getOptimisticVoteState(answer.currentUserVote, answer.voteScore, value),
              }
            : answer
        )
      );
    }

    try {
      const result = await forumApi.castVote(targetType, targetId, value);

      if (targetType === 'question') {
        setQuestion((current) =>
          current
            ? {
                ...current,
                voteScore: result.voteScore,
                currentUserVote: result.currentUserVote,
              }
            : current
        );
      } else {
        setAnswers((current) =>
          current.map((answer) =>
            answer._id === targetId
              ? {
                  ...answer,
                  voteScore: result.voteScore,
                  currentUserVote: result.currentUserVote,
                }
              : answer
          )
        );
      }
    } catch (error) {
      if (targetType === 'question' && previousQuestion) {
        setQuestion(previousQuestion);
      }

      if (targetType === 'answer' && previousAnswer) {
        setAnswers((current) =>
          current.map((answer) => (answer._id === targetId ? previousAnswer : answer))
        );
      }

      Alert.alert('Vote failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleInsertSymbol = (token: string) => {
    const result = insertIntoSelection(answerCode, answerCodeSelection, token);
    setAnswerCode(result.nextValue);
    setAnswerCodeSelection(result.nextSelection);
    setActiveCodeField('answer');
    setActiveReplyFieldId(null);
  };

  const confirmDeleteComment = (commentId: string) => {
    Alert.alert('Delete reply', 'Delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeletingCommentId(commentId);
              await forumApi.deleteComment(commentId);
              await loadQuestion('refresh');
            } catch (error) {
              Alert.alert(
                'Could not delete reply',
                error instanceof Error ? error.message : 'Unknown error'
              );
            } finally {
              setDeletingCommentId(null);
            }
          })();
        },
      },
    ]);
  };

  const confirmDeleteQuestion = (targetQuestionId: string) => {
    Alert.alert('Delete question', 'Delete this question and its answers?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeletingId(targetQuestionId);
              await forumApi.deleteQuestion(targetQuestionId);
              router.back();
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
              await loadQuestion('refresh');
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

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading question thread...</ThemedText>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <ThemedText type="title">Question not found</ThemedText>
        <ThemedText style={[styles.emptyMuted, { color: palette.muted }]}>
          Try returning to the feed and refreshing.
        </ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
      <View
        ref={screenRef}
        onLayout={handleScreenLayout}
        style={[styles.screen, { backgroundColor: palette.background }]}>
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                96 +
                (keyboardHeight > 0 && activeCodeField !== null
                  ? TOOLBAR_HEIGHT + TOOLBAR_GAP
                  : 0),
            },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadQuestion('refresh')} />}>
          <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.topMetaRow}>
              <ThemedText style={[styles.kicker, { color: palette.accent }]}>Question</ThemedText>
              {(question.author?.id || question.authorId) === user?.id || isAdmin ? (
                <BouncyPressable
                  onPress={() => confirmDeleteQuestion(question._id)}
                  disabled={deletingId === question._id}
                  scaleTo={0.92}>
                  <View style={[styles.deleteIconButton, { borderColor: palette.border }]}>
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color={deletingId === question._id ? palette.muted : '#DC2626'}
                    />
                  </View>
                </BouncyPressable>
              ) : null}
            </View>

            <View style={styles.questionHeader}>
              <VoteControls
                score={question.voteScore}
                currentVote={question.currentUserVote}
                onVote={(value) => void handleVote('question', question._id, value)}
                accent={palette.accent}
                cardAlt={palette.cardAlt}
                text={palette.text}
                muted={palette.muted}
                danger={palette.danger}
                dangerSoft={palette.dangerSoft}
              />
              <View style={styles.questionCopy}>
                <AuthorIdentity
                  author={question.author}
                  fallbackId={question.authorId}
                  timestamp={question.createdAt}
                  palette={palette}
                />
                <ThemedText type="title" style={[styles.questionTitle, { color: palette.text }]}>
                  {question.title}
                </ThemedText>
                <ThemedText style={[styles.questionBody, { color: palette.text }]}>{question.body}</ThemedText>
                <CodeBlock code={question.codeSnippet} />

                {question.tags.length ? (
                  <View style={styles.tagRow}>
                    {question.tags.map((tag) => (
                      <View key={tag} style={[styles.tagChip, { backgroundColor: palette.accentSoft }]}>
                        <ThemedText style={[styles.tagChipText, { color: palette.accent }]}>#{tag}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <ThemedText style={[styles.smallMeta, { color: palette.muted }]}>
                  Asked by {question.authorId} - {formatDateTime(question.createdAt)}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.answerComposer, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Write an answer</ThemedText>
            <TextInput
              value={answerBody}
              onChangeText={setAnswerBody}
              onFocus={() => {
                setActiveCodeField(null);
                setActiveReplyFieldId(null);
              }}
              placeholder="Share the fix, the reasoning, and any gotchas."
              placeholderTextColor={palette.muted}
              multiline
              style={[
                styles.textArea,
                styles.answerBodyInput,
                { backgroundColor: palette.input, borderColor: palette.border, color: palette.text },
              ]}
            />
            <TextInput
              ref={answerCodeRef}
              value={answerCode}
              onChangeText={setAnswerCode}
              onFocus={() => focusCodeField('answer')}
              onPressIn={() => focusCodeField('answer')}
              onSelectionChange={({ nativeEvent }) => {
                setAnswerCodeSelection(nativeEvent.selection);
                setActiveCodeField('answer');
              }}
              selection={answerCodeSelection}
              placeholder="Optional code snippet"
              placeholderTextColor={palette.muted}
              multiline
              style={[
                styles.textArea,
                styles.codeInput,
                { backgroundColor: palette.input, borderColor: palette.border, color: palette.text },
              ]}
            />
            <BouncyPressable onPress={submitAnswer} scaleTo={0.96}>
              <View style={[styles.primaryButton, { backgroundColor: palette.accent }]}>
                <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>Post answer</ThemedText>
              </View>
            </BouncyPressable>
          </View>

          <View style={styles.answersHeader}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Answers</ThemedText>
            <ThemedText style={[styles.answersCount, { color: palette.muted }]}>
              {sortedAnswers.length} total
            </ThemedText>
          </View>

          {sortedAnswers.length ? (
            sortedAnswers.map((answer, index) => (
              <View
                key={answer._id}
                style={[styles.answerCard, { borderColor: palette.border }]}>
                <View style={styles.answerHeader}>
                  <VoteControls
                    score={answer.voteScore}
                    currentVote={answer.currentUserVote}
                    onVote={(value) => void handleVote('answer', answer._id, value)}
                    accent={palette.accent}
                    cardAlt={palette.cardAlt}
                    text={palette.text}
                    muted={palette.muted}
                    danger={palette.danger}
                    dangerSoft={palette.dangerSoft}
                  />
                  <View style={styles.answerContentColumn}>
                    <View style={styles.answerRail}>
                      <View style={[styles.answerRailDot, { backgroundColor: palette.accentSoft, borderColor: palette.border }]} />
                      <View style={[styles.answerRailLine, { backgroundColor: palette.border }]} />
                    </View>
                    <View style={styles.answerCopy}>
                      <AuthorIdentity
                        author={answer.author}
                        fallbackId={answer.authorId}
                        timestamp={answer.createdAt}
                        palette={palette}
                      />
                      <View style={styles.answerTopRow}>
                        {index === 0 ? (
                          <View style={[styles.topAnswerBadge, { backgroundColor: palette.accentSoft }]}>
                            <ThemedText style={[styles.topAnswerBadgeText, { color: palette.accent }]}>
                              Top answer
                            </ThemedText>
                          </View>
                        ) : null}
                        <ThemedText style={[styles.answerVoteSummary, { color: palette.muted }]}>
                          {Math.max(answer.voteScore, 0)} upvotes
                        </ThemedText>
                        {(answer.author?.id || answer.authorId) === user?.id || isAdmin ? (
                          <View style={styles.answerActions}>
                            <BouncyPressable
                              onPress={() => confirmDeleteAnswer(answer._id)}
                              disabled={deletingId === answer._id}
                              scaleTo={0.92}>
                              <View style={[styles.deleteIconButton, { borderColor: palette.border }]}>
                                <MaterialIcons
                                  name="delete-outline"
                                  size={18}
                                  color={deletingId === answer._id ? palette.muted : '#DC2626'}
                                />
                              </View>
                            </BouncyPressable>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText style={[styles.answerBody, { color: palette.text }]}>{answer.body}</ThemedText>
                      <CodeBlock code={answer.codeSnippet} />
                      <ThemedText style={[styles.smallMeta, { color: palette.muted }]}>
                        Answered by {answer.authorId} - {formatDateTime(answer.createdAt)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.threadCard}>
                  <CommentThread
                    comments={answerComments[answer._id] ?? []}
                    draft={answerCommentDrafts[answer._id] ?? ''}
                    onDraftChange={(value) =>
                      setAnswerCommentDrafts((current) => ({ ...current, [answer._id]: value }))
                    }
                    onSubmit={() => void submitComment(answer._id)}
                    onFocusInput={() => focusReplyField(answer._id)}
                    setInputRef={(instance) => {
                      replyInputRefs.current[answer._id] = instance;
                    }}
                    onDeleteComment={confirmDeleteComment}
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                    deletingCommentId={deletingCommentId}
                    palette={palette}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No answers yet</ThemedText>
              <ThemedText style={[styles.emptyMuted, { color: palette.muted }]}>
                Be the first to explain the issue, share a workaround, or post a code sample.
              </ThemedText>
            </View>
          )}
        </ScrollView>

        <CodeSymbolToolbar
          accent={palette.accent}
          accentSoft={palette.accentSoft}
          background={palette.card}
          border={palette.border}
          bottom={toolbarBottom}
          text={palette.text}
          visible={keyboardHeight > 0 && activeCodeField !== null}
          onInsert={handleInsertSymbol}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  answerActions: {
    marginLeft: 'auto',
  },
  answerBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  answerBodyInput: {
    minHeight: 128,
  },
  answerCard: {
    borderBottomWidth: 1,
    gap: 12,
    paddingBottom: 18,
    paddingTop: 6,
  },
  answerComposer: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  answerContentColumn: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  answerCopy: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  answerHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  answerRail: {
    alignItems: 'center',
    paddingTop: 4,
    width: 14,
  },
  answerRailDot: {
    borderRadius: 999,
    borderWidth: 1,
    height: 10,
    width: 10,
  },
  answerRailLine: {
    flex: 1,
    marginTop: 6,
    width: 2,
  },
  answerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  answersCount: {
    fontSize: 14,
  },
  answersHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  answerVoteSummary: {
    fontSize: 12,
    fontWeight: '700',
  },
  codeBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
  },
  codeInput: {
    fontFamily: 'monospace',
    minHeight: 110,
  },
  codeText: {
    color: '#DCE7F5',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  commentBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  commentMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentDeleteButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  commentRow: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    padding: 12,
  },
  commentStem: {
    borderRadius: 999,
    marginLeft: 18,
    position: 'absolute',
    top: -14,
    bottom: -14,
    width: 1,
  },
  commentThreadRow: {
    paddingLeft: 10,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 96,
  },
  deleteIconButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  emptyMuted: {
    fontSize: 14,
    lineHeight: 22,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  hiddenRepliesText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  identityAvatar: {
    borderRadius: 999,
    height: 38,
    width: 38,
  },
  identityAvatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  identityAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  identityCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  identityMeta: {
    fontSize: 12,
    flexShrink: 1,
  },
  identityName: {
    fontSize: 14,
    fontWeight: '800',
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  inlineInput: {
    flex: 1,
    fontSize: 15,
    minWidth: 0,
    paddingVertical: 0,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 15,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  questionBody: {
    fontSize: 15,
    lineHeight: 23,
  },
  questionCopy: {
    flex: 1,
    gap: 10,
  },
  questionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  questionTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  replyComposer: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  replyHeader: {
    marginBottom: 4,
  },
  replyList: {
    gap: 10,
  },
  replyMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replyThread: {
    gap: 10,
  },
  replyPreviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  replyToggle: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  replyToggleRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 2,
    marginTop: -2,
  },
  screen: {
    flex: 1,
  },
  sectionCaption: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexShrink: 0,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  smallMeta: {
    fontSize: 13,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
    textAlignVertical: 'top',
  },
  threadCard: {
    marginLeft: 52,
  },
  topAnswerBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topAnswerBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  topMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  voteButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  voteColumn: {
    alignItems: 'center',
    gap: 8,
  },
  voteScore: {
    fontSize: 17,
    fontWeight: '800',
  },
});
