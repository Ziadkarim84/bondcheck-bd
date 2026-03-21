import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const PRIZE_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: '1st Prize', emoji: '🥇', color: 'text-yellow-600' },
  2: { label: '2nd Prize', emoji: '🥈', color: 'text-gray-500' },
  3: { label: '3rd Prize', emoji: '🥉', color: 'text-amber-600' },
  4: { label: '4th Prize', emoji: '🏅', color: 'text-blue-500' },
  5: { label: '5th Prize', emoji: '🎖️', color: 'text-green-600' },
};

function DrawDetail({ draw }: { draw: any }) {
  const grouped = (draw.results ?? []).reduce((acc: Record<number, any[]>, r: any) => {
    (acc[r.prizeRank] = acc[r.prizeRank] ?? []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-3 mt-4">
      {Object.entries(grouped).map(([rank, items]) => {
        const info = PRIZE_LABELS[Number(rank)];
        return (
          <div key={rank} className="border border-gray-100 rounded-lg p-3">
            <p className={`text-sm font-medium mb-2 ${info.color}`}>
              {info.emoji} {info.label} — ৳{(items as any[])[0].prizeAmount.toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-1.5">
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
  );
}

export default function ResultsPage() {
  const [expandedDraw, setExpandedDraw] = useState<number | null>(null);
  const [loadedDraws, setLoadedDraws] = useState<Record<number, any>>({});
  const [loadingDraw, setLoadingDraw] = useState<number | null>(null);

  const { data: latest, isLoading } = useQuery({
    queryKey: ['results', 'latest'],
    queryFn: () => api.get('/results/latest').then((r) => r.data),
  });

  const { data: allDraws } = useQuery({
    queryKey: ['results'],
    queryFn: () => api.get('/results').then((r) => r.data),
  });

  const previousDraws = (allDraws?.draws ?? []).filter(
    (d: any) => d.drawNumber !== latest?.drawNumber
  );

  async function toggleDraw(drawNumber: number) {
    if (expandedDraw === drawNumber) {
      setExpandedDraw(null);
      return;
    }
    setExpandedDraw(drawNumber);
    if (loadedDraws[drawNumber]) return; // already cached
    setLoadingDraw(drawNumber);
    try {
      const { data } = await api.get(`/results/${drawNumber}`);
      setLoadedDraws((prev) => ({ ...prev, [drawNumber]: data }));
    } catch {
    } finally {
      setLoadingDraw(null);
    }
  }

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

      {/* Latest draw — always visible */}
      {latest && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
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
          <DrawDetail draw={latest} />
          <p className="text-xs text-gray-400 mt-4 text-center">⚠️ 20% source tax applies. Claim within 2 years.</p>
        </div>
      )}

      {/* Previous draws accordion */}
      {previousDraws.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-5 py-3">
            <h2 className="font-semibold text-sm text-gray-700">Previous Draws</h2>
          </div>
          {previousDraws.map((d: any) => {
            const isExpanded = expandedDraw === d.drawNumber;
            const isLoading = loadingDraw === d.drawNumber;
            const data = loadedDraws[d.drawNumber];
            return (
              <div key={d.drawNumber}>
                <button
                  onClick={() => toggleDraw(d.drawNumber)}
                  className="w-full flex justify-between items-center text-sm py-3 px-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <span className={`font-semibold ${isExpanded ? 'text-brand-600' : 'text-gray-800'}`}>
                      Draw #{d.drawNumber}
                    </span>
                    <span className="ml-3 text-gray-400">
                      {new Date(d.drawDate).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    {isLoading ? (
                      <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
                    ) : data ? (
                      <DrawDetail draw={data} />
                    ) : (
                      <p className="text-sm text-red-400 py-4 text-center">Failed to load draw data.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
