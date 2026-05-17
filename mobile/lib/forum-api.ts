import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type FeedAuthor = {
  id: string;
  name: string;
  email: string;
  avatarImageUrl: string;
  avatarColor: string;
};

export type InboxNotification = {
  _id: string;
  type: 'answer' | 'comment' | 'mention';
  targetType: 'question' | 'answer' | 'comment';
  questionId: string;
  answerId: string | null;
  commentId: string | null;
  questionTitle: string;
  bodyPreview: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  actor: FeedAuthor | null;
};

export type Question = {
  _id: string;
  questionId: string;
  postId: string;
  title: string;
  body: string;
  codeSnippet: string;
  tags: string[];
  authorId: string;
  voteScore: number;
  answerCount?: number;
  currentUserVote?: -1 | 0 | 1;
  author?: FeedAuthor;
  createdAt: string;
  updatedAt: string;
};

export type Answer = {
  _id: string;
  answerId: string;
  questionId: string;
  body: string;
  codeSnippet: string;
  authorId: string;
  voteScore: number;
  currentUserVote?: -1 | 0 | 1;
  author?: FeedAuthor;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  _id: string;
  commentId: string;
  targetType: 'question' | 'answer';
  targetId: string;
  questionId: string | null;
  answerId: string | null;
  postId: string | null;
  body: string;
  authorId: string;
  author?: FeedAuthor;
  createdAt: string;
  updatedAt: string;
};

export type ExplainMode = 'overview' | 'simple' | 'line_by_line' | 'bugs' | 'improve' | 'deeper';

export type ExplainResponse = {
  aiId: string;
  detectedLanguage: string;
  mode: ExplainMode;
  explanation?: string;
  breakdown?: string[];
  output?: string;
  relatedExamples?: string[];
  summary: string;
  whatItDoes: string;
  stepByStep: string[];
  keyConcepts: string[];
  potentialIssues: string[];
  improvements: string[];
  lineByLine: string[];
  followUpSuggestions: string[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  canManageAdmins: boolean;
  headline: string;
  bio: string;
  location: string;
  website: string;
  avatarImageUrl: string;
  avatarImagePublicId: string;
  bannerImageUrl: string;
  bannerImagePublicId: string;
  avatarColor: string;
  preferredTags: string[];
  joinedAt: string;
};

export type AuthSession = {
  token: string;
  expiresAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  session: AuthSession;
};

export const SOCIAL_PROVIDERS = ['github', 'google'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type ProfileAnswer = Answer & {
  questionTitle: string;
  questionBody: string;
  questionAuthorId: string;
  questionAuthorEmail?: string;
  questionCreatedAt: string | null;
};

export type ProfileResponse = AuthUser & {
  stats: {
    questions: number;
    answers: number;
    comments: number;
  };
  recentQuestions: Question[];
  recentAnswers: ProfileAnswer[];
};

export type AdminUser = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  effectiveRole: 'user' | 'admin';
  canManageAdmins: boolean;
  joinedAt: string;
};

export type DirectImageUploadResponse = {
  imageId: string;
  imageUrl: string;
  uploadURL: string;
};

const DEMO_USER_ID = 'demo-mobile-user';

const detectApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const constants = Constants as Constants & {
    expoConfig?: { hostUri?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };

  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost ??
    constants.manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:5000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = detectApiBaseUrl();

let currentUserId = DEMO_USER_ID;
let currentSessionToken = '';

export const getApiUserId = () => currentUserId;
export const getApiSessionToken = () => currentSessionToken;

export const setApiUserId = (value: string) => {
  currentUserId = value.trim() || DEMO_USER_ID;
};

export const setApiSessionToken = (value: string) => {
  currentSessionToken = value.trim();
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

const request = async <T>(path: string, options: RequestOptions = {}) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth) {
    const token = getApiSessionToken();

    if (!token) {
      throw new Error('Not authenticated.');
    }

    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : text.trim() || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

export const forumApi = {
  apiBaseUrl: API_BASE_URL,
  health: () => request<{ status: string; service: string }>('/health'),
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: payload,
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: payload,
    }),
  requestMagicLink: (payload: { email: string; callbackUrl: string }) =>
    request<{ message: string }>('/api/auth/magic-link', {
      method: 'POST',
      body: payload,
    }),
  requestPasswordReset: (payload: { email: string; callbackUrl: string }) =>
    request<{ message: string }>('/api/auth/password-reset', {
      method: 'POST',
      body: payload,
    }),
  completePasswordReset: (payload: { userId: string; secret: string; password: string }) =>
    request<{ message: string }>('/api/auth/password-reset/complete', {
      method: 'POST',
      body: payload,
    }),
  getOAuthUrl: (provider: SocialProvider, success: string, failure: string) =>
    request<{ url: string }>(
      `/api/auth/oauth/url?provider=${encodeURIComponent(provider)}&success=${encodeURIComponent(
        success
      )}&failure=${encodeURIComponent(failure)}`
    ),
  completeOAuthLogin: (payload: { userId: string; secret: string }) =>
    request<AuthResponse>('/api/auth/oauth/appwrite', {
      method: 'POST',
      body: payload,
    }),
  completeMagicLinkLogin: (payload: { userId: string; secret: string }) =>
    request<AuthResponse>('/api/auth/magic-link/complete', {
      method: 'POST',
      body: payload,
    }),
  logout: () =>
    request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      auth: true,
    }),
  getCurrentUser: () =>
    request<ProfileResponse>('/api/auth/me', {
      auth: true,
    }),
  updateCurrentUser: (payload: {
    name?: string;
    headline?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatarImageUrl?: string;
    avatarImagePublicId?: string;
    bannerImageUrl?: string;
    bannerImagePublicId?: string;
    avatarColor?: string;
    preferredTags?: string[];
  }) =>
    request<ProfileResponse>('/api/auth/me', {
      method: 'PUT',
      body: payload,
      auth: true,
    }),
  changeCurrentUserPassword: (payload: { password: string }) =>
    request<{ message: string }>('/api/auth/me/password', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  listAdminUsers: (query = '') =>
    request<AdminUser[]>(`/api/auth/admin/users${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`, {
      auth: true,
    }),
  updateUserRole: (userId: string, role: 'user' | 'admin') =>
    request<{ user: AdminUser }>(`/api/auth/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PUT',
      body: { role },
      auth: true,
    }),
  listQuestions: () =>
    request<Question[]>('/api/questions', {
      auth: true,
    }),
  getQuestion: (questionId: string) =>
    request<Question>(`/api/questions/${questionId}`, {
      auth: true,
    }),
  createQuestion: (payload: {
    title: string;
    body: string;
    codeSnippet: string;
    tags: string[];
  }) =>
    request<Question>('/api/questions', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  deleteQuestion: (questionId: string) =>
    request<{ success: boolean; questionId: string }>(`/api/questions/${questionId}`, {
      method: 'DELETE',
      auth: true,
    }),
  listAnswers: (questionId: string) =>
    request<Answer[]>(`/api/questions/${questionId}/answers`, {
      auth: true,
    }),
  createAnswer: (questionId: string, payload: { body: string; codeSnippet: string }) =>
    request<Answer>(`/api/questions/${questionId}/answers`, {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  deleteAnswer: (answerId: string) =>
    request<{ success: boolean; answerId: string; questionId: string }>(`/api/questions/answers/${answerId}`, {
      method: 'DELETE',
      auth: true,
    }),
  listComments: (targetType: 'question' | 'answer', targetId: string) =>
    request<Comment[]>(`/api/comments/${targetType}/${targetId}`),
  createComment: (
    targetType: 'question' | 'answer',
    targetId: string,
    payload: { body: string }
  ) =>
    request<Comment>(`/api/comments/${targetType}/${targetId}`, {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  deleteComment: (commentId: string) =>
    request<{ success: boolean; commentId: string }>(`/api/comments/${commentId}`, {
      method: 'DELETE',
      auth: true,
    }),
  castVote: (targetType: 'question' | 'answer', targetId: string, value: -1 | 1) =>
    request<{
      voteId: string | null;
      targetId: string;
      targetType: string;
      questionId: string;
      answerId: string | null;
      postId: string;
      voteScore: number;
      currentUserVote: -1 | 0 | 1;
    }>(
      `/api/votes/${targetType}/${targetId}`,
      {
        method: 'POST',
        body: { value },
        auth: true,
      }
    ),
  explainCode: (payload: {
    code: string;
    language?: string;
    context?: string;
    mode?: ExplainMode;
  }) =>
    request<ExplainResponse>('/api/ai/explain', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
  listNotifications: () =>
    request<InboxNotification[]>('/api/notifications', {
      auth: true,
    }),
  getUnreadNotificationCount: () =>
    request<{ unreadCount: number }>('/api/notifications/unread-count', {
      auth: true,
    }),
  markNotificationRead: (notificationId: string) =>
    request<InboxNotification>(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      auth: true,
    }),
  markAllNotificationsRead: () =>
    request<{ success: boolean; unreadCount: number }>('/api/notifications/read-all', {
      method: 'POST',
      auth: true,
    }),
};
