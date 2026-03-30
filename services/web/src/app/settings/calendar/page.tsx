'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { apiFetch } from '../../../lib/api';

function CalendarSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<{ connected: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleCallback(code);
    } else {
      fetchStatus();
    }
  }, [searchParams]);

  async function fetchStatus() {
    try {
      const data = await apiFetch<{ connected: boolean }>('/api/calendar/status');
      setStatus(data);
    } catch (e) {
      console.error('Failed to fetch calendar status', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCallback(code: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/calendar/oauth/callback?code=${code}`);
      router.replace('/settings/calendar');
      fetchStatus();
    } catch (e) {
      console.error('OAuth callback failed', e);
      setLoading(false);
    }
  }

  async function onConnect() {
    try {
      const { url } = await apiFetch<{ url: string }>('/api/calendar/connect-url');
      window.location.href = url;
    } catch (e) {
      console.error('Failed to get connect URL', e);
    }
  }

  if (loading) return <div className="p-8 text-center text-[#A7B3C7]">Loading…</div>;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6] p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Calendar Settings</h1>
        
        <div className="rounded-xl border border-white/10 bg-[#111B2E] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Google Calendar</h2>
              <p className="text-sm text-[#A7B3C7]">
                {status?.connected 
                  ? 'Your calendar is connected.' 
                  : 'Sync your medication schedule to Google Calendar.'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>

          {!status?.connected ? (
            <button
              onClick={onConnect}
              className="w-full h-12 rounded-lg bg-[#4F8CFF] text-white font-semibold hover:bg-[#3B7AEE] transition-colors flex items-center justify-center gap-2"
            >
              Connect Google Calendar
            </button>
          ) : (
            <div className="space-y-4">
               <div className="p-4 rounded-lg bg-[#16213A] border border-white/5 text-sm">
                  ✓ Automatically sync confirmed prescriptions
               </div>
               <button
                onClick={onConnect}
                className="w-full h-12 rounded-lg border border-white/10 text-[#A7B3C7] font-medium hover:bg-white/5 transition-colors"
              >
                Reconnect Calendar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarSettingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[#A7B3C7]">Loading…</div>}>
            <CalendarSettingsContent />
        </Suspense>
    );
}
