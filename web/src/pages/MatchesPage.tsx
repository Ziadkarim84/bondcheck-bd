import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const PRIZE_AMOUNTS: Record<number, string> = {
  1: '৳6,00,000', 2: '৳3,25,000', 3: '৳1,00,000', 4: '৳50,000', 5: '৳10,000',
};

export default function MatchesPage() {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches').then((r) => r.data),
  });

  const totalAmount = matches.reduce((sum: number, m: any) => sum + m.drawResult.prizeAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My Winning Bonds</h1>

      {matches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-green-800 font-semibold text-lg">
            🎉 {matches.length} win{matches.length > 1 ? 's' : ''} total
          </p>
          <p className="text-green-700 text-sm mt-1">
            Total prize: ৳{totalAmount.toLocaleString()}
            <span className="text-green-500 text-xs ml-1">(before 20% tax)</span>
          </p>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!isLoading && matches.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-4xl mb-2">🍀</p>
          <p className="text-gray-500 font-medium">No wins yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Keep your bonds registered and we'll notify you the moment you win.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {matches.map((m: any) => (
          <div
            key={m.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-mono font-bold text-lg">#{m.bond.number}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Draw #{m.drawResult.drawNumber} ·{' '}
                {new Date(m.drawResult.drawDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-bold">
                {PRIZE_AMOUNTS[m.drawResult.prizeRank]}
              </p>
              <p className="text-xs text-gray-400">
                Prize {m.drawResult.prizeRank} · After 20% tax:{' '}
                ৳{(m.drawResult.prizeAmount * 0.8).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
