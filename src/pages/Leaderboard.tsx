import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/header';
import { fetchLeaderboard, type PlayerProfile } from '@/lib/api';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchLeaderboard();
      setPlayers(data);
      setError(null);
    } catch {
      setError('Unable to load leaderboard.');
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    const id = window.setInterval(() => {
      load().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [players]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-600">Live ranking by points.</p>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">Points</th>
                  <th className="px-3 py-2 text-right">W</th>
                  <th className="px-3 py-2 text-right">L</th>
                  <th className="px-3 py-2 text-right">D</th>
                  <th className="px-3 py-2 text-right">Games</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={7}>No players yet.</td>
                  </tr>
                )}
                {sorted.map((p, idx) => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right font-semibold">{p.points}</td>
                    <td className="px-3 py-2 text-right">{p.wins}</td>
                    <td className="px-3 py-2 text-right">{p.losses}</td>
                    <td className="px-3 py-2 text-right">{p.draws}</td>
                    <td className="px-3 py-2 text-right">{p.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
