import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const PRIZE_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: '1st Prize', emoji: '🥇', color: 'text-yellow-600' },
  2: { label: '2nd Prize', emoji: '🥈', color: 'text-gray-500' },
  3: { label: '3rd Prize', emoji: '🥉', color: 'text-amber-600' },
  4: { label: '4th Prize', emoji: '🏅', color: 'text-blue-500' },
  5: { label: '5th Prize', emoji: '🎖️', color: 'text-green-500' },
};

export default function ResultsPage() {
  const { data: latest, isLoading } = useQuery({
    queryKey: ['results', 'latest'],
    queryFn: () => api.get('/results/latest').then((r) => r.data),
  });

  const { data: allDraws } = useQuery({
    queryKey: ['results'],
    queryFn: () => api.get('/results').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Draw Results</h1>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!latest && !isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-400">No draw results available yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Results are fetched automatically on draw days (Jan/Apr/Jul/Oct).
          </p>
        </div>
      )}

      {latest && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">Draw #{latest.drawNumber}</h2>
              <p className="text-gray-400 text-sm">
                {new Date(latest.drawDate).toLocaleDateString('en-BD', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
              Latest
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(
              (latest.results ?? []).reduce((acc: Record<number, any[]>, r: any) => {
                (acc[r.prizeRank] = acc[r.prizeRank] ?? []).push(r);
                return acc;
              }, {})
            ).map(([rank, items]) => {
              const info = PRIZE_LABELS[Number(rank)];
              return (
                <div key={rank} className="border border-gray-100 rounded-lg p-3">
                  <p className={`text-sm font-medium mb-1 ${info.color}`}>
                    {info.emoji} {info.label} — ৳{(items as any[])[0].prizeAmount.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(items as any[]).map((r) => (
                      <span key={r.id} className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {r.winningNumber}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allDraws?.draws?.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-3 text-sm text-gray-700">Previous Draws</h2>
          <div className="space-y-1">
            {allDraws.draws.slice(1).map((d: any) => (
              <div key={d.drawNumber} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span>Draw #{d.drawNumber}</span>
                <span className="text-gray-400">
                  {new Date(d.drawDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
