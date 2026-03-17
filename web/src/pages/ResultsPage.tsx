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
  const [selectedDrawNumber, setSelectedDrawNumber] = useState<number | null>(null);

  const { data: latest, isLoading } = useQuery({
    queryKey: ['results', 'latest'],
    queryFn: () => api.get('/results/latest').then((r) => r.data),
  });

  const { data: allDraws } = useQuery({
    queryKey: ['results'],
    queryFn: () => api.get('/results').then((r) => r.data),
  });

  const { data: selectedDraw, isLoading: loadingSelected } = useQuery({
    queryKey: ['results', selectedDrawNumber],
    queryFn: () => api.get(`/results/${selectedDrawNumber}`).then((r) => r.data),
    enabled: selectedDrawNumber !== null,
  });

  const previousDraws = (allDraws?.draws ?? []).filter(
    (d: any) => d.drawNumber !== latest?.drawNumber
  );

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

      {/* Latest draw */}
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
        </div>
      )}

      {/* Previous draws */}
      {previousDraws.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-3 text-sm text-gray-700">Previous Draws</h2>
          <div className="space-y-1">
            {previousDraws.map((d: any) => (
              <div key={d.drawNumber}>
                <button
                  onClick={() =>
                    setSelectedDrawNumber(
                      selectedDrawNumber === d.drawNumber ? null : d.drawNumber
                    )
                  }
                  className="w-full flex justify-between items-center text-sm py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">Draw #{d.drawNumber}</span>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>{new Date(d.drawDate).toLocaleDateString()}</span>
                    <span>{selectedDrawNumber === d.drawNumber ? '▲' : '▼'}</span>
                  </div>
                </button>

                {selectedDrawNumber === d.drawNumber && (
                  <div className="px-3 pb-3">
                    {loadingSelected ? (
                      <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
                    ) : selectedDraw ? (
                      <DrawDetail draw={selectedDraw} />
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
