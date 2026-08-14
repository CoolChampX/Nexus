import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useAppearance } from '@/lib/appearance';

type NexusLogoProps = {
  compact?: boolean;
  inverted?: boolean;
  flushLeft?: boolean;
};

export function NexusLogo({ compact = false, inverted = false, flushLeft = false }: NexusLogoProps) {
  const { resolvedScheme } = useAppearance();
  const logoSource =
    resolvedScheme === 'dark'
      ? require('../assets/images/nexus-logo-dark.png')
      : require('../assets/images/nexus-logo-light.png');

  return (
    <View style={styles.row}>
      <Image
        source={logoSource}
        contentFit="contain"
        style={[
          compact ? styles.imageCompact : styles.imageRegular,
          inverted ? styles.imageInverted : null,
          flushLeft ? styles.imageFlush : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imageCompact: {
    height: 38,
    width: 126,
  },
  imageFlush: {
    marginLeft: 2,
    marginTop: 2,
  },
  imageInverted: {
    opacity: 1,
  },
  imageRegular: {
    height: 54,
    width: 176,
  },
  row: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginLeft: 0,
  },
});
