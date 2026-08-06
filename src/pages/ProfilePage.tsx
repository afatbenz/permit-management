import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save, Upload, PenLine, Trash2, CheckCircle2 } from 'lucide-react';
import { api, fetchBlob } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Field } from '@/components/Field';
import { Spinner } from '@/components/ui';

const SIGNATURE_MAX_MB = 2;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Validates a File for the signature (image type + size ≤ 2MB). */
function validateSignatureFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Tipe file harus PNG, JPEG, atau WebP.';
  }
  if (file.size > SIGNATURE_MAX_MB * 1024 * 1024) {
    return `Ukuran file melebihi ${SIGNATURE_MAX_MB} MB.`;
  }
  return null;
}

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const { navigate } = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
  });
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Canvas draw state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [drawing, setDrawing] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));

  // Prefill from the loaded profile.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getProfile();
        if (!active) return;
        setForm({
          name: res.user?.name ?? '',
          email: res.user?.email ?? '',
          phone: res.user?.phone ?? '',
          jobTitle: res.profile?.jobTitle ?? '',
        });
        setExistingSignature(res.signatureUrl);
        // Load existing signature preview (authenticated blob).
        if (res.signatureUrl) {
          try {
            const blob = await fetchBlob(`/api/v1${res.signatureUrl}`);
            setSignatureDataUrl(URL.createObjectURL(blob));
          } catch {
            /* no preview if fetch fails */
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat profil.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Initialize the draw canvas (white background, pen stroke).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 480;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [drawing]);

  // ---- canvas draw handlers ----
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext('2d');
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
    setDrawing(true);
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d');
    const { x, y } = getPos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const useCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setSignatureFile(null);
    setExistingSignature(null);
  };

  // ---- file picker ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateSignatureFile(file);
    if (err) {
      setError(err);
      return;
    }
    setSignatureFile(file);
    setSignatureDataUrl(URL.createObjectURL(file));
    setExistingSignature(null);
    setError('');
  };

  const clearSignature = () => {
    setSignatureDataUrl(null);
    setSignatureFile(null);
    setExistingSignature(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // ---- save ----
  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        jobTitle: form.jobTitle,
      };

      if (signatureFile) {
        // File-picker path → multipart.
        await api.updateProfileMultipart(payload, signatureFile);
      } else if (signatureDataUrl) {
        // Draw path → base64 data URL in JSON body.
        await api.updateProfileJson({ ...payload, signature: signatureDataUrl });
      } else if (existingSignature) {
        // Unchanged existing signature — just update fields.
        await api.updateProfileJson(payload);
      } else {
        await api.updateProfileJson(payload);
      }

      await refreshUser();
      setSuccess('Profil berhasil disimpan.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout active="Profile">
      <div className="mx-auto max-w-3xl space-y-5">
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Profil Saya</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Kelola data diri dan tanda tangan digital untuk approval permit.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </div>
        )}

        {loading ? (
          <div className="card flex items-center justify-center gap-3 p-10 text-sm text-gray-500 dark:text-slate-400">
            <Spinner className="h-5 w-5" /> Memuat profil...
          </div>
        ) : (
          <>
            {/* Profile info */}
            <div className="card space-y-5 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Data Diri</h2>
              <Field id="name" label="Nama Lengkap" value={form.name} onChange={(v) => set('name', v)} required />
              <Field id="email" label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
              <Field id="phone" label="No. Telepon" type="tel" value={form.phone} onChange={(v) => set('phone', v)} />
              <Field id="jobTitle" label="Jabatan" value={form.jobTitle} onChange={(v) => set('jobTitle', v)} placeholder="e.g. Supervisor WAH" />
            </div>

            {/* Signature */}
            <div className="card space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Tanda Tangan Digital</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDrawing(true)} className="btn-ghost !py-1.5 text-xs">
                    <PenLine className="h-3.5 w-3.5" /> Gambar
                  </button>
                  <label className="btn-ghost !py-1.5 text-xs cursor-pointer">
                    <Upload className="h-3.5 w-3.5" /> Upload File
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
                  </label>
                  {(signatureDataUrl || existingSignature) && (
                    <button type="button" onClick={clearSignature} className="btn-ghost !py-1.5 text-xs text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                {/* Preview / canvas */}
                <div className="w-full sm:w-72">
                  {drawing ? (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700">
                        <canvas
                          ref={canvasRef}
                          className="h-40 w-full cursor-crosshair touch-none rounded-xl"
                          onPointerDown={startDraw}
                          onPointerMove={drawMove}
                          onPointerUp={endDraw}
                          onPointerLeave={endDraw}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={useCanvasSignature} className="btn-primary !py-1.5 text-xs">Pakai Tanda Tangan</button>
                        <button type="button" onClick={() => setDrawing(false)} className="btn-ghost !py-1.5 text-xs">Batal</button>
                      </div>
                    </div>
                  ) : signatureDataUrl ? (
                    <img src={signatureDataUrl} alt="Signature preview" className="w-full rounded-xl border border-gray-200 bg-white dark:border-slate-700" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 dark:border-slate-600 dark:text-slate-500">
                      Belum ada tanda tangan
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 sm:max-w-xs">
                  Tanda tangan dipakai saat approve/submit permit dan tampil di PDF.
                  Gambar manual (canvas) atau unggah file PNG/JPEG/WebP maksimal {SIGNATURE_MAX_MB} MB.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
