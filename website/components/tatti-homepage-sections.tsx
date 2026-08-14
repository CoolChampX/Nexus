import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export const TATTI_FILTERS = ['Hot', 'React', 'Python', 'TypeScript', 'Newest'];
export const TATTI_NAV_ITEMS = ['Newest', 'Active', 'Unanswered'];

type TattiHomepageSectionsProps = {
  activeFilter: string;
  mutedColor: string;
  onFilterPress: (filter: string) => void;
};

export function TattiHomepageSections({
  activeFilter,
  mutedColor,
  onFilterPress,
}: TattiHomepageSectionsProps) {
  return (
    <>
      <View style={[styles.filterStrip, { backgroundColor: '#FEF3E2' }]}>
        {TATTI_FILTERS.map((filter, index) => {
          const active = filter === activeFilter;
          return (
            <Pressable
              key={filter}
              onPress={() => onFilterPress(filter)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }
                  : { backgroundColor: 'transparent', borderColor: '#FED7AA' },
              ]}>
              <ThemedText
                style={[
                  styles.filterText,
                  { color: index === 0 ? '#F97316' : '#EA580C' },
                ]}>
                {index === 0 ? '# ' : ''}
                {filter}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.navStrip, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
        {TATTI_NAV_ITEMS.map((item, index) => (
          <ThemedText
            key={item}
            style={[
              styles.navText,
              {
                color: index === 0 ? '#F59E0B' : mutedColor,
              },
            ]}>
            {item}
          </ThemedText>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  navStrip: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  navText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
