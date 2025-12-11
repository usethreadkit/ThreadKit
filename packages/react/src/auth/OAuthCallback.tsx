import { useEffect, useState } from 'react';
import { LoadingSpinner } from './icons';

/**
 * OAuth callback component
 *
 * This is rendered at /auth/{provider}/callback to handle the OAuth redirect.
 * It extracts the tokens from the URL and posts them back to the opener window.
 *
 * The server should redirect to this page with tokens in the URL hash or query params.
 */
export function OAuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse tokens from URL
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));

    // Try to get tokens from query params first, then hash
    const token = params.get('token') || hashParams.get('token');
    const refreshToken = params.get('refresh_token') || hashParams.get('refresh_token');
    const userJson = params.get('user') || hashParams.get('user');
    const errorParam = params.get('error') || hashParams.get('error');

    if (errorParam) {
      setError(errorParam);
      if (window.opener) {
        window.opener.postMessage(
          { type: 'threadkit:oauth:error', error: errorParam },
          '*'
        );
      }
      return;
    }

    if (token && refreshToken && userJson) {
      try {
        const user = JSON.parse(decodeURIComponent(userJson));

        if (window.opener) {
          window.opener.postMessage(
            { type: 'threadkit:oauth:success', token, refresh_token: refreshToken, user },
            '*'
          );
          // Close popup immediately
          window.close();
        } else {
          // Not in a popup, store tokens and redirect
          localStorage.setItem('threadkit_token', token);
          localStorage.setItem('threadkit_refresh_token', refreshToken);
          // Redirect to home or previous page
          window.location.href = '/';
        }
      } catch {
        setError('Failed to parse user data');
      }
    } else {
      setError('Missing authentication data');
    }
  }, []);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px',
        textAlign: 'center',
      }}>
        <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>Authentication Error</h1>
        <p style={{ color: '#666' }}>{error}</p>
        <button
          onClick={() => window.close()}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <LoadingSpinner className="tk-auth-spinner" />
      <p style={{ marginTop: '16px', color: '#666' }}>Completing sign in...</p>
    </div>
  );
}
