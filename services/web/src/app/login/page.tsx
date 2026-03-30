'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiFetch, getErrorMessage, setAuthToken } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('patient@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle hash fragment for Cognito implicit flow
    const hash = window.location.hash;
    if (hash && hash.includes('id_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get('id_token');
      if (idToken) {
        setAuthToken(idToken);
        router.push('/app');
      }
    }
  }, [router]);

  async function onLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ token: string }>('/dev/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email }),
      });
      setAuthToken(res.token);
      router.push('/app');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;
  const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=token&scope=openid+email+profile&redirect_uri=${redirectUri}`;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6] flex flex-col justify-center">
      <div className="mx-auto flex max-w-md w-full flex-col gap-6 px-6 py-16">
        <h1 className="text-3xl font-bold text-center">Patient Reminder</h1>
        
        <div className="rounded-xl border border-white/10 bg-[#111B2E] p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-6">Login</h2>
          
          <a
            href={loginUrl}
            className="flex items-center justify-center gap-3 h-12 w-full rounded-lg bg-white text-black font-semibold mb-8 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#111B2E] px-2 text-[#A7B3C7]">Or Developer Login</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#A7B3C7]">Email</label>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#16213A] px-3 text-base outline-none focus:border-[#4F8CFF] transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
              />
            </div>
            {error ? <div className="text-sm text-[#EF4444] font-medium">{error}</div> : null}
            <button
              className="h-11 w-full rounded-lg bg-[#1F2937] border border-white/10 font-medium text-white hover:bg-[#374151] transition-colors disabled:opacity-60"
              onClick={onLogin}
              disabled={loading}
            >
              {loading ? 'Logging in…' : 'Login (Dev Mode)'}
            </button>
            <p className="text-xs text-[#A7B3C7] italic">
              Warning: Dev Mode uses local JWT and skips Cognito.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
