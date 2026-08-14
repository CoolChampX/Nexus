import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  forumApi,
  type AuthResponse,
  type AuthUser,
  type SocialProvider,
  setApiSessionToken,
  setApiUserId,
} from './forum-api';

type AuthContextValue = {
  ready: boolean;
  isRefreshingSession: boolean;
  user: AuthUser | null;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  loginWithOAuth: (payload: { provider: SocialProvider; userId: string; secret: string }) => Promise<void>;
  loginWithMagicLink: (payload: { userId: string; secret: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: (nextProfile?: AuthUser | null) => Promise<void>;
  syncSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = 'nexus.auth.session';
const GUEST_USER_ID = 'guest-user';

type StoredAuthSession = AuthResponse;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);

  const persistAuth = useCallback(async (nextAuth: StoredAuthSession | null) => {
    if (!nextAuth) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  }, []);

  const clearAuthState = useCallback(async () => {
    await persistAuth(null);
    setApiSessionToken('');
    setApiUserId(GUEST_USER_ID);

    startTransition(() => {
      setUser(null);
    });
  }, [persistAuth]);

  const syncSession = useCallback(async () => {
    setIsRefreshingSession(true);

    try {
      const storedAuthJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

      if (!storedAuthJson) {
        await clearAuthState();
        return false;
      }

      const storedAuth = JSON.parse(storedAuthJson) as StoredAuthSession;
      setApiSessionToken(storedAuth.session.token);
      setApiUserId(storedAuth.user.id);

      try {
        const profile = await forumApi.getCurrentUser();

        startTransition(() => {
          setUser(profile);
        });

        await persistAuth({
          ...storedAuth,
          user: profile,
        });

        return true;
      } catch {
        await clearAuthState();
        return false;
      }
    } finally {
      setIsRefreshingSession(false);
    }
  }, [clearAuthState, persistAuth]);

  const refreshProfile = useCallback(async (nextProfile?: AuthUser | null) => {
    const profileToPersist = nextProfile ?? null;

    if (profileToPersist) {
      startTransition(() => {
        setUser(profileToPersist);
      });

      const storedAuthJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

      if (!storedAuthJson) {
        await persistAuth(null);
        return;
      }

      const storedAuth = JSON.parse(storedAuthJson) as StoredAuthSession;
      await persistAuth({
        ...storedAuth,
        user: profileToPersist,
      });
      return;
    }

    if (!user?.id) {
      return;
    }

    setApiUserId(user.id);
    const profile = await forumApi.getCurrentUser();

    startTransition(() => {
      setUser(profile);
    });

    const storedAuthJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedAuthJson) {
      await persistAuth(null);
      return;
    }

    const storedAuth = JSON.parse(storedAuthJson) as StoredAuthSession;
    await persistAuth({
      ...storedAuth,
      user: profile,
    });
  }, [persistAuth, user?.id]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const response = await forumApi.login({
      email: email.trim(),
      password,
    });

    startTransition(() => {
      setApiSessionToken(response.session.token);
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistAuth(response);
  }, [persistAuth]);

  const register = useCallback(async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    const response = await forumApi.register({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    startTransition(() => {
      setApiSessionToken(response.session.token);
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistAuth(response);
  }, [persistAuth]);

  const loginWithOAuth = useCallback(async ({
    provider: _provider,
    userId,
    secret,
  }: {
    provider: SocialProvider;
    userId: string;
    secret: string;
  }) => {
    const response = await forumApi.completeOAuthLogin({
      userId: userId.trim(),
      secret: secret.trim(),
    });

    startTransition(() => {
      setApiSessionToken(response.session.token);
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistAuth(response);
  }, [persistAuth]);

  const loginWithMagicLink = useCallback(async ({
    userId,
    secret,
  }: {
    userId: string;
    secret: string;
  }) => {
    const response = await forumApi.completeMagicLinkLogin({
      userId: userId.trim(),
      secret: secret.trim(),
    });

    startTransition(() => {
      setApiSessionToken(response.session.token);
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistAuth(response);
  }, [persistAuth]);

  const logout = useCallback(() => {
    void forumApi.logout().catch(() => undefined);
    startTransition(() => {
      setApiSessionToken('');
      setApiUserId(GUEST_USER_ID);
      setUser(null);
    });
    void persistAuth(null);
  }, [persistAuth]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await syncSession();
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [syncSession]);

  const handleAppStateChange = useCallback((nextState: string) => {
    if (nextState === 'active') {
      void syncSession();
    }
  }, [syncSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      handleAppStateChange(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const value = useMemo(
    () => ({
      ready,
      isRefreshingSession,
      user,
      login,
      register,
      loginWithOAuth,
      loginWithMagicLink,
      logout,
      refreshProfile,
      syncSession,
    }),
    [isRefreshingSession, ready, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
