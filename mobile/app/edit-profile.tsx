import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type ProfileResponse } from '@/lib/forum-api';

type PendingImageAsset = ImagePicker.ImagePickerAsset | null;

type UploadedCloudinaryImage = {
  publicId: string;
  secureUrl: string;
};

const cloudinaryCloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || '';
const cloudinaryUploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() || '';

const formatJoinedDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));

export default function EditProfileScreen() {
  const { ready, user, refreshProfile } = useAuth();
  const { palette, resolvedScheme } = useAppearance();
  const loadingCardBorder = resolvedScheme === 'dark' ? '#20304A' : palette.border;
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarImageUrl, setAvatarImageUrl] = useState('');
  const [avatarImagePublicId, setAvatarImagePublicId] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerImagePublicId, setBannerImagePublicId] = useState('');
  const [pendingAvatarAsset, setPendingAvatarAsset] = useState<PendingImageAsset>(null);
  const [pendingBannerAsset, setPendingBannerAsset] = useState<PendingImageAsset>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const entrance = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace('/auth');
      return;
    }

    const loadProfile = async () => {
      const response = await forumApi.getCurrentUser();
      setProfile(response);
      setName(response.name);
      setHeadline(response.headline);
      setBio(response.bio);
      setLocation(response.location);
      setAvatarImageUrl(response.avatarImageUrl);
      setAvatarImagePublicId(response.avatarImagePublicId);
      setBannerImageUrl(response.bannerImageUrl);
      setBannerImagePublicId(response.bannerImagePublicId);
    };

    void loadProfile();
  }, [ready, user]);

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const closeScreen = () => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;

    Animated.timing(entrance, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      router.back();
      closingRef.current = false;
    });
  };

  const pickImage = async (target: 'avatar' | 'banner') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access so you can choose an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: target === 'banner' ? [16, 7] : [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const nextAsset = result.assets[0];

    if (!nextAsset) {
      return;
    }

    const nextUri = nextAsset.uri ?? '';

    if (target === 'banner') {
      setPendingBannerAsset(nextAsset);
      setBannerImageUrl(nextUri);
      return;
    }

    setPendingAvatarAsset(nextAsset);
    setAvatarImageUrl(nextUri);
  };

  const clearImage = (target: 'avatar' | 'banner') => {
    if (target === 'banner') {
      setPendingBannerAsset(null);
      setBannerImageUrl('');
      setBannerImagePublicId('');
      return;
    }

    setPendingAvatarAsset(null);
    setAvatarImageUrl('');
    setAvatarImagePublicId('');
  };

  const uploadImageToCloudinary = async (
    asset: ImagePicker.ImagePickerAsset,
    kind: 'avatar' | 'banner'
  ): Promise<UploadedCloudinaryImage> => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      throw new Error('Cloudinary upload is not configured in the mobile environment.');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName?.trim() || `${kind}.${asset.mimeType?.split('/')[1] || 'jpg'}`,
      type: asset.mimeType?.trim() || 'image/jpeg',
    } as any);
    formData.append('upload_preset', cloudinaryUploadPreset);
    formData.append('folder', `nexus/${kind}s`);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
      {
      method: 'POST',
      body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const responseText = await uploadResponse.text().catch(() => '');
      throw new Error(responseText.trim() || `Could not upload the ${kind} image to Cloudinary.`);
    }

    const payload = (await uploadResponse.json().catch(() => null)) as
      | { public_id?: string; secure_url?: string; error?: { message?: string } }
      | null;

    if (!payload?.public_id || !payload.secure_url) {
      throw new Error(payload?.error?.message || `Cloudinary did not return a valid ${kind} image.`);
    }

    return {
      publicId: payload.public_id,
      secureUrl: payload.secure_url,
    };
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      if (newPassword.trim() || confirmPassword.trim()) {
        if (newPassword.trim().length < 8) {
          throw new Error('Use at least 8 characters for your new password.');
        }

        if (newPassword !== confirmPassword) {
          throw new Error('Your new password and confirmation do not match.');
        }
      }

      const [nextAvatarUpload, nextBannerUpload] = await Promise.all([
        pendingAvatarAsset
          ? uploadImageToCloudinary(pendingAvatarAsset, 'avatar')
          : Promise.resolve<UploadedCloudinaryImage | null>(null),
        pendingBannerAsset
          ? uploadImageToCloudinary(pendingBannerAsset, 'banner')
          : Promise.resolve<UploadedCloudinaryImage | null>(null),
      ]);

      const nextAvatarImageUrl = nextAvatarUpload?.secureUrl ?? avatarImageUrl;
      const nextAvatarPublicId = nextAvatarUpload?.publicId ?? avatarImagePublicId;
      const nextBannerImageUrl = nextBannerUpload?.secureUrl ?? bannerImageUrl;
      const nextBannerPublicId = nextBannerUpload?.publicId ?? bannerImagePublicId;

      const updatedProfile = await forumApi.updateCurrentUser({
        name,
        headline,
        bio,
        location,
        avatarImageUrl: nextAvatarImageUrl,
        avatarImagePublicId: nextAvatarPublicId,
        bannerImageUrl: nextBannerImageUrl,
        bannerImagePublicId: nextBannerPublicId,
      });

      setProfile(updatedProfile);
      setAvatarImageUrl(updatedProfile.avatarImageUrl);
      setAvatarImagePublicId(updatedProfile.avatarImagePublicId);
      setBannerImageUrl(updatedProfile.bannerImageUrl);
      setBannerImagePublicId(updatedProfile.bannerImagePublicId);
      setPendingAvatarAsset(null);
      setPendingBannerAsset(null);

      await refreshProfile(updatedProfile);

      if (newPassword.trim()) {
        await forumApi.changeCurrentUserPassword({
          password: newPassword,
        });
      }

      closeScreen();
    } catch (error) {
      Alert.alert('Could not update profile', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

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
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={[styles.loadingCard, { backgroundColor: palette.card, borderColor: loadingCardBorder }]}>
          <View style={[styles.loadingBanner, { backgroundColor: palette.subtle }]} />
          <View style={[styles.loadingLineLg, { backgroundColor: palette.subtle }]} />
          <View style={[styles.loadingLineSm, { backgroundColor: palette.subtle }]} />
        </View>
      </Animated.View>
    );
  }

  const bannerSource = bannerImageUrl.trim() || undefined;
  const avatarSource = avatarImageUrl.trim() || undefined;
  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const cardBorder = resolvedScheme === 'dark' ? '#20304A' : palette.border;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      <Animated.View
        style={[
          styles.animatedShell,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [22, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.actionRow}>
          <Pressable onPress={closeScreen}>
            <ThemedText style={[styles.actionText, { color: palette.accent }]}>Cancel</ThemedText>
          </Pressable>
          <Pressable onPress={saveProfile}>
            <ThemedText style={[styles.actionText, { color: palette.accent }]}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Cover Photo</ThemedText>
          <View style={[styles.bannerFrame, { backgroundColor: palette.subtle }]}>
            {bannerSource ? (
              <Image source={bannerSource} contentFit="cover" style={styles.bannerImage} />
            ) : (
              <View style={[styles.bannerFallback, { backgroundColor: palette.accent }]}>
                <MaterialIcons name="add-photo-alternate" size={28} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.mediaActionRow}>
            <Pressable
              onPress={() => void pickImage('banner')}
              style={[styles.changeButton, styles.mediaActionButton, { borderColor: cardBorder }]}>
              <ThemedText style={[styles.changeButtonText, { color: palette.text }]}>Change cover photo</ThemedText>
            </Pressable>
            {(bannerSource || bannerImagePublicId) ? (
              <Pressable
                onPress={() => clearImage('banner')}
                style={[styles.changeButton, styles.mediaActionButton, { borderColor: '#FCA5A5' }]}>
                <ThemedText style={[styles.changeButtonText, { color: '#DC2626' }]}>Remove</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Profile Picture</ThemedText>
          <View style={styles.avatarSection}>
            <View style={[styles.avatarRing, { borderColor: palette.card }]}>
              {avatarSource ? (
                <Image source={avatarSource} contentFit="cover" style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: palette.accent }]}>
                  <ThemedText style={styles.avatarText}>{initials}</ThemedText>
                </View>
              )}
            </View>
          </View>
          <View style={styles.mediaActionRow}>
            <Pressable
              onPress={() => void pickImage('avatar')}
              style={[styles.changeButton, styles.mediaActionButton, { borderColor: cardBorder }]}>
              <ThemedText style={[styles.changeButtonText, { color: palette.text }]}>Change profile picture</ThemedText>
            </Pressable>
            {(avatarSource || avatarImagePublicId) ? (
              <Pressable
                onPress={() => clearImage('avatar')}
                style={[styles.changeButton, styles.mediaActionButton, { borderColor: '#FCA5A5' }]}>
                <ThemedText style={[styles.changeButtonText, { color: '#DC2626' }]}>Remove</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Name</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.card, borderColor: cardBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Headline</ThemedText>
          <TextInput
            value={headline}
            onChangeText={setHeadline}
            placeholder="Headline"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.card, borderColor: cardBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Bio</ThemedText>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            placeholderTextColor={palette.muted}
            multiline
            style={[
              styles.input,
              styles.bioInput,
              { backgroundColor: palette.card, borderColor: cardBorder, color: palette.text },
            ]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Location</ThemedText>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Location"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.card, borderColor: cardBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Set New Password</ThemedText>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="new password"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.card, borderColor: cardBorder, color: palette.text }]}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="confirm new password"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.card, borderColor: cardBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Joined</ThemedText>
          <View style={[styles.infoCard, { backgroundColor: palette.card, borderColor: cardBorder }]}>
            <ThemedText style={[styles.infoText, { color: palette.text }]}>{formatJoinedDate(profile.joinedAt)}</ThemedText>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  animatedShell: {
    gap: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 17,
    fontWeight: '700',
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 48,
    flex: 1,
    justifyContent: 'center',
  },
  avatarImage: {
    borderRadius: 48,
    height: '100%',
    width: '100%',
  },
  avatarRing: {
    backgroundColor: '#FFFFFF',
    borderRadius: 52,
    borderWidth: 4,
    height: 104,
    overflow: 'hidden',
    width: 104,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  bannerFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  bannerFrame: {
    borderRadius: 18,
    height: 160,
    overflow: 'hidden',
  },
  bannerImage: {
    height: '100%',
    width: '100%',
  },
  bioInput: {
    minHeight: 92,
  },
  changeButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 12,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoText: {
    fontSize: 15,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  mediaActionButton: {
    flex: 1,
    marginTop: 0,
  },
  mediaActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  loadingBanner: {
    borderRadius: 18,
    height: 160,
  },
  loadingCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  loadingLineLg: {
    borderRadius: 999,
    height: 16,
    width: '68%',
  },
  loadingLineSm: {
    borderRadius: 999,
    height: 14,
    width: '42%',
  },
  screen: {
    flex: 1,
  },
  section: {},
});
