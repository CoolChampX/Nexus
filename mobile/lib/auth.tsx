import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  startTransition,
  useEffect,
  useContext,
  useMemo,
  useState,
} from 'react';

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
  user: AuthUser | null;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  loginWithOAuth: (payload: { provider: SocialProvider; userId: string; secret: string }) => Promise<void>;
  loginWithMagicLink: (payload: { userId: string; secret: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = 'nexus.auth.session';
const GUEST_USER_ID = 'guest-user';

type StoredAuthSession = AuthResponse;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const persistAuth = async (nextAuth: StoredAuthSession | null) => {
    if (!nextAuth) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  };

  const refreshProfile = async () => {
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
  };

  const login = async ({ email, password }: { email: string; password: string }) => {
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
  };

  const register = async ({
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
  };

  const loginWithOAuth = async ({
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
  };

  const loginWithMagicLink = async ({
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
  };

  const logout = () => {
    void forumApi.logout().catch(() => undefined);
    void persistAuth(null);
    startTransition(() => {
      setApiSessionToken('');
      setApiUserId(GUEST_USER_ID);
      setUser(null);
    });
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const storedAuthJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

        if (!storedAuthJson) {
          setApiSessionToken('');
          setApiUserId(GUEST_USER_ID);
          return;
        }

        const storedAuth = JSON.parse(storedAuthJson) as StoredAuthSession;
        setApiSessionToken(storedAuth.session.token);
        setApiUserId(storedAuth.user.id);

        if (active) {
          startTransition(() => {
            setUser(storedAuth.user);
          });
        }

        try {
          const profile = await forumApi.getCurrentUser();

          if (active) {
            startTransition(() => {
              setUser(profile);
            });
          }

          await persistAuth({
            ...storedAuth,
            user: profile,
          });
        } catch {
          await persistAuth(null);
          setApiSessionToken('');
          setApiUserId(GUEST_USER_ID);

          if (active) {
            startTransition(() => {
              setUser(null);
            });
          }
        }
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
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user,
      login,
      register,
      loginWithOAuth,
      loginWithMagicLink,
      logout,
      refreshProfile,
    }),
    [ready, user]
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
