'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiBaseUrl, getAuthToken, getErrorMessage } from '../../../../lib/api';

type Prescription = {
  id: string;
  status: string;
  sourceFileKey: string;
};

export default function ProcessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const token = useMemo(() => getAuthToken(), []);

  const [p, setP] = useState<Prescription | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Prescription>(`/api/prescription/${id}`);
      setP(res);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadFile() {
    const base = getApiBaseUrl();
    const t = getAuthToken();
    if (!t) return;
    const res = await fetch(`${base}/api/prescription/${id}/file`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  useEffect(() => {
    void load();
    void loadFile();
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [id]);

  async function onProcess() {
    setProcessing(true);
    setError(null);
    try {
      await apiFetch(`/api/prescription/${id}/process`, { method: 'POST' });
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  }

  const canNext = p?.status === 'PENDING_REVIEW' || p?.status === 'CONFIRMED';

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#A7B3C7]">Dashboard / OCR Processing</div>
          <button className="h-10 rounded-md border border-white/10 px-4 text-sm" onClick={() => router.push('/app')}>
            Back
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#111B2E] p-4">
            <div className="text-sm font-medium">Preview</div>
            <div className="mt-3">
              {blobUrl ? (
                <img src={blobUrl} alt="" className="w-full rounded-md border border-white/10" />
              ) : (
                <div className="text-sm text-[#A7B3C7]">No preview</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#111B2E] p-4">
            <div className="text-sm font-medium">Processing</div>
            <div className="mt-3 inline-flex rounded-full bg-white/5 px-2 py-1 text-xs text-[#A7B3C7]">
              {p?.status ?? (loading ? 'Loading…' : 'Unknown')}
            </div>
            {error ? <div className="mt-3 text-sm text-[#EF4444]">{error}</div> : null}
            <div className="mt-6 flex flex-col gap-3">
              <button
                className="h-11 w-full rounded-md bg-[#4F8CFF] font-medium text-white disabled:opacity-60"
                onClick={onProcess}
                disabled={processing || !p || p.status === 'PROCESSING'}
              >
                {processing ? 'Processing…' : 'Process'}
              </button>
              <button
                className="h-11 w-full rounded-md border border-white/10 font-medium disabled:opacity-60"
                onClick={() => router.push(`/prescriptions/${id}/review`)}
                disabled={!canNext}
              >
                Next
              </button>
            </div>
            <div className="mt-3 text-xs text-[#A7B3C7]">
              OCR chạy sync trong Core API (local đang dùng mock OCR).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
