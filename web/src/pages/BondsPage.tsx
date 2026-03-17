import { useState, FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import BondCard from '../components/BondCard';
import ScanUpload from '../components/ScanUpload';

export default function BondsPage() {
  const qc = useQueryClient();
  const [number, setNumber] = useState('');
  const [series, setSeries] = useState('');
  const [addError, setAddError] = useState('');
  const [tab, setTab] = useState<'list' | 'scan'>('list');

  const { data: bonds = [], isLoading } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => api.get('/bonds').then((r) => r.data),
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError('');
    try {
      await api.post('/bonds', { number: number.trim(), series: series.trim() || undefined });
      setNumber('');
      setSeries('');
      qc.invalidateQueries({ queryKey: ['bonds'] });
      qc.invalidateQueries({ queryKey: ['bonds', 'stats'] });
    } catch (err: any) {
      setAddError(err.response?.data?.error ?? 'Failed to add bond');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My Bonds</h1>

      {/* Add manually */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3 text-sm text-gray-700">Add Bond Manually</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="7-digit bond number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            maxLength={7}
            pattern="\d{7}"
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            placeholder="Series (optional)"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Add
          </button>
        </form>
        {addError && <p className="text-red-600 text-sm mt-2">{addError}</p>}
      </div>

      {/* Scan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3 text-sm text-gray-700">Scan Bond Photo (OCR)</h2>
        <ScanUpload />
      </div>

      {/* Bond list */}
      <div>
        <h2 className="font-semibold mb-3 text-sm text-gray-700">
          Your Bonds ({bonds.length})
        </h2>
        {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
        {!isLoading && bonds.length === 0 && (
          <p className="text-gray-400 text-sm">No bonds added yet. Add your first bond above.</p>
        )}
        <div className="space-y-2">
          {bonds.map((b: any) => (
            <BondCard key={b.id} bond={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
