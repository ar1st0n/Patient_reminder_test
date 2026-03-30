'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthToken, getErrorMessage } from '../../../lib/api';

type Invite = {
  id: string;
  invitedEmail: string;
  status: string;
  createdAt: string;
};

export default function FamilyAccessPage() {
  const router = useRouter();
  const token = useMemo(() => getAuthToken(), []);
  const [email, setEmail] = useState('family@example.com');
  const [items, setItems] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Invite[]>('/api/family-access/sent');
      setItems(res);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onInvite() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/family-access/invite', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      await refresh();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(id: string) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/family-access/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#A7B3C7]">Settings / Family access</div>
          <button className="h-10 rounded-md border border-white/10 px-4 text-sm" onClick={() => router.push('/app')}>
            Back
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-[#111B2E] p-4">
          <div className="text-sm font-medium">Invite family</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="h-11 w-full rounded-md border border-white/10 bg-[#16213A] px-3 text-base outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
            />
            <button
              className="h-11 rounded-md bg-[#4F8CFF] px-5 font-medium text-white disabled:opacity-60"
              onClick={onInvite}
              disabled={saving}
            >
              Send invite
            </button>
          </div>
          {error ? <div className="mt-3 text-sm text-[#EF4444]">{error}</div> : null}
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-[#111B2E] p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Sent invites</div>
            <button
              className="h-10 rounded-md border border-white/10 px-4 text-sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {items.map((inv) => (
              <div key={inv.id} className="rounded-md border border-white/10 bg-[#16213A] p-4">
                <div className="text-sm text-[#A7B3C7]">{inv.invitedEmail}</div>
                <div className="mt-2 inline-flex rounded-full bg-white/5 px-2 py-1 text-xs text-[#A7B3C7]">
                  {inv.status}
                </div>
                <button
                  className="mt-3 h-11 w-full rounded-md border border-white/10 text-sm disabled:opacity-60"
                  onClick={() => void onRevoke(inv.id)}
                  disabled={saving}
                >
                  Revoke
                </button>
              </div>
            ))}
            {items.length === 0 && !loading ? (
              <div className="text-sm text-[#A7B3C7]">No invites</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
