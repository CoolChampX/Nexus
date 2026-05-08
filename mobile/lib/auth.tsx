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

import { forumApi, type AuthUser, type SocialProvider, setApiUserId } from './forum-api';

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
const AUTH_STORAGE_KEY = 'nexus.auth.user';
const GUEST_USER_ID = 'guest-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const persistUser = async (nextUser: AuthUser | null) => {
    if (!nextUser) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
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
    await persistUser(profile);
  };

  const login = async ({ email, password }: { email: string; password: string }) => {
    const response = await forumApi.login({
      email: email.trim(),
      password,
    });

    startTransition(() => {
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistUser(response.user);
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
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistUser(response.user);
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
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistUser(response.user);
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
      setApiUserId(response.user.id);
      setUser(response.user);
    });
    await persistUser(response.user);
  };

  const logout = () => {
    void persistUser(null);
    startTransition(() => {
      setApiUserId(GUEST_USER_ID);
      setUser(null);
    });
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const storedUserJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

        if (!storedUserJson) {
          setApiUserId(GUEST_USER_ID);
          return;
        }

        const storedUser = JSON.parse(storedUserJson) as AuthUser;
        setApiUserId(storedUser.id);

        if (active) {
          startTransition(() => {
            setUser(storedUser);
          });
        }

        try {
          const profile = await forumApi.getCurrentUser();

          if (active) {
            startTransition(() => {
              setUser(profile);
            });
          }

          await persistUser(profile);
        } catch {
          await persistUser(null);
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
