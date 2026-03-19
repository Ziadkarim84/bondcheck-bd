import { useState, FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import BondCard from '../components/BondCard';
import ScanUpload from '../components/ScanUpload';

export default function BondsPage() {
  const qc = useQueryClient();
  const [rangeMode, setRangeMode] = useState(false);
  const [number, setNumber] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [series, setSeries] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<'list' | 'scan'>('list');

  const { data: bonds = [], isLoading } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => api.get('/bonds').then((r) => r.data),
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      if (rangeMode) {
        const from = rangeFrom.trim().padStart(7, '0');
        const to   = rangeTo.trim().padStart(7, '0');
        await api.post('/bonds/range', { from, to, series: series.trim() || undefined });
        setRangeFrom(''); setRangeTo(''); setSeries('');
      } else {
        await api.post('/bonds', { number: number.trim(), series: series.trim() || undefined });
        setNumber(''); setSeries('');
      }
      qc.invalidateQueries({ queryKey: ['bonds'] });
      qc.invalidateQueries({ queryKey: ['bonds', 'stats'] });
    } catch (err: any) {
      setAddError(err.response?.data?.error ?? 'Failed to add bond');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My Bonds</h1>

      {/* Add manually */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-gray-700">Add Bond Manually</h2>
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setRangeMode(false)}
              className={`px-3 py-1 rounded-md transition-colors ${!rangeMode ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
            >
              Single
            </button>
            <button
              onClick={() => setRangeMode(true)}
              className={`px-3 py-1 rounded-md transition-colors ${rangeMode ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
            >
              Range
            </button>
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          {rangeMode ? (
            <>
              <input
                type="text" placeholder="From (0000010)"
                value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
                maxLength={7} pattern="\d{7}" required
                className="flex-1 min-w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="self-center text-gray-400 font-bold">–</span>
              <input
                type="text" placeholder="To (0000100)"
                value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
                maxLength={7} pattern="\d{7}" required
                className="flex-1 min-w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </>
          ) : (
            <input
              type="text" placeholder="7-digit bond number"
              value={number} onChange={(e) => setNumber(e.target.value)}
              maxLength={7} pattern="\d{7}" required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
          <input
            type="text" placeholder="Series (optional)"
            value={series} onChange={(e) => setSeries(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit" disabled={adding}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add'}
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
