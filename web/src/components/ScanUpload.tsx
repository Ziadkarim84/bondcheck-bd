import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function ScanUpload() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'confirm' | 'done'>('idle');
  const [numbers, setNumbers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [jobId, setJobId] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setError('');
    setStatus('uploading');

    const formData = new FormData();
    formData.append('image', files[0]);

    try {
      const { data } = await api.post('/bonds/ocr', formData);
      setJobId(data.jobId);
      setStatus('processing');

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        const { data: job } = await api.get(`/bonds/ocr/${data.jobId}`);
        if (job.status === 'done') {
          clearInterval(interval);
          const nums = (job.resultJson?.numbers ?? []) as string[];
          setNumbers(nums);
          setSelected(nums);
          setStatus('confirm');
        } else if (job.status === 'failed') {
          clearInterval(interval);
          setError(job.error ?? 'OCR failed. Try a clearer photo.');
          setStatus('idle');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Upload failed');
      setStatus('idle');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled: status !== 'idle',
  });

  async function handleConfirm() {
    if (!selected.length) return;
    try {
      await api.post(`/bonds/ocr/${jobId}/confirm`, { numbers: selected });
      setStatus('done');
      qc.invalidateQueries({ queryKey: ['bonds'] });
      qc.invalidateQueries({ queryKey: ['bonds', 'stats'] });
      setTimeout(() => { setStatus('idle'); setNumbers([]); setSelected([]); }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Save failed');
    }
  }

  if (status === 'done') {
    return (
      <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6 text-center">
        <p className="text-green-700 font-medium">✅ {selected.length} bond(s) saved!</p>
      </div>
    );
  }

  if (status === 'confirm') {
    return (
      <div className="border-2 border-brand-200 bg-brand-50 rounded-xl p-5 space-y-3">
        <p className="font-medium text-sm">Found {numbers.length} bond number(s). Select to save:</p>
        <div className="space-y-2">
          {numbers.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(n)}
                onChange={(e) =>
                  setSelected(e.target.checked ? [...selected, n] : selected.filter((x) => x !== n))
                }
              />
              <span className="font-mono text-base">{n}</span>
            </label>
          ))}
        </div>
        {numbers.length === 0 && (
          <p className="text-sm text-gray-500">No 7-digit bond numbers detected. Try a clearer photo.</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={!selected.length}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            Save {selected.length} bond(s)
          </button>
          <button
            onClick={() => { setStatus('idle'); setNumbers([]); setSelected([]); }}
            className="text-gray-500 text-sm px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        {status === 'uploading' && <p className="text-gray-500">Uploading image...</p>}
        {status === 'processing' && <p className="text-brand-600">🔍 Reading bond number... please wait</p>}
        {status === 'idle' && (
          <>
            <p className="text-3xl mb-2">📷</p>
            <p className="font-medium text-gray-700">
              {isDragActive ? 'Drop image here' : 'Drag & drop bond photo, or click to select'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, HEIC</p>
          </>
        )}
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
