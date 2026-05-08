import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  findNodeHandle,
  Platform,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CodeSymbolToolbar } from '@/components/code-symbol-toolbar';
import { NexusLogo } from '@/components/nexus-logo';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { addAiExplainerHistoryEntry } from '@/lib/ai-explainer-history';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type ExplainMode, type ExplainResponse } from '@/lib/forum-api';
import { animateLayoutTransition, enableLayoutTransitions } from '@/lib/ui-transitions';

const toTags = (input: string) =>
  input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

type SelectionRange = {
  start: number;
  end: number;
};

const TOOLBAR_HEIGHT = 54;
const FOCUS_PADDING = 16;
const TOOLBAR_GAP = 0;
const FOLLOW_UP_ACTIONS: { label: string; value: ExplainMode }[] = [
  { label: 'Explain deeper', value: 'deeper' },
  { label: 'Make it simpler', value: 'simple' },
  { label: 'Line by line', value: 'line_by_line' },
  { label: 'Find bugs', value: 'bugs' },
  { label: 'Suggest improvements', value: 'improve' },
];

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

const buildExplanationViewModel = (result: ExplainResponse) => ({
  explanation: result.explanation?.trim() || result.summary,
  breakdown:
    result.breakdown?.length
      ? result.breakdown
      : result.stepByStep.length
        ? result.stepByStep
        : result.lineByLine,
  output: result.output?.trim() || '',
  relatedExamples: result.relatedExamples?.length ? result.relatedExamples : [],
});

export default function QuestionsScreen() {
  const { ready, user } = useAuth();
  const { palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const questionCodeRef = useRef<TextInput>(null);
  const aiCodeRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [creating, setCreating] = useState(false);

  const [aiCode, setAiCode] = useState('');
  const [explainMode, setExplainMode] = useState<ExplainMode>('overview');
  const [explaining, setExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState<ExplainResponse | null>(null);

  const [activeCodeField, setActiveCodeField] = useState<'question' | 'ai' | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [questionCodeSelection, setQuestionCodeSelection] = useState<SelectionRange>({
    start: 0,
    end: 0,
  });
  const [aiCodeSelection, setAiCodeSelection] = useState<SelectionRange>({
    start: 0,
    end: 0,
  });
  const toolbarBottom = Platform.OS === 'android' ? 0 : Math.max(keyboardHeight - insets.bottom, 0);

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
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight <= 0 || !activeCodeField) {
      return;
    }

    const timer = setTimeout(() => {
      scrollFocusedFieldIntoView(activeCodeField);
    }, 80);

    return () => clearTimeout(timer);
  }, [activeCodeField, keyboardHeight, scrollOffset]);

  const scrollFocusedFieldIntoView = (field: 'question' | 'ai') => {
    const targetRef = field === 'question' ? questionCodeRef : aiCodeRef;
    const nodeHandle = findNodeHandle(targetRef.current);

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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const focusCodeField = (field: 'question' | 'ai') => {
    setActiveCodeField(field);

    setTimeout(() => {
      scrollFocusedFieldIntoView(field);
    }, keyboardHeight > 0 ? 20 : 120);
  };

  const submitQuestion = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing details', 'Add both a title and a body before posting.');
      return;
    }

    setCreating(true);

    try {
      const question = await forumApi.createQuestion({
        title: title.trim(),
        body: body.trim(),
        codeSnippet: codeSnippet.trim(),
        tags: toTags(tagsInput),
      });

      setTitle('');
      setBody('');
      setCodeSnippet('');
      setTagsInput('');

      router.push({
        pathname: '/questions/[questionId]',
        params: { questionId: question._id },
      });
    } catch (error) {
      Alert.alert('Could not create question', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const runExplain = async (nextMode: ExplainMode = explainMode) => {
    if (!aiCode.trim()) {
      Alert.alert('Missing code', 'Paste a snippet to generate an explanation.');
      return;
    }

    setExplaining(true);

    try {
      const result = await forumApi.explainCode({
        code: aiCode.trim(),
        mode: nextMode,
      });

      animateLayoutTransition();
      setExplainMode(nextMode);
      setExplanationResult(result);
      await addAiExplainerHistoryEntry({
        code: aiCode.trim(),
        mode: nextMode,
        result,
      });
    } catch (error) {
      Alert.alert('Could not explain code', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExplaining(false);
    }
  };

  const handleInsertSymbol = (token: string) => {
    if (activeCodeField === 'question') {
      const result = insertIntoSelection(codeSnippet, questionCodeSelection, token);
      setCodeSnippet(result.nextValue);
      setQuestionCodeSelection(result.nextSelection);
      return;
    }

    if (activeCodeField === 'ai') {
      const result = insertIntoSelection(aiCode, aiCodeSelection, token);
      setAiCode(result.nextValue);
      setAiCodeSelection(result.nextSelection);
    }
  };

  const explanationView = explanationResult ? buildExplanationViewModel(explanationResult) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
      <View style={[styles.screen, { backgroundColor: palette.background }]}>
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
          ]}>
          <View style={[styles.headerCard, { backgroundColor: palette.hero }]}>
            <NexusLogo inverted flushLeft />
          </View>

          <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={[styles.panelTitle, { color: palette.text }]}>Ask a question</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={() => setActiveCodeField(null)}
              placeholder="How to fix this bug?"
              placeholderTextColor={palette.muted}
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              onFocus={() => setActiveCodeField(null)}
              placeholder="Describe the problem, what you expected, and what you already tried."
              placeholderTextColor={palette.muted}
              multiline
              style={[
                styles.input,
                styles.largeInput,
                { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
              ]}
            />
            <TextInput
              ref={questionCodeRef}
              value={codeSnippet}
              onChangeText={setCodeSnippet}
              onFocus={() => focusCodeField('question')}
              onSelectionChange={({ nativeEvent }) => setQuestionCodeSelection(nativeEvent.selection)}
              selection={questionCodeSelection}
              placeholder="Optional code snippet"
              placeholderTextColor={palette.muted}
              multiline
              style={[
                styles.input,
                styles.codeInput,
                { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
              ]}
            />
            <TextInput
              value={tagsInput}
              onChangeText={setTagsInput}
              onFocus={() => setActiveCodeField(null)}
              placeholder="react, typescript, expo"
              placeholderTextColor={palette.muted}
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            <Pressable onPress={submitQuestion} style={[styles.primaryButton, { backgroundColor: palette.accent }]}>
              <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
                {creating ? 'Publishing...' : 'Publish to Nexus'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.panelHeader}>
              <ThemedText style={[styles.panelTitle, { color: palette.text }]}>Explain code with AI</ThemedText>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => {
                    animateLayoutTransition();
                    setExplanationResult(null);
                  }}
                  style={[styles.historyButton, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <MaterialIcons name="layers-clear" size={20} color={palette.text} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/ai-history')}
                  style={[styles.historyButton, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <MaterialIcons name="history" size={20} color={palette.text} />
                </Pressable>
              </View>
            </View>
            <TextInput
              ref={aiCodeRef}
              value={aiCode}
              onChangeText={(value) => {
                setAiCode(value);

                if (!value.trim()) {
                  animateLayoutTransition();
                  setExplanationResult(null);
                }
              }}
              onFocus={() => focusCodeField('ai')}
              onSelectionChange={({ nativeEvent }) => setAiCodeSelection(nativeEvent.selection)}
              selection={aiCodeSelection}
              placeholder="Paste code here"
              placeholderTextColor={palette.muted}
              multiline
              style={[
                styles.input,
                styles.codePanelInput,
                { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
              ]}
            />
            <Pressable
              onPress={() => void runExplain()}
              style={[styles.secondaryButton, { backgroundColor: palette.accent }]}>
              <ThemedText style={[styles.secondaryButtonText, { color: palette.textOnAccent }]}>
                {explaining ? 'Generating...' : 'Explain snippet'}
              </ThemedText>
            </Pressable>

            {explanationResult ? (
              <View style={[styles.resultCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
                <View style={styles.promptRow}>
                  <View style={[styles.promptBubble, { backgroundColor: palette.cardAlt, borderColor: palette.border }]}>
                    <ThemedText numberOfLines={1} style={[styles.promptBubbleText, { color: palette.text }]}>
                      {`${aiCode.trim().slice(0, 42)}${aiCode.trim().length > 42 ? '...' : ''} explain this`}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.resultHeader}>
                  <View>
                    <ThemedText style={[styles.resultEyebrow, { color: palette.accent }]}>AI explanation</ThemedText>
                    <ThemedText style={[styles.resultMeta, { color: palette.muted }]}>
                      {explanationResult.detectedLanguage} • {explanationResult.mode.replace(/_/g, ' ')}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.answerBubble, { backgroundColor: palette.cardAlt, borderColor: palette.border }]}>
                  <ThemedText style={[styles.resultBody, { color: palette.text }]}>
                    {explanationView?.explanation}
                  </ThemedText>
                </View>

                {explanationView?.breakdown.length ? (
                  <View style={styles.sectionBlock}>
                    <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
                      Here&apos;s a breakdown of each part:
                    </ThemedText>
                    {explanationView.breakdown.map((item, index) => (
                      <View key={`${item}-${index}`} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: palette.accent }]} />
                        <ThemedText style={[styles.resultBullet, { color: palette.text }]}>{item}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {explanationView?.output ? (
                  <View style={styles.sectionBlock}>
                    <ThemedText style={[styles.resultBody, { color: palette.text }]}>
                      When executed, your code produces:
                    </ThemedText>
                    <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Output:</ThemedText>
                    <View
                      style={[styles.codeShell, { backgroundColor: palette.cardAlt, borderColor: palette.border }]}>
                      <ThemedText style={[styles.codeText, { color: palette.text }]}>{explanationView.output}</ThemedText>
                    </View>
                  </View>
                ) : null}

                {explanationView?.relatedExamples.length ? (
                  <View style={styles.sectionBlock}>
                    <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>A few related examples:</ThemedText>
                    <View
                      style={[styles.codeShell, { backgroundColor: palette.cardAlt, borderColor: palette.border }]}>
                      <View style={styles.codeShellHeader}>
                        <ThemedText style={[styles.codeShellLabel, { color: palette.muted }]}>
                          {explanationResult.detectedLanguage.toLowerCase()}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.codeText, { color: palette.text }]}>
                        {explanationView.relatedExamples.join('\n')}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}

                <View style={styles.sectionBlock}>
                  <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Mental model</ThemedText>
                  <ThemedText style={[styles.resultBody, { color: palette.text }]}>
                    {explanationResult.whatItDoes}
                  </ThemedText>
                </View>

                {explanationResult.lineByLine.length ? (
                  <View style={styles.sectionBlock}>
                    <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Line by line</ThemedText>
                    {explanationResult.lineByLine.map((item, index) => (
                      <View key={`${item}-${index}`} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: palette.accent }]} />
                        <ThemedText style={[styles.resultBullet, { color: palette.text }]}>{item}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.sectionBlock}>
                  <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Go deeper</ThemedText>
                  <View style={styles.chipRow}>
                    {FOLLOW_UP_ACTIONS.map((action) => (
                      <Pressable
                        key={action.value}
                        disabled={explaining}
                        onPress={() => void runExplain(action.value)}
                        style={[
                          styles.followUpChip,
                          action.value === explainMode
                            ? { backgroundColor: palette.accentSoft, borderColor: palette.accent }
                            : { backgroundColor: palette.cardAlt, borderColor: palette.border },
                          explaining && styles.followUpChipDisabled,
                        ]}>
                        <ThemedText style={[styles.followUpChipText, { color: palette.text }]}>
                          {explaining && action.value === explainMode ? 'Generating...' : action.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <ThemedText style={[styles.followUpHint, { color: palette.muted }]}>
                    Tap any mode to regenerate this explanation in a different style.
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>
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
  answerBubble: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  bulletDot: {
    borderRadius: 999,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  codeShell: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  codeShellHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  codeShellLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 21,
  },
  codeInput: {
    fontFamily: 'monospace',
    minHeight: 112,
  },
  codePanelInput: {
    fontFamily: 'monospace',
    minHeight: 180,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 96,
  },
  headerCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 24,
    marginLeft: -16,
    paddingBottom: 18,
    paddingLeft: 0,
    paddingRight: 18,
    paddingTop: 18,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
  },
  largeInput: {
    minHeight: 150,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  promptBubble: {
    alignSelf: 'flex-end',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  promptBubbleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  promptRow: {
    alignItems: 'flex-end',
  },
  resultBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  resultBullet: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  resultEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resultHeader: {
    alignItems: 'flex-start',
    gap: 4,
  },
  resultMeta: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  resultTag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  followUpChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  followUpChipDisabled: {
    opacity: 0.7,
  },
  followUpChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followUpHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
