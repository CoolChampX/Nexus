import {
  createContext,
  ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './auth';
import { forumApi, type InboxNotification } from './forum-api';
import { animateLayoutTransition, enableLayoutTransitions } from './ui-transitions';

type NotificationsContextValue = {
  notifications: InboxNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setNotifications: (notifications: InboxNotification[]) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const isAuthErrorMessage = (message: string) =>
  message === 'Not authenticated.' || message === 'Unauthorized' || message === 'User not found.';

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isRefreshingSession, logout, user } = useAuth();
  const [notifications, setNotificationsState] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    enableLayoutTransitions();
  }, []);

  const setNotifications = useCallback((nextNotifications: InboxNotification[]) => {
    startTransition(() => {
      setNotificationsState(nextNotifications);
      setUnreadCount(nextNotifications.filter((item) => !item.readAt).length);
    });
  }, []);

  const handleMissingUser = useCallback(() => {
    setNotifications([]);
    logout();
  }, [logout, setNotifications]);

  const refreshNotifications = useCallback(async () => {
    if (isRefreshingSession) {
      return;
    }

    if (!user?.id) {
      setNotifications([]);
      return;
    }

    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const nextNotifications = await forumApi.listNotifications();
      setNotifications(nextNotifications);
    } catch (error) {
      if (error instanceof Error && isAuthErrorMessage(error.message)) {
        handleMissingUser();
        return;
      }

      console.warn('Failed to refresh notifications', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [handleMissingUser, isRefreshingSession, setNotifications, user?.id]);

  const refreshUnreadCount = useCallback(async () => {
    if (isRefreshingSession) {
      return;
    }

    if (!user?.id) {
      startTransition(() => {
        setUnreadCount(0);
      });
      return;
    }

    try {
      const response = await forumApi.getUnreadNotificationCount();

      startTransition(() => {
        setUnreadCount(response.unreadCount);
      });
    } catch (error) {
      if (error instanceof Error && isAuthErrorMessage(error.message)) {
        handleMissingUser();
        return;
      }

      console.warn('Failed to refresh unread notification count', error);
    }
  }, [handleMissingUser, isRefreshingSession, user?.id]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    const notification = notifications.find((item) => item._id === notificationId);

    if (!notification || notification.readAt) {
      return;
    }

    const updatedNotification = await forumApi.markNotificationRead(notificationId);

    animateLayoutTransition();
    startTransition(() => {
      setNotificationsState((current) =>
        current.map((item) => (item._id === notificationId ? updatedNotification : item))
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    });
  }, [notifications]);

  const markAllNotificationsRead = useCallback(async () => {
    await forumApi.markAllNotificationsRead();

    animateLayoutTransition();
    startTransition(() => {
      setNotificationsState((current) =>
        current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    });
  }, []);

  useEffect(() => {
    if (isRefreshingSession) {
      return;
    }

    if (!user?.id) {
      setNotifications([]);
      return;
    }

    void refreshUnreadCount();
    void refreshNotifications();

    const intervalId = setInterval(() => {
      void refreshUnreadCount();
      void refreshNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isRefreshingSession, refreshNotifications, refreshUnreadCount, setNotifications, user?.id]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      refreshNotifications,
      refreshUnreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      setNotifications,
    }),
    [
      markAllNotificationsRead,
      markNotificationRead,
      notifications,
      refreshNotifications,
      refreshUnreadCount,
      setNotifications,
      unreadCount,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used inside NotificationsProvider');
  }

  return context;
}
