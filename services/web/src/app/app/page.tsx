'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, clearAuthToken, getAuthToken, getErrorMessage } from '../../lib/api';

type Prescription = {
  id: string;
  diseaseName?: string | null;
  status: string;
  createdAt: string;
};

export default function AppPage() {
  const router = useRouter();
  const token = useMemo(() => getAuthToken(), []);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Prescription[]>(
        `/prescriptions${search.trim() ? `?disease=${encodeURIComponent(search.trim())}` : ''}`,
      );
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

  async function onUpload() {
    if (!file) return;
    if (!getAuthToken()) {
      router.push('/login');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch<{ id: string }>('/upload', {
        method: 'POST',
        body: form,
      });
      router.push(`/prescriptions/${res.id}/process`);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function onLogout() {
    clearAuthToken();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <button
            className="h-10 rounded-md border border-white/10 px-4 text-sm"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[#111B2E] p-4 lg:col-span-2">
            <div className="text-sm font-medium">Upload prescription</div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                className="block w-full text-sm"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                className="h-11 rounded-md bg-[#4F8CFF] px-5 font-medium text-white disabled:opacity-60"
                onClick={onUpload}
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            {error ? <div className="mt-3 text-sm text-[#EF4444]">{error}</div> : null}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#111B2E] p-4">
            <div className="text-sm font-medium">Family</div>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/settings/family-access" className="h-11 rounded-md border border-white/10 px-4 leading-[44px]">
                Manage family access
              </Link>
              <Link href="/family/inbox" className="h-11 rounded-md border border-white/10 px-4 leading-[44px]">
                Family inbox
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-[#111B2E] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">History</div>
            <div className="flex gap-2">
              <input
                className="h-11 w-full rounded-md border border-white/10 bg-[#16213A] px-3 text-base outline-none sm:w-64"
                placeholder="Search by disease"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="h-11 rounded-md border border-white/10 px-4 text-sm"
                onClick={() => void refresh()}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Search'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/prescriptions/${p.id}/review`}
                className="rounded-md border border-white/10 bg-[#16213A] p-4"
              >
                <div className="text-sm text-[#A7B3C7]">{new Date(p.createdAt).toLocaleString()}</div>
                <div className="mt-1 text-base font-medium">{p.diseaseName || 'Untitled'}</div>
                <div className="mt-2 inline-flex rounded-full bg-white/5 px-2 py-1 text-xs text-[#A7B3C7]">
                  {p.status}
                </div>
              </Link>
            ))}
            {items.length === 0 && !loading ? (
              <div className="text-sm text-[#A7B3C7]">No prescriptions</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
