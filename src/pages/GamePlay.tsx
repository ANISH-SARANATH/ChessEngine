import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Flag, RotateCcw, Settings, Users } from 'lucide-react';

import { Header } from '@/components/header';
import { InteractiveChessBoard } from '@/components/interactive-chess-board';
import { GameErrorBoundary } from '@/components/game-error-boundary';
import { MoveHistory } from '@/components/move-history';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/game-context';
import { API_BASE_URL, WS_BASE_URL, fetchRoundState, type PlayerProfile } from '@/lib/api';

type Format = 'blitz' | 'rapid' | 'powers' | 'knockout';

interface SavedPlayer {
  id: string;
  name: string;
}

interface PairMessage {
  type: 'paired';
  player_id: string;
  player_color: 'w' | 'b';
  session: {
    id: string;
    format: Format;
    white_player_name: string;
    black_player_name: string;
    white_time: number;
    black_time: number;
    white_harmony_tokens: number;
    black_harmony_tokens: number;
    increment: number;
    used_powers: any;
    fen: string;
  };
}

const RULES_BY_FORMAT: Record<Format, string[]> = {
  blitz: ['Normal chess', 'Fast tactical play'],
  rapid: ['Normal chess', 'Balanced strategy'],
  powers: ['Modified chess', 'Monk Convert (once)', 'Warrior Leap (once)', 'Merchant Trade (once)', 'Keeper Resurrection (once)'],
  knockout: ['Normal chess', 'Harmony Tokens active', 'Each player max 3 harmony tokens'],
};

export default function GamePlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameState, applyRemoteEvent, initializeOnlineGame, resetGame, setNetworkEventHandler, startGame, surrender } = useGame();

  const waitingSocketRef = useRef<WebSocket | null>(null);
  const gameSocketRef = useRef<WebSocket | null>(null);
  const nextRoundNavLockRef = useRef(false);
  const applyRemoteEventRef = useRef(applyRemoteEvent);
  const waitingPingRef = useRef<number | null>(null);
  const gamePingRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const [waitingMessage, setWaitingMessage] = useState('Joining waiting room...');
  const [pendingPair, setPendingPair] = useState<PairMessage | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);

  const format = gameState.format;
  const requeueToken = ((location.state as { requeueAt?: number } | null)?.requeueAt ?? 0);

  const formatColors = useMemo(() => ({ blitz: 'from-red-600 to-red-400', rapid: 'from-purple-600 to-purple-400', powers: 'from-orange-600 to-orange-400', knockout: 'from-blue-600 to-blue-400' }), []);
  const formatTextColors = useMemo(() => ({ blitz: 'text-red-600', rapid: 'text-purple-600', powers: 'text-orange-600', knockout: 'text-blue-600' }), []);
  const formatNames = useMemo(() => ({ blitz: 'Blitz', rapid: 'Rapid', powers: 'Powers', knockout: 'Knockout' }), []);

  const loadRoundState = async () => {
    try {
      const state = await fetchRoundState();
      setLeaderboard(state.leaderboard);
    } catch {
      // no-op
    }
  };

  const openGameSocket = (sessionId: string, playerId: string) => {
    gameSocketRef.current?.close();
    const gameSocket = new WebSocket(`${WS_BASE_URL}/ws/multiplayer/game/${sessionId}?player_id=${encodeURIComponent(playerId)}`);
    gameSocketRef.current = gameSocket;


    gameSocket.onopen = () => {
      // Initial state arrives via session_snapshot websocket event.
      if (gamePingRef.current) {
        window.clearInterval(gamePingRef.current);
      }
      gamePingRef.current = window.setInterval(() => {
        if (gameSocket.readyState === WebSocket.OPEN) {
          gameSocket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    gameSocket.onclose = () => {
      if (gamePingRef.current) {
        window.clearInterval(gamePingRef.current);
        gamePingRef.current = null;
      }
    };

    gameSocket.onmessage = (gameEvent) => {
      try {
        const payload = JSON.parse(gameEvent.data) as any;
        if (!payload || payload.type === 'pong') {
          return;
        }
        if (payload.type === 'session_snapshot') {
          const session = payload.session;
          if (session) {
            applyRemoteEventRef.current({
              type: 'state_sync',
              state: {
                fen: session.fen,
                current_turn: session.current_turn,
                white_time: session.white_time,
                black_time: session.black_time,
                white_harmony_tokens: session.white_harmony_tokens,
                black_harmony_tokens: session.black_harmony_tokens,
                used_powers: session.used_powers,
                moves: session.moves ?? [],
              },
            });
          }
          return;
        }
        applyRemoteEventRef.current(payload);
      } catch {
        // Ignore malformed realtime messages so UI stays stable.
      }
    };
  };
  useEffect(() => {
    applyRemoteEventRef.current = applyRemoteEvent;
  }, [applyRemoteEvent]);

  useEffect(() => {
    setMounted(true);
    loadRoundState().catch(() => undefined);

    const poll = setInterval(() => {
      loadRoundState().catch(() => undefined);
    }, 5000);

    const raw = sessionStorage.getItem('chess_player');
    if (!raw) {
      navigate('/game');
      return () => clearInterval(poll);
    }

    let player: SavedPlayer;
    try {
      player = JSON.parse(raw) as SavedPlayer;
    } catch {
      navigate('/game');
      return () => clearInterval(poll);
    }

    setIsWaiting(true);
    setPendingPair(null);
    setWaitingMessage('Joining waiting room...');
    nextRoundNavLockRef.current = false;

    waitingSocketRef.current?.close();
    gameSocketRef.current?.close();

    const waitingSocket = new WebSocket(`${WS_BASE_URL}/ws/multiplayer/waiting-room`);
    waitingSocketRef.current = waitingSocket;

    waitingSocket.onopen = () => {
      waitingSocket.send(JSON.stringify({ type: 'join_waiting_room', player_id: player.id, player_name: player.name }));
      if (waitingPingRef.current) {
        window.clearInterval(waitingPingRef.current);
      }
      waitingPingRef.current = window.setInterval(() => {
        if (waitingSocket.readyState === WebSocket.OPEN) {
          waitingSocket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    waitingSocket.onclose = () => {
      if (waitingPingRef.current) {
        window.clearInterval(waitingPingRef.current);
        waitingPingRef.current = null;
      }
    };

    waitingSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as PairMessage | { type: 'error'; message: string } | { type: 'waiting'; message: string } | { type: 'pong' };
        if (!message || message.type === 'pong') {
          return;
        }
        if (message.type === 'error' || message.type === 'waiting') {
          setWaitingMessage(message.message);
          return;
        }
        if (message.type === 'paired') {
          setPendingPair(message);
          setIsWaiting(false);
          waitingSocketRef.current?.close();
        }
      } catch {
        // Ignore malformed waiting-room events to avoid UI crashes.
      }
    };

    waitingSocket.onerror = () => {
      setWaitingMessage('Unable to connect to backend.');
    };

    return () => {
      clearInterval(poll);
      if (waitingPingRef.current) {
        window.clearInterval(waitingPingRef.current);
        waitingPingRef.current = null;
      }
      if (gamePingRef.current) {
        window.clearInterval(gamePingRef.current);
        gamePingRef.current = null;
      }
      waitingSocketRef.current?.close();
      gameSocketRef.current?.close();
    };
  }, [navigate, requeueToken]);

  useEffect(() => {
    setNetworkEventHandler((networkEvent) => {
      const socket = gameSocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify(networkEvent));
    });

    return () => {
      setNetworkEventHandler(null);
    };
  }, [setNetworkEventHandler]);

  useEffect(() => {
    if (!gameState.onlineMatch || !gameState.gameOver || nextRoundNavLockRef.current) {
      return;
    }
    nextRoundNavLockRef.current = true;
    setTimeout(() => {
      navigate('/game/play', { replace: true, state: { requeueAt: Date.now() } });
    }, 2500);
  }, [gameState.gameOver, gameState.onlineMatch, navigate]);

  const startFromRules = () => {
    if (!pendingPair) {
      return;
    }
    const session = pendingPair.session;
    initializeOnlineGame({
      format: session.format,
      whitePlayer: session.white_player_name,
      blackPlayer: session.black_player_name,
      localPlayerColor: pendingPair.player_color,
      localPlayerId: pendingPair.player_id,
      sessionId: session.id,
      whiteTime: session.white_time,
      blackTime: session.black_time,
      whiteHarmonyTokens: session.white_harmony_tokens,
      blackHarmonyTokens: session.black_harmony_tokens,
      usedPowers: session.used_powers,
      fen: session.fen,
    });
    startGame();
    openGameSocket(session.id, pendingPair.player_id);
    setPendingPair(null);
  };

  const handleReset = () => {
    if (gameState.onlineMatch && !gameState.gameOver && gameState.localPlayerColor) {
      surrender(gameState.localPlayerColor, true);
    }
    resetGame();
    navigate('/game');
  };

  const handleSurrender = () => {
    if (window.confirm('Are you sure you want to surrender?')) {
      surrender(gameState.currentTurn);
    }
  };

  if (!mounted) {
    return null;
  }

  if (isWaiting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
        <Header />
        <main className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center p-6">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-900 shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold">Waiting Room</h1>
            <p className="text-sm text-slate-600">{waitingMessage}</p>
            <p className="mt-2 text-xs text-slate-500">We will connect you with someone new shortly.</p>
          </div>
        </main>
      </div>
    );
  }

  if (pendingPair) {
    const formatKey = pendingPair.session.format;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
        <Header />
        <main className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold">Match Ready</h1>
            <p className="mb-4 text-sm text-slate-600">
              {pendingPair.session.white_player_name} vs {pendingPair.session.black_player_name} - {formatNames[formatKey]}
            </p>
            <h2 className="mb-2 text-lg font-semibold">Game Rules</h2>
            <p className="mb-2 text-sm text-slate-600">Clock: {Math.floor(pendingPair.session.white_time / 60)} minutes with +{pendingPair.session.increment}s increment</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {RULES_BY_FORMAT[formatKey].map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <Button className="bg-blue-600 px-7 text-white hover:bg-blue-700" onClick={startFromRules}>
                I Understand, Start Game
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  const accentColor = formatColors[format];
  const textColor = formatTextColors[format];
  const formatName = formatNames[format];
  const isBlackPerspective = gameState.onlineMatch && gameState.localPlayerColor === 'b';
  const topColor: 'w' | 'b' = isBlackPerspective ? 'w' : 'b';
  const bottomColor: 'w' | 'b' = isBlackPerspective ? 'b' : 'w';
  const topPlayerName = topColor === 'w' ? gameState.whitePlayer : gameState.blackPlayer;
  const bottomPlayerName = bottomColor === 'w' ? gameState.whitePlayer : gameState.blackPlayer;
  const topTime = topColor === 'w' ? gameState.whiteTime : gameState.blackTime;
  const bottomTime = bottomColor === 'w' ? gameState.whiteTime : gameState.blackTime;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <Header />
      <main className="flex-1 flex justify-center p-4 md:p-6">
        <div className="flex w-full max-w-[1850px] flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-3 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex items-center gap-3 justify-self-start">
                <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r px-3 py-1.5 text-white shadow-md ${accentColor}`}>
                  <span className="text-sm font-semibold">{formatName}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  <div className={`h-2 w-2 rounded-full ${gameState.currentTurn === 'w' ? 'bg-green-500' : 'bg-slate-400'}`} />
                  <span className="text-xs font-medium text-slate-700">{gameState.currentTurn === 'w' ? 'White to move' : 'Black to move'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-self-end">
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full border border-slate-200 bg-white p-0" onClick={() => setShowSettings(!showSettings)}>
                  <Settings size={14} className="text-slate-600" />
                </Button>
                <Link to="/game">
                  <Button variant="ghost" size="sm" className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs">
                    <ChevronLeft className="mr-1 h-3 w-3" />
                    <span>Menu</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="w-full overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 justify-self-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700">{(topPlayerName || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold">{topPlayerName}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} />{topColor === 'w' ? 'White' : 'Black'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-self-end">
                  <Clock size={16} className="text-slate-500" />
                  <div className={`text-2xl font-semibold ${gameState.currentTurn === topColor ? textColor : 'text-foreground'}`}>
                    {Math.floor(topTime / 60).toString().padStart(2, '0')}:{(topTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full border-x border-slate-200 bg-white shadow-sm">
              <div className="flex w-full justify-center p-1">
                <GameErrorBoundary><InteractiveChessBoard /></GameErrorBoundary>
              </div>
            </div>

            <div className="w-full overflow-hidden rounded-b-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 justify-self-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-sm text-slate-700">{(bottomPlayerName || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold">{bottomPlayerName}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} />{bottomColor === 'w' ? 'White' : 'Black'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-self-end">
                  <Clock size={16} className="text-slate-500" />
                  <div className={`text-2xl font-semibold ${gameState.currentTurn === bottomColor ? textColor : 'text-foreground'}`}>
                    {Math.floor(bottomTime / 60).toString().padStart(2, '0')}:{(bottomTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex w-full items-center justify-between">
              <div className="flex items-center gap-3 justify-self-end">
                <Button onClick={handleSurrender} variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" disabled={gameState.gameOver}>
                  <Flag size={12} className="mr-1" />
                  <span>Surrender</span>
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
                  <RotateCcw size={12} className="mr-1" />
                  <span>Undo / Exit</span>
                </Button>
              </div>

              {gameState.gameOver && <div className={`rounded-full bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-sm ${accentColor}`}>{gameState.result}</div>}
            </div>

            {gameState.gameOver && (
              <div className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="text-sm font-semibold text-slate-800">Leaderboard</h3>
                <div className="mt-2 max-h-44 overflow-auto text-sm">
                  {leaderboard.length === 0 && <p className="text-xs text-slate-500">No results yet.</p>}
                  {leaderboard.slice(0, 10).map((p, index) => (
                    <div key={p.id} className="flex items-center justify-between py-1">
                      <span>{index + 1}. {p.name}</span>
                      <span className="font-semibold">{p.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:w-80">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className={`h-1 w-full bg-gradient-to-r ${accentColor}`} />
              <div className="flex items-center justify-between border-b p-3">
                <h3 className={`text-sm font-semibold ${textColor}`}>Move History</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{gameState.moves.length} moves</span>
              </div>
              <div className="h-[400px] overflow-auto p-2">
                <MoveHistory />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}































