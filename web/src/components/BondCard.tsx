import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface Bond {
  id: string;
  number: string;
  series?: string;
  addedVia: 'manual' | 'ocr';
  imageUrl?: string;
  createdAt: string;
}

export default function BondCard({ bond }: { bond: Bond }) {
  const qc = useQueryClient();

  async function handleDelete() {
    if (!confirm(`Delete bond #${bond.number}?`)) return;
    await api.delete(`/bonds/${bond.id}`);
    qc.invalidateQueries({ queryKey: ['bonds'] });
    qc.invalidateQueries({ queryKey: ['bonds', 'stats'] });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="font-mono font-semibold text-lg">{bond.number}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {bond.addedVia === 'ocr' ? '📷 via scan' : '✏️ manual'} ·{' '}
          {new Date(bond.createdAt).toLocaleDateString()}
          {bond.series && ` · Series ${bond.series}`}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
