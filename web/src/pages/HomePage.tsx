import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const { data: latest } = useQuery({
    queryKey: ['results', 'latest'],
    queryFn: () => api.get('/results/latest').then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['bonds', 'stats'],
    queryFn: () => api.get('/bonds/stats').then((r) => r.data),
  });

  const { data: recentWins } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches').then((r) => r.data),
  });

  const prizeMap: Record<number, string> = {
    1: '৳6,00,000',
    2: '৳3,25,000',
    3: '৳1,00,000',
    4: '৳50,000',
    5: '৳10,000',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          স্বাগতম, {user?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm">Welcome back to BondCheck BD</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-3xl font-bold text-brand-600">{stats?.totalBonds ?? '—'}</p>
          <p className="text-gray-500 text-sm mt-1">Bonds Registered</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-3xl font-bold text-green-600">{stats?.totalWins ?? '—'}</p>
          <p className="text-gray-500 text-sm mt-1">Total Wins</p>
        </div>
      </div>

      {/* Recent wins */}
      {recentWins?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="font-semibold text-green-800 mb-3">🎉 Your Recent Wins</h2>
          {recentWins.slice(0, 3).map((m: any) => (
            <div key={m.id} className="flex justify-between text-sm py-1">
              <span className="font-mono">Bond #{m.bond.number}</span>
              <span className="text-green-700 font-medium">
                {prizeMap[m.drawResult.prizeRank]} — Draw #{m.drawResult.drawNumber}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Latest draw */}
      {latest && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold mb-3">
            Latest Draw #{latest.drawNumber}{' '}
            <span className="text-gray-400 font-normal text-sm">
              ({new Date(latest.drawDate).toLocaleDateString('en-BD')})
            </span>
          </h2>
          <div className="space-y-2">
            {latest.results?.slice(0, 8).map((r: any) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {r.prizeRank === 1 ? '🥇' : r.prizeRank === 2 ? '🥈' : r.prizeRank === 3 ? '🥉' : '🏅'}{' '}
                  Prize {r.prizeRank} — {prizeMap[r.prizeRank]}
                </span>
                <span className="font-mono font-medium">{r.winningNumber}</span>
              </div>
            ))}
          </div>
          <Link to="/results" className="text-brand-600 text-sm mt-3 inline-block hover:underline">
            View all results →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/bonds"
          className="bg-brand-600 text-white text-center py-3 rounded-xl text-sm font-medium hover:bg-brand-700"
        >
          + Add Bond
        </Link>
        <Link
          to="/bonds"
          className="bg-white border border-gray-200 text-gray-700 text-center py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
        >
          📷 Scan Bond
        </Link>
      </div>
    </div>
  );
}
