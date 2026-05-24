import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { ApiError, getJson, postJson } from './api';
import { deleteToken, getToken, setToken } from './token-storage';

const authTokenKey = 'workhub.auth.token';

export type User = {
  id: number;
  email: string;
  name: string;
  organizationId: number;
};

export type Organization = {
  id: number;
  name: string;
  slug: string;
};

export type Role = {
  id: number;
  name: string;
  description: string | null;
};

type AuthSession = {
  token: string;
  expiresIn: number;
  user: User;
  organization: Organization;
  roles: Role[];
};

type MeResponse = Omit<AuthSession, 'token' | 'expiresIn'>;

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authenticatedGet: <TResponse>(path: string) => Promise<TResponse>;
  authenticatedPost: <TResponse>(path: string, body?: unknown) => Promise<TResponse>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getToken(authTokenKey)
      .then(async (token) => {
        if (!isMounted || !token) {
          return;
        }

        try {
          const nextSession = await buildSessionFromToken(token);

          if (isMounted) {
            setSession(nextSession);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await deleteToken(authTokenKey);
          } else {
            throw error;
          }
        }
      })
      .catch(() => deleteToken(authTokenKey))
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await postJson<AuthSession>('/auth/login', {
      email: email.trim(),
      password,
    });

    setSession(nextSession);
    void setToken(authTokenKey, nextSession.token).catch(() => {
      // Keep the successful in-memory login responsive; persistence only affects the next launch.
    });
  }, []);

  const logout = useCallback(async () => {
    setSession(null);
    await deleteToken(authTokenKey);
  }, []);

  const handleAuthError = useCallback(
    async (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }

      throw error;
    },
    [logout],
  );

  const authenticatedGet = useCallback(
    async <TResponse,>(path: string) => {
      if (!session?.token) {
        throw new ApiError(401, 'Authentication is required.');
      }

      try {
        return await getJson<TResponse>(path, session.token);
      } catch (error) {
        return handleAuthError(error);
      }
    },
    [handleAuthError, session?.token],
  );

  const authenticatedPost = useCallback(
    async <TResponse,>(path: string, body: unknown = {}) => {
      if (!session?.token) {
        throw new ApiError(401, 'Authentication is required.');
      }

      try {
        return await postJson<TResponse>(path, body, session.token);
      } catch (error) {
        return handleAuthError(error);
      }
    },
    [handleAuthError, session?.token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isLoggedIn: Boolean(session),
      login,
      logout,
      authenticatedGet,
      authenticatedPost,
    }),
    [authenticatedGet, authenticatedPost, isLoading, login, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function buildSessionFromToken(token: string): Promise<AuthSession> {
  const me = await getJson<MeResponse>('/me', token);

  return {
    token,
    expiresIn: 0,
    ...me,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

export function useLogoutAndReturnHome() {
  const router = useRouter();
  const { logout } = useAuth();

  return useCallback(async () => {
    await logout();
    router.replace('/');
  }, [logout, router]);
}
