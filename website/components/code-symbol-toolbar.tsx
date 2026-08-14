import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

const SYMBOLS = [
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  '<',
  '>',
  '"',
  "'",
  '`',
  '/',
  '\\',
  '=',
  ':',
  ';',
  ',',
  '.',
  '+',
  '-',
  '_',
  '*',
  '&',
  '|',
  '!',
  '?',
  '#',
  '%',
];

type CodeSymbolToolbarProps = {
  accent: string;
  accentSoft: string;
  background: string;
  border: string;
  bottom: number;
  text: string;
  visible: boolean;
  onInsert: (value: string) => void;
};

export function CodeSymbolToolbar({
  accent,
  accentSoft,
  background,
  border,
  bottom,
  text,
  visible,
  onInsert,
}: CodeSymbolToolbarProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.shell, { backgroundColor: background, borderColor: border, bottom }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.eyebrow, { color: accent }]}>Special characters</ThemedText>
      </View>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {SYMBOLS.map((symbol) => (
          <Pressable
            key={symbol}
            onPress={() => onInsert(symbol)}
            style={({ pressed }) => [
              styles.symbolButton,
              {
                backgroundColor: accentSoft,
                borderColor: border,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}>
            <ThemedText style={[styles.symbolText, { color: text }]}>{symbol}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  shell: {
    borderTopWidth: 1,
    left: 0,
    elevation: 24,
    position: 'absolute',
    right: 0,
    zIndex: 24,
  },
  symbolButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
