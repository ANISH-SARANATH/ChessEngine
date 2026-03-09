export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export type GameFormat = 'blitz' | 'rapid' | 'powers' | 'knockout';

export interface TimeControlConfig {
  time: number;
  increment: number;
  tokens: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  harmony_tokens: number;
  included_in_event?: boolean;
  status?: string;
  queue_bucket?: 'ready' | 'runners';
}

export interface SessionState {
  id: string;
  format: GameFormat;
  status: 'ongoing' | 'completed';
  white_player_id: string;
  black_player_id: string;
  white_player_name: string;
  black_player_name: string;
  current_turn: 'w' | 'b';
  fen: string;
  white_time: number;
  black_time: number;
  increment: number;
  white_harmony_tokens: number;
  black_harmony_tokens: number;
  used_powers: {
  white: {
    convert: boolean;
    leap: boolean;
    trade: boolean;
    resurrection: boolean;
  };
  black: {
    convert: boolean;
    leap: boolean;
    trade: boolean;
    resurrection: boolean;
  };
};
}

export interface WaitingPlayer {
  player_id: string;
  player_name: string;
}

export interface PublicRoundState {
  current_format: GameFormat;
  leaderboard: PlayerProfile[];
}

export async function bootstrapPlayer(name: string, playerId?: string): Promise<PlayerProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/player/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, player_id: playerId ?? null }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Unable to register player' }));
    throw new Error(payload.detail || 'Unable to register player');
  }

  const data = await response.json();
  return data.player as PlayerProfile;
}

export async function fetchLeaderboard(): Promise<PlayerProfile[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/leaderboard`);
  if (!response.ok) {
    throw new Error('Unable to load leaderboard');
  }
  const data = await response.json();
  return data.players as PlayerProfile[];
}

export async function fetchRoundState(): Promise<PublicRoundState> {
  const response = await fetch(`${API_BASE_URL}/api/v1/round/state`);
  if (!response.ok) {
    throw new Error('Unable to load round state');
  }
  return response.json() as Promise<PublicRoundState>;
}


export async function fetchSessionState(sessionId: string): Promise<SessionState> {
  const response = await fetch(`${API_BASE_URL}/api/v1/session/${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error(`Session not found`);
  }
  const data = await response.json();
  return data.session as SessionState;
}
export async function adminLogin(password: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.ok;
}

export async function fetchAdminState(password: string): Promise<{
  game_order: GameFormat[];
  current_format: GameFormat;
  time_controls: Record<GameFormat, TimeControlConfig>;
  players: PlayerProfile[];
  runners_queue: PlayerProfile[];
  active_sessions: SessionState[];
  waiting_players: WaitingPlayer[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/state?password=${encodeURIComponent(password)}`);
  if (!response.ok) {
    throw new Error('Unauthorized');
  }
  return response.json();
}

export async function pairRound(password: string): Promise<{ count: number; format: GameFormat; sessions: SessionState[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/pair-round`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Could not pair waiting players' }));
    throw new Error(payload.detail || 'Could not pair waiting players');
  }

  return response.json();
}

export async function updateAdminGameOrder(password: string, gameOrder: GameFormat[]): Promise<GameFormat[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/game-order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, game_order: gameOrder }),
  });
  if (!response.ok) {
    throw new Error('Could not update game order');
  }
  const data = await response.json();
  return data.game_order as GameFormat[];
}

export async function updateAdminPlayer(password: string, playerId: string, points: number, harmonyTokens: number): Promise<PlayerProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/player`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password,
      player_id: playerId,
      points,
      harmony_tokens: harmonyTokens,
    }),
  });

  if (!response.ok) {
    throw new Error('Could not update player');
  }

  const data = await response.json();
  return data.player as PlayerProfile;
}

export async function updateAdminTimeControl(password: string, format: GameFormat, timeSeconds: number, increment: number): Promise<Record<GameFormat, TimeControlConfig>> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/time-control`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password,
      format,
      time_seconds: timeSeconds,
      increment,
    }),
  });

  if (!response.ok) {
    throw new Error('Could not update time control');
  }

  const data = await response.json();
  return data.time_controls as Record<GameFormat, TimeControlConfig>;
}



