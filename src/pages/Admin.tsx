import { useEffect, useMemo, useState } from 'react';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  adminLogin,
  fetchAdminState,
  pairRound,
  updateAdminGameOrder,
  updateAdminPlayer,
  updateAdminTimeControl,
  type GameFormat,
  type PlayerProfile,
  type SessionState,
  type TimeControlConfig,
  type WaitingPlayer,
} from '@/lib/api';

const AUTH_KEY = 'admin_auth_password';
const ALL_FORMATS: GameFormat[] = ['blitz', 'rapid', 'powers', 'knockout'];
const FORMAT_LABELS: Record<GameFormat, string> = {
  blitz: 'Blitz',
  rapid: 'Rapid',
  powers: 'Powers',
  knockout: 'Knockout',
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [gameOrder, setGameOrder] = useState<GameFormat[]>(ALL_FORMATS);
  const [newOrderItem, setNewOrderItem] = useState<GameFormat>('blitz');
  const [currentFormat, setCurrentFormat] = useState<GameFormat>('blitz');
  const [timeControls, setTimeControls] = useState<Record<GameFormat, TimeControlConfig>>({
    blitz: { time: 300, increment: 3, tokens: 0 },
    rapid: { time: 600, increment: 0, tokens: 0 },
    powers: { time: 600, increment: 0, tokens: 0 },
    knockout: { time: 600, increment: 3, tokens: 3 },
  });
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [runnersQueue, setRunnersQueue] = useState<PlayerProfile[]>([]);
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [editPoints, setEditPoints] = useState<Record<string, number>>({});
  const [editTokens, setEditTokens] = useState<Record<string, number>>({});
  const [editTime, setEditTime] = useState<Record<GameFormat, number>>({ blitz: 5, rapid: 10, powers: 10, knockout: 10 });
  const [editInc, setEditInc] = useState<Record<GameFormat, number>>({ blitz: 0.05, rapid: 0, powers: 0, knockout: 0.05 });

  const loadState = async (pwd: string) => {
    const state = await fetchAdminState(pwd);
    setGameOrder(state.game_order);
    setCurrentFormat(state.current_format);
    setTimeControls(state.time_controls);
    setPlayers(state.players);
    setRunnersQueue(state.runners_queue);
    setWaitingPlayers(state.waiting_players);
    setActiveSessions(state.active_sessions);

    const pointsMap: Record<string, number> = {};
    const tokenMap: Record<string, number> = {};
    state.players.forEach((player) => {
      pointsMap[player.id] = player.points;
      tokenMap[player.id] = player.harmony_tokens;
    });
    setEditPoints(pointsMap);
    setEditTokens(tokenMap);

    setEditTime({
      blitz: state.time_controls.blitz.time / 60,
      rapid: state.time_controls.rapid.time / 60,
      powers: state.time_controls.powers.time / 60,
      knockout: state.time_controls.knockout.time / 60,
    });
    setEditInc({
      blitz: state.time_controls.blitz.increment / 60,
      rapid: state.time_controls.rapid.increment / 60,
      powers: state.time_controls.powers.increment / 60,
      knockout: state.time_controls.knockout.increment / 60,
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) {
      return;
    }

    adminLogin(saved)
      .then((ok) => {
        if (!ok) {
          localStorage.removeItem(AUTH_KEY);
          return;
        }
        setPassword(saved);
        setLoggedIn(true);
        return loadState(saved);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_KEY);
      });
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const interval = setInterval(() => {
      loadState(password).catch(() => undefined);
    }, 5000);

    return () => clearInterval(interval);
  }, [loggedIn, password]);

  const handleLogin = async () => {
    const ok = await adminLogin(password);
    if (!ok) {
      setError('Invalid password');
      return;
    }
    localStorage.setItem(AUTH_KEY, password);
    setLoggedIn(true);
    setError(null);
    await loadState(password);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setLoggedIn(false);
    setPassword('');
  };

  const moveFormat = (index: number, delta: -1 | 1) => {
    const next = [...gameOrder];
    const target = index + delta;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    setGameOrder(next);
  };

  const addFormatToOrder = () => {
    if (gameOrder.length >= 20) {
      setError('Order is limited to 20 items.');
      return;
    }
    setGameOrder((prev) => [...prev, newOrderItem]);
  };

  const removeFormatFromOrder = (index: number) => {
    if (gameOrder.length <= 1) {
      setError('Order must keep at least one format.');
      return;
    }
    setGameOrder((prev) => prev.filter((_, i) => i !== index));
  };

  const saveOrder = async () => {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const order = await updateAdminGameOrder(password, gameOrder);
      setGameOrder(order);
      await loadState(password);
      setStatus('Game format order updated.');
    } catch {
      setError('Failed to save game order');
    } finally {
      setSaving(false);
    }
  };

  const saveTimeControl = async (format: GameFormat) => {
    setStatus(null);
    setError(null);
    try {
      const controls = await updateAdminTimeControl(password, format, Math.max(60, Math.round((editTime[format] || 1) * 60)), Math.max(0, Math.round((editInc[format] || 0) * 60)));
      setTimeControls(controls);
      setStatus(`${FORMAT_LABELS[format]} timer updated.`);
    } catch {
      setError('Failed to update timer values');
    }
  };

  const runPairing = async () => {
    setPairing(true);
    setStatus(null);
    setError(null);
    try {
      const result = await pairRound(password);
      await loadState(password);
      setStatus(`Randomizer paired ${result.count * 2} players for ${FORMAT_LABELS[result.format]}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Randomizer failed');
    } finally {
      setPairing(false);
    }
  };

  const updatePlayer = async (playerId: string) => {
    try {
      await updateAdminPlayer(password, playerId, editPoints[playerId] ?? 0, editTokens[playerId] ?? 0);
      await loadState(password);
      setStatus('Player data updated.');
    } catch {
      setError('Failed to update player');
    }
  };

  const sortedPlayers = useMemo(() => players, [players]);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center p-6">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-2xl font-semibold">Admin Panel</h1>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700">
              Enter
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Match Control</h2>
              <p className="text-sm text-slate-600">Queue players first. Randomizer works only when no active games are running.</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100">
              Logout
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current Format</p>
              <p className="mt-1 text-xl font-semibold">{FORMAT_LABELS[currentFormat]}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ready Queue</p>
              <p className="mt-1 text-xl font-semibold">{waitingPlayers.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Runners Queue</p>
              <p className="mt-1 text-xl font-semibold">{runnersQueue.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Active Games</p>
              <p className="mt-1 text-xl font-semibold">{activeSessions.length}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={runPairing} disabled={pairing || waitingPlayers.length < 2} className="bg-green-600 hover:bg-green-700">
              {pairing ? 'Running Randomizer...' : 'Run Randomizer'}
            </Button>
            {status && <span className="text-sm text-green-700">{status}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Game Format Order</h2>
          <p className="mb-3 text-sm text-slate-600">Duplicate formats are allowed (example: Blitz, Rapid, Powers, Blitz, Knockout).</p>
          <div className="mb-3 flex items-center gap-2">
            <select value={newOrderItem} onChange={(e) => setNewOrderItem(e.target.value as GameFormat)} className="rounded border border-slate-300 bg-white px-2 py-2 text-sm">
              {ALL_FORMATS.map((f) => (
                <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
              ))}
            </select>
            <Button size="sm" onClick={addFormatToOrder} className="bg-blue-600 hover:bg-blue-700">Add Format</Button>
          </div>
          <div className="space-y-2">
            {gameOrder.map((format, index) => (
              <div key={`${format}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2">
                <span className="font-medium">{index + 1}. {FORMAT_LABELS[format]}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-slate-300 bg-white" onClick={() => moveFormat(index, -1)}>Up</Button>
                  <Button size="sm" variant="outline" className="border-slate-300 bg-white" onClick={() => moveFormat(index, 1)}>Down</Button>
                  <Button size="sm" variant="outline" className="border-slate-300 bg-white" onClick={() => removeFormatFromOrder(index)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-3 bg-blue-600 hover:bg-blue-700" onClick={saveOrder} disabled={saving}>
            {saving ? 'Saving...' : 'Save Format Order'}
          </Button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Time Settings (Backend Controlled)</h2>
          <p className="mb-3 text-sm text-slate-600">Set once per format. These values are used each time that format appears in order.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {ALL_FORMATS.map((format) => (
              <div key={format} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 font-medium">{FORMAT_LABELS[format]}</p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-slate-600">
                    Main Time (minutes)
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={editTime[format]}
                      onChange={(e) => setEditTime((prev) => ({ ...prev, [format]: Math.max(1, Number(e.target.value) || 1) }))}
                      className="mt-1 w-28 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Increment (minutes)
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={editInc[format]}
                      onChange={(e) => setEditInc((prev) => ({ ...prev, [format]: Math.max(0, Number(e.target.value) || 0) }))}
                      className="mt-1 w-24 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveTimeControl(format)}>
                    Save Timer
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Active: {((timeControls[format]?.time ?? 0) / 60).toFixed(2)}m + {((timeControls[format]?.increment ?? 0) / 60).toFixed(2)}m</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold">Ready Queue</h2>
            <p className="mb-3 text-sm text-slate-600">These players can be paired by randomizer.</p>
            <div className="space-y-2">
              {waitingPlayers.length === 0 && <p className="text-sm text-slate-500">No players in ready queue.</p>}
              {waitingPlayers.map((wp) => (
                <div key={wp.player_id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">{wp.player_name}</div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold">Runners Queue</h2>
            <p className="mb-3 text-sm text-slate-600">Players who lost their previous game are moved here.</p>
            <div className="space-y-2">
              {runnersQueue.length === 0 && <p className="text-sm text-slate-500">No players in runners queue.</p>}
              {runnersQueue.map((player) => (
                <div key={player.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">{player.name}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Leaderboard (Admin)</h2>
            <Button variant="outline" className="border-slate-300 bg-white" onClick={() => setShowLeaderboard((prev: boolean) => !prev)}>
              {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </Button>
          </div>
          {showLeaderboard && (
            <div className="mt-3 space-y-3">
              {sortedPlayers.map((player) => {
                const included = player.included_in_event ?? player.status !== 'inactive';
                return (
                  <div key={player.id} className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${included ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium">{player.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-800">{player.points} pts</span>
                        <span className={`rounded-full px-2 py-0.5 ${included ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{included ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <div className="mb-2 text-xs text-slate-600">Wins: {player.wins} | Losses: {player.losses} | Draws: {player.draws}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        value={editPoints[player.id] ?? 0}
                        min={0}
                        onChange={(e) => setEditPoints((prev) => ({ ...prev, [player.id]: Math.max(0, Number(e.target.value) || 0) }))}
                        className="w-28 rounded border border-slate-300 bg-white px-2 py-1"
                      />
                      <input
                        type="number"
                        value={editTokens[player.id] ?? 0}
                        min={0}
                        max={3}
                        onChange={(e) => setEditTokens((prev) => ({ ...prev, [player.id]: Math.min(3, Math.max(0, Number(e.target.value) || 0)) }))}
                        className="w-28 rounded border border-slate-300 bg-white px-2 py-1"
                      />
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updatePlayer(player.id)}>Save</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}



