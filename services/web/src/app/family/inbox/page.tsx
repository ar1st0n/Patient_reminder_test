'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthToken, getErrorMessage } from '../../../lib/api';

type Invite = {
  id: string;
  invitedEmail: string;
  patientUserId: string;
  createdAt: string;
};

export default function FamilyInboxPage() {
  const router = useRouter();
  const token = useMemo(() => getAuthToken(), []);
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
      const res = await apiFetch<Invite[]>('/api/family-access/inbox');
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

  async function accept(id: string) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/family-access/${id}/accept`, { method: 'POST' });
      await refresh();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function reject(id: string) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/family-access/${id}/reject`, { method: 'POST' });
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
          <div className="text-sm text-[#A7B3C7]">Family / Inbox</div>
          <button className="h-10 rounded-md border border-white/10 px-4 text-sm" onClick={() => router.push('/app')}>
            Back
          </button>
        </div>

        {error ? <div className="mt-4 text-sm text-[#EF4444]">{error}</div> : null}

        <div className="mt-6 rounded-lg border border-white/10 bg-[#111B2E] p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Pending invites</div>
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
                <div className="text-sm text-[#A7B3C7]">Invite</div>
                <div className="mt-2 text-xs text-[#A7B3C7]">{new Date(inv.createdAt).toLocaleString()}</div>
                <div className="mt-4 flex gap-2">
                  <button
                    className="h-11 flex-1 rounded-md bg-[#4F8CFF] font-medium text-white disabled:opacity-60"
                    onClick={() => void accept(inv.id)}
                    disabled={saving}
                  >
                    Accept
                  </button>
                  <button
                    className="h-11 flex-1 rounded-md border border-white/10 font-medium disabled:opacity-60"
                    onClick={() => void reject(inv.id)}
                    disabled={saving}
                  >
                    Reject
                  </button>
                </div>
                <button
                  className="mt-3 h-11 w-full rounded-md border border-white/10 text-sm disabled:opacity-60"
                  disabled
                >
                  Export to my Google Calendar (coming soon)
                </button>
              </div>
            ))}
            {items.length === 0 && !loading ? (
              <div className="text-sm text-[#A7B3C7]">No pending invites</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
