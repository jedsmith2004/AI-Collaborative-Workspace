import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth0, type User as Auth0User } from '@auth0/auth0-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Check if Auth0 is configured
const isAuth0Configured = !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);

export interface AppUser {
  id: number;
  auth0_id: string;
  name: string;
  email: string;
  email_verified: boolean;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  auth0User: Auth0User | undefined;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuth0Configured: boolean;
  error: Error | null;
  login: () => void;
  logout: () => void;
  signup: () => void;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider for when Auth0 IS configured
function Auth0AuthProvider({ children }: { children: ReactNode }) {
  const {
    user: auth0User,
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Sync user with backend after Auth0 authentication
  useEffect(() => {
    const syncUser = async () => {
      if (auth0IsLoading) {
        return;
      }

      if (!auth0IsAuthenticated || !auth0User) {
        setAppUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const accessToken = await getAccessTokenSilently();
        setToken(accessToken);
        
        // Create or update user in backend
        const response = await axios.post(
          `${API_URL}/auth/me`,
          {
            sub: auth0User.sub,
            email: auth0User.email,
            name: auth0User.name || auth0User.email,
            email_verified: auth0User.email_verified || false,
            picture: auth0User.picture,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setAppUser(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to sync user with backend:', err);
        setError(err instanceof Error ? err : new Error('Failed to sync user'));
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [auth0IsAuthenticated, auth0User, auth0IsLoading, getAccessTokenSilently]);

  const login = () => {
    loginWithRedirect({
      appState: { returnTo: '/dashboard' },
    });
  };

  const signup = () => {
    loginWithRedirect({
      appState: { returnTo: '/dashboard' },
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  };

  const logout = () => {
    setAppUser(null);
    setToken(null);
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  const getAccessToken = async (): Promise<string> => {
    return getAccessTokenSilently();
  };

  const value: AuthContextType = {
    user: appUser,
    auth0User,
    token,
    isAuthenticated: auth0IsAuthenticated && appUser !== null,
    isLoading: auth0IsLoading || isLoading,
    isAuth0Configured: true,
    error: auth0Error || error,
    login,
    logout,
    signup,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Provider for when Auth0 is NOT configured (fallback)
function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextType = {
    user: null,
    auth0User: undefined,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isAuth0Configured: false,
    error: null,
    login: () => {
      alert('Auth0 is not configured. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your .env file.');
    },
    logout: () => {},
    signup: () => {
      alert('Auth0 is not configured. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your .env file.');
    },
    getAccessToken: async () => {
      throw new Error('Auth0 is not configured');
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Main export - chooses correct provider based on Auth0 configuration
export function AuthProvider({ children }: { children: ReactNode }) {
  if (isAuth0Configured) {
    return <Auth0AuthProvider>{children}</Auth0AuthProvider>;
  }
  return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}