'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiBaseUrl, getAuthToken, getErrorMessage } from '../../../../lib/api';

type PrescriptionItem = {
  medName: string;
  dosage?: string;
  timesPerDay?: number;
  durationDays?: number;
  notes?: string;
  schedule?: {
    morning?: number;
    noon?: number;
    afternoon?: number;
    evening?: number;
  };
};

type Prescription = {
  id: string;
  status: string;
  diseaseName?: string | null;
  followUpDate?: string | null;
  ocrRawText?: string | null;
  parsedJson?: {
    diseaseName?: string;
    followUpDate?: string;
    items: PrescriptionItem[];
  } | null;
  confirmedJson?: any;
  createdAt: string;
};

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const token = useMemo(() => getAuthToken(), []);

  const [p, setP] = useState<Prescription | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [diseaseName, setDiseaseName] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
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
      setDiseaseName(res.diseaseName || res.parsedJson?.diseaseName || '');
      setFollowUpDate(res.followUpDate || res.parsedJson?.followUpDate || '');
      setItems(res.parsedJson?.items || []);
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
    try {
      const res = await fetch(`${base}/api/prescription/${id}/file`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (e) {
      console.error('Failed to load file', e);
    }
  }

  useEffect(() => {
    void load();
    void loadFile();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [id]);

  async function onConfirm() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/prescription/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ 
          diseaseName, 
          followUpDate, 
          items,
          syncToCalendar 
        }),
      });
      router.push('/app');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF6] pb-20">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Review Prescription</h1>
          <button 
            className="h-10 rounded-lg border border-white/10 px-4 text-sm font-medium hover:bg-white/5" 
            onClick={() => router.push('/app')}
          >
            Cancel
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Image Preview */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#111B2E] p-2 shadow-lg overflow-hidden">
              {blobUrl ? (
                <img src={blobUrl} alt="Prescription" className="w-full h-auto rounded-lg" />
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center text-[#A7B3C7] bg-[#16213A]">
                  No preview available
                </div>
              )}
            </div>
          </div>

          {/* Right: Form & Review */}
          <div className="space-y-6">
            <section className="space-y-4">
               <div>
                  <label className="text-sm font-medium text-[#A7B3C7]">Diagnosis / Disease</label>
                  <input
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#16213A] px-4 text-base focus:border-[#4F8CFF] outline-none"
                    value={diseaseName}
                    onChange={(e) => setDiseaseName(e.target.value)}
                    placeholder="e.g. Viêm họng cấp"
                  />
               </div>
               <div>
                  <label className="text-sm font-medium text-[#A7B3C7]">Follow-up Date</label>
                  <input
                    type="date"
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#16213A] px-4 text-base focus:border-[#4F8CFF] outline-none"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
               </div>
            </section>

            <section className="space-y-4">
               <h3 className="text-sm font-medium text-[#A7B3C7]">Medications ({items.length})</h3>
               <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-[#111B2E] p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                           <span className="font-semibold text-white">{idx + 1}. {item.medName}</span>
                           <span className="text-xs text-[#4F8CFF] font-medium bg-[#4F8CFF]/10 px-2 py-1 rounded">
                              {item.durationDays} days
                           </span>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                           <div className={`p-2 rounded-lg ${item.schedule?.morning ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'bg-white/5 text-[#A7B3C7]'}`}>
                              Sáng: {item.schedule?.morning || 0}
                           </div>
                           <div className={`p-2 rounded-lg ${item.schedule?.noon ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'bg-white/5 text-[#A7B3C7]'}`}>
                              Trưa: {item.schedule?.noon || 0}
                           </div>
                           <div className={`p-2 rounded-lg ${item.schedule?.afternoon ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'bg-white/5 text-[#A7B3C7]'}`}>
                              Chiều: {item.schedule?.afternoon || 0}
                           </div>
                           <div className={`p-2 rounded-lg ${item.schedule?.evening ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'bg-white/5 text-[#A7B3C7]'}`}>
                              Tối: {item.schedule?.evening || 0}
                           </div>
                        </div>
                        {item.notes && (
                           <p className="mt-3 text-xs text-[#A7B3C7] italic">Note: {item.notes}</p>
                        )}
                    </div>
                  ))}
               </div>
            </section>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#4F8CFF]/5 border border-[#4F8CFF]/20">
               <input 
                type="checkbox" 
                id="sync"
                checked={syncToCalendar}
                onChange={(e) => setSyncToCalendar(e.target.checked)}
                className="w-5 h-5 rounded border-white/10"
               />
               <label htmlFor="sync" className="text-sm font-medium cursor-pointer">
                  Sync medication schedule to my Google Calendar
               </label>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}

            <button
              className="h-14 w-full rounded-xl bg-[#4F8CFF] font-bold text-white shadow-lg hover:bg-[#3B7AEE] transition-all disabled:opacity-60 text-lg"
              onClick={onConfirm}
              disabled={saving}
            >
              {saving ? 'Processing...' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
