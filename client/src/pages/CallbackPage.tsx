import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error, user, token } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  console.log('CallbackPage state:', { isAuthenticated, isLoading, error, user, token: token ? 'exists' : 'null' });

  useEffect(() => {
    // Wait for auth to finish loading (including backend sync)
    if (isLoading) {
      console.log('CallbackPage: Still loading...');
      return;
    }

    if (error) {
      console.error('Auth callback error:', error);
      navigate('/', { replace: true });
      return;
    }

    if (isAuthenticated) {
      console.log('CallbackPage: Authenticated! Redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    } else {
      console.log('CallbackPage: Not authenticated, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, error, navigate]);

  return (
    <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6] mx-auto mb-4"></div>
        <p className="text-[#9b9a97]">Completing authentication...</p>
        {error && <p className="text-red-500 mt-2">Error: {error.message}</p>}
      </div>
    </div>
  );
}
