import React, { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export type GameFormat = 'blitz' | 'rapid' | 'powers' | 'knockout';
export type PlayerColor = 'w' | 'b';

export interface Move {
  san: string;
  from: string;
  to: string;
  piece: string;
  timestamp: number;
  moveNumber: number;
}

export interface UsedPowersState {
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
}

export interface GameState {
  format: GameFormat;
  whitePlayer: string;
  blackPlayer: string;
  whiteTime: number;
  blackTime: number;
  currentTurn: 'w' | 'b';
  moves: Move[];
  gameOver: boolean;
  result: string;
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  currentMoveIndex: number;
  boardHistory: string[];
  gameStarted: boolean;
  activePowerMode: string | null;
  selectedPowerSquare: string | null;
  whiteHarmonyTokens: number;
  blackHarmonyTokens: number;
  usedPowers: UsedPowersState;
  localPlayerColor: PlayerColor | null;
  localPlayerId: string | null;
  sessionId: string | null;
  onlineMatch: boolean;
}

const formatConfig: Record<
  GameFormat,
  {
    name: string;
    timeLimit: number;
    increment: number;
    hasPowers: boolean;
    hasTokens: boolean;
    maxTokens: number;
  }
> = {
  blitz: {
    name: 'Blitz',
    timeLimit: 5 * 60,
    increment: 3,
    hasPowers: false,
    hasTokens: false,
    maxTokens: 0,
  },
  rapid: {
    name: 'Rapid',
    timeLimit: 10 * 60,
    increment: 0,
    hasPowers: false,
    hasTokens: false,
    maxTokens: 0,
  },
  powers: {
    name: 'Powers',
    timeLimit: 10 * 60,
    increment: 0,
    hasPowers: true,
    hasTokens: false,
    maxTokens: 0,
  },
  knockout: {
    name: 'Knockout',
    timeLimit: 10 * 60,
    increment: 3,
    hasPowers: false,
    hasTokens: true,
    maxTokens: 3,
  },
};

export const PIECE_DESCRIPTIONS = {
  b: {
    name: 'Buddhist Monk',
    power: 'Convert',
    description: 'Once per game, move as a bishop and convert adjacent enemy pawns around the destination square.',
  },
  n: {
    name: 'Sikh Warrior',
    power: 'Leap',
    description: 'Once per game, jump over an adjacent friendly piece to the opposite square and capture normally if occupied.',
  },
  r: {
    name: 'Parsi Merchant',
    power: 'Trade',
    description: 'Once per game, trade positions with any adjacent friendly piece. Counts as your move.',
  },
  q: {
    name: 'Christian/Nasrani Keeper',
    power: 'Resurrection',
    description: 'If captured, it revives once on d1/d8 on your next turn; if blocked, revival waits.',
  },
} as const;

export type NetworkEvent =
  | { type: 'move'; from: string; to: string }
  | { type: 'special_move'; ability: string; from: string; to?: string }
  | { type: 'token_used'; player: PlayerColor }
  | {
      type: 'state_sync';
      state: {
        fen?: string;
        current_turn?: PlayerColor;
        white_time?: number;
        black_time?: number;
        white_harmony_tokens?: number;
        black_harmony_tokens?: number;
        used_powers?: UsedPowersState;
        moves?: Move[];
      };
    }
  | { type: 'surrender'; player: PlayerColor }
  | { type: 'game_over'; winner_color: PlayerColor | null; is_draw: boolean };

interface GameContextType {
  gameState: GameState;
  chess: Chess;
  initializeGame: (format: GameFormat, whitePlayer: string, blackPlayer: string) => void;
  initializeOnlineGame: (payload: {
    format: GameFormat;
    whitePlayer: string;
    blackPlayer: string;
    localPlayerColor: PlayerColor;
    localPlayerId: string;
    sessionId: string;
    whiteTime: number;
    blackTime: number;
    whiteHarmonyTokens: number;
    blackHarmonyTokens: number;
    usedPowers?: UsedPowersState;
    fen?: string;
  }) => void;
  makeMove: (from: string, to: string, emit?: boolean) => boolean;
  selectSquare: (square: string | null) => void;
  setLegalMoves: (moves: string[]) => void;
  resetGame: () => void;
  decrementTimer: () => void;
  getMoveNotation: (from: string, to: string, promotion?: string) => string | null;
  goToMove: (moveIndex: number) => void;
  startGame: () => void;
  setActivePowerMode: (mode: string | null) => void;
  setSelectedPowerSquare: (square: string | null) => void;
  makeSpecialMove: (ability: string, from: string, to?: string, emit?: boolean) => boolean;
  useHarmonyToken: (player: PlayerColor, emit?: boolean) => void;
  surrender: (player: PlayerColor, emit?: boolean) => void;
  applyRemoteEvent: (event: NetworkEvent) => void;
  applyRemoteStateSync: (state: NetworkEvent & { type: 'state_sync' }) => void;
  setNetworkEventHandler: (handler: ((event: NetworkEvent) => void) | null) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const defaultUsedPowers = (): UsedPowersState => ({
  white: { convert: false, leap: false, trade: false, resurrection: false },
  black: { convert: false, leap: false, trade: false, resurrection: false },
});

const normalizeColorKey = (color: PlayerColor): 'white' | 'black' => (color === 'w' ? 'white' : 'black');
const canResurrect = (usedPowers: UsedPowersState, color: PlayerColor): boolean => !usedPowers[normalizeColorKey(color)].resurrection;

const advanceFenTurnAfterManualMove = (
  fen: string,
  moverColor: PlayerColor,
  isCapture: boolean,
  movedPiece: PieceSymbol,
  from: string,
  to: string,
): string => {
  const parts = fen.split(' ');
  if (parts.length < 6) {
    return fen;
  }

  let castling = parts[2] === '-' ? '' : parts[2];
  const removeRight = (ch: string) => {
    castling = castling.replace(ch, '');
  };

  if (movedPiece === 'k') {
    if (moverColor === 'w') {
      removeRight('K');
      removeRight('Q');
    } else {
      removeRight('k');
      removeRight('q');
    }
  }

  if (movedPiece === 'r') {
    if (moverColor === 'w') {
      if (from === 'a1') removeRight('Q');
      if (from === 'h1') removeRight('K');
    } else {
      if (from === 'a8') removeRight('q');
      if (from === 'h8') removeRight('k');
    }
  }

  if (isCapture) {
    if (to === 'a1') removeRight('Q');
    if (to === 'h1') removeRight('K');
    if (to === 'a8') removeRight('q');
    if (to === 'h8') removeRight('k');
  }

  parts[2] = castling || '-';
  parts[1] = moverColor === 'w' ? 'b' : 'w';
  parts[3] = '-';

  const halfmove = Number.parseInt(parts[4], 10);
  parts[4] = Number.isFinite(halfmove) ? String(isCapture ? 0 : halfmove + 1) : (isCapture ? '0' : '1');

  const fullmove = Number.parseInt(parts[5], 10);
  parts[5] = Number.isFinite(fullmove)
    ? String(moverColor === 'b' ? fullmove + 1 : fullmove)
    : (moverColor === 'b' ? '2' : '1');

  return parts.join(' ');
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>({
    format: 'rapid',
    whitePlayer: 'White',
    blackPlayer: 'Black',
    whiteTime: 10 * 60,
    blackTime: 10 * 60,
    currentTurn: 'w',
    moves: [],
    gameOver: false,
    result: '',
    selectedSquare: null,
    legalMoves: [],
    lastMove: null,
    currentMoveIndex: -1,
    boardHistory: [],
    gameStarted: false,
    activePowerMode: null,
    selectedPowerSquare: null,
    whiteHarmonyTokens: 0,
    blackHarmonyTokens: 0,
    usedPowers: defaultUsedPowers(),
    localPlayerColor: null,
    localPlayerId: null,
    sessionId: null,
    onlineMatch: false,
  });

  const [chess, setChess] = useState<Chess>(new Chess());
  const networkHandlerRef = useRef<((event: NetworkEvent) => void) | null>(null);
  const resurrectionPendingRef = useRef<{ w: boolean; b: boolean }>({ w: false, b: false });

  const emitNetwork = useCallback((event: NetworkEvent, shouldEmit: boolean) => {
    if (shouldEmit && networkHandlerRef.current) {
      networkHandlerRef.current(event);
    }
  }, []);

  const finishTurn = useCallback(
    (
      nextChess: Chess,
      from: string,
      to: string,
      piece: PieceSymbol,
      san: string,
      emit: boolean,
      movePrefix?: string,
      usedPowersOverride?: UsedPowersState,
    ) => {
      setChess(nextChess);
      setGameState((prev) => {
        const nextTurn: PlayerColor = prev.currentTurn === 'w' ? 'b' : 'w';
        let usedPowers = usedPowersOverride ?? prev.usedPowers;

        const reviveSquare: Record<PlayerColor, Square> = { w: 'd1', b: 'd8' };
        if (resurrectionPendingRef.current[nextTurn]) {
          const sq = reviveSquare[nextTurn];
          const occupying = nextChess.get(sq);
          if (!occupying) {
            nextChess.put({ type: 'q', color: nextTurn }, sq);
            resurrectionPendingRef.current[nextTurn] = false;
            usedPowers = {
              ...usedPowers,
              [normalizeColorKey(nextTurn)]: {
                ...usedPowers[normalizeColorKey(nextTurn)],
                resurrection: true,
              },
            };
          }
        }

        const move: Move = {
          san: movePrefix ? `${movePrefix}: ${san}` : san,
          from,
          to,
          piece,
          timestamp: Date.now(),
          moveNumber: Math.floor(prev.moves.length / 2) + 1,
        };

        const gameOver = nextChess.isCheckmate() || nextChess.isStalemate() || nextChess.isThreefoldRepetition() || nextChess.isInsufficientMaterial();
        let result = '';

        if (nextChess.isCheckmate()) {
          result = `${prev.currentTurn === 'w' ? 'White' : 'Black'} wins by checkmate!`;
        } else if (nextChess.isStalemate()) {
          result = "Stalemate! It's a draw.";
        } else if (nextChess.isThreefoldRepetition()) {
          result = 'Draw by threefold repetition.';
        } else if (nextChess.isInsufficientMaterial()) {
          result = 'Draw by insufficient material.';
        }

        const updatedState: GameState = {
          ...prev,
          currentTurn: nextTurn,
          moves: [...prev.moves, move],
          lastMove: { from, to },
          selectedSquare: null,
          legalMoves: [],
          boardHistory: [...prev.boardHistory, nextChess.fen()],
          activePowerMode: null,
          gameOver,
          result,
          usedPowers,
        };

        emitNetwork(
          {
            type: 'state_sync',
            state: {
              fen: nextChess.fen(),
              current_turn: updatedState.currentTurn,
              white_time: updatedState.whiteTime,
              black_time: updatedState.blackTime,
              white_harmony_tokens: updatedState.whiteHarmonyTokens,
              black_harmony_tokens: updatedState.blackHarmonyTokens,
              used_powers: updatedState.usedPowers,
              moves: updatedState.moves,
            },
          },
          emit,
        );

        if (gameOver) {
          const winnerColor = nextChess.isCheckmate() ? (updatedState.currentTurn === 'w' ? 'b' : 'w') : null;
          emitNetwork({ type: 'game_over', winner_color: winnerColor, is_draw: winnerColor === null }, emit);
        }

        return updatedState;
      });
    },
    [emitNetwork],
  );

  const initializeGame = useCallback((format: GameFormat, whitePlayer: string, blackPlayer: string) => {
    const config = formatConfig[format];
    const instance = new Chess();

    resurrectionPendingRef.current = { w: false, b: false };
    setChess(instance);
    setGameState({
      format,
      whitePlayer,
      blackPlayer,
      whiteTime: config.timeLimit,
      blackTime: config.timeLimit,
      currentTurn: 'w',
      moves: [],
      gameOver: false,
      result: '',
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      currentMoveIndex: -1,
      boardHistory: [instance.fen()],
      gameStarted: false,
      activePowerMode: null,
      selectedPowerSquare: null,
      whiteHarmonyTokens: config.maxTokens,
      blackHarmonyTokens: config.maxTokens,
      usedPowers: defaultUsedPowers(),
      localPlayerColor: null,
      localPlayerId: null,
      sessionId: null,
      onlineMatch: false,
    });
  }, []);

  const initializeOnlineGame = useCallback((payload: {
    format: GameFormat;
    whitePlayer: string;
    blackPlayer: string;
    localPlayerColor: PlayerColor;
    localPlayerId: string;
    sessionId: string;
    whiteTime: number;
    blackTime: number;
    whiteHarmonyTokens: number;
    blackHarmonyTokens: number;
    usedPowers?: UsedPowersState;
    fen?: string;
  }) => {
    const instance = new Chess();
    if (payload.fen && payload.fen !== 'start') {
      try {
        instance.load(payload.fen);
      } catch {
        // Ignore invalid server FEN and fall back to start position.
      }
    }

    resurrectionPendingRef.current = { w: false, b: false };
    setChess(instance);
    setGameState((prev) => ({
      ...prev,
      format: payload.format,
      whitePlayer: payload.whitePlayer,
      blackPlayer: payload.blackPlayer,
      whiteTime: payload.whiteTime,
      blackTime: payload.blackTime,
      currentTurn: 'w',
      moves: [],
      gameOver: false,
      result: '',
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      currentMoveIndex: -1,
      boardHistory: [instance.fen()],
      gameStarted: true,
      activePowerMode: null,
      selectedPowerSquare: null,
      whiteHarmonyTokens: payload.whiteHarmonyTokens,
      blackHarmonyTokens: payload.blackHarmonyTokens,
      usedPowers: payload.usedPowers ?? defaultUsedPowers(),
      localPlayerColor: payload.localPlayerColor,
      localPlayerId: payload.localPlayerId,
      sessionId: payload.sessionId,
      onlineMatch: true,
    }));
  }, []);

  const makeMove = useCallback(
    (from: string, to: string, emit = true) => {
      if (from === to) {
        return false;
      }

      try {
      const nextChess = new Chess(chess.fen());
      const movedPiece = nextChess.get(from as Square);
      const move = nextChess.move({ from: from as Square, to: to as Square, promotion: 'q' });

      if (!move || !movedPiece) {
        return false;
      }

      if (move.captured === 'q') {
        const capturedColor = movedPiece.color === 'w' ? 'b' : 'w';
        if (canResurrect(gameState.usedPowers, capturedColor)) {
          resurrectionPendingRef.current[capturedColor] = true;
        }
      }

      const increment = formatConfig[gameState.format].increment;
      setGameState((prev) => ({
        ...prev,
        whiteTime: prev.currentTurn === 'w' ? prev.whiteTime + increment : prev.whiteTime,
        blackTime: prev.currentTurn === 'b' ? prev.blackTime + increment : prev.blackTime,
      }));

      finishTurn(nextChess, from, to, movedPiece.type, move.san, emit);
      return true;
      } catch {
        return false;
      }
    },
    [chess, gameState.format, emitNetwork, finishTurn],
  );

  const makeSpecialMove = useCallback(
    (ability: string, from: string, to?: string, emit = true) => {
      try {
      const nextChess = new Chess(chess.fen());
      const piece = nextChess.get(from as Square);
      if (!piece || !to) {
        return false;
      }

      const colorKey = normalizeColorKey(piece.color);
      const currentUsed = gameState.usedPowers[colorKey];

      if (ability === 'convert') {
        if (piece.type !== 'b' || currentUsed.convert) {
          return false;
        }

        const move = nextChess.move({ from: from as Square, to: to as Square, promotion: 'q' });
        if (!move) {
          return false;
        }

        const file = to.charCodeAt(0) - 97;
        const rank = Number.parseInt(to[1], 10);

        const offsets = [-1, 0, 1];
        for (const df of offsets) {
          for (const dr of offsets) {
            if (df === 0 && dr === 0) {
              continue;
            }
            const nf = file + df;
            const nr = rank + dr;
            if (nf < 0 || nf > 7 || nr < 1 || nr > 8) {
              continue;
            }
            const sq = `${String.fromCharCode(97 + nf)}${nr}` as Square;
            const adjacent = nextChess.get(sq);
            if (adjacent && adjacent.type === 'p' && adjacent.color !== piece.color) {
              nextChess.remove(sq);
              nextChess.put({ type: 'p', color: piece.color }, sq);
            }
          }
        }

        const usedPowers: UsedPowersState = {
          ...gameState.usedPowers,
          [colorKey]: { ...currentUsed, convert: true },
        };

        finishTurn(nextChess, from, to, piece.type, move.san, emit, 'Convert', usedPowers);
        return true;
      }

      if (ability === 'leap') {
        if (piece.type !== 'n' || currentUsed.leap) {
          return false;
        }

        const fromFile = from.charCodeAt(0) - 97;
        const fromRank = Number.parseInt(from[1], 10);
        const toFile = to.charCodeAt(0) - 97;
        const toRank = Number.parseInt(to[1], 10);

        const dx = toFile - fromFile;
        const dy = toRank - fromRank;

        if (!(Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && (Math.abs(dx) === 2 || Math.abs(dy) === 2))) {
          return false;
        }

        if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
          return false;
        }

        if ((dx !== 0 && dx % 2 !== 0) || (dy !== 0 && dy % 2 !== 0)) {
          return false;
        }

        const middleFile = fromFile + Math.trunc(dx / 2);
        const middleRank = fromRank + Math.trunc(dy / 2);
        const middleSquare = `${String.fromCharCode(97 + middleFile)}${middleRank}` as Square;
        const middlePiece = nextChess.get(middleSquare);
        if (!middlePiece || middlePiece.color !== piece.color) {
          return false;
        }

        const targetPiece = nextChess.get(to as Square);
        if (targetPiece && targetPiece.color === piece.color) {
          return false;
        }

        nextChess.remove(from as Square);
        if (targetPiece) {
          if (targetPiece.type === 'q' && canResurrect(gameState.usedPowers, targetPiece.color)) {
            resurrectionPendingRef.current[targetPiece.color] = true;
          }
          nextChess.remove(to as Square);
        }
        nextChess.put({ type: 'n', color: piece.color }, to as Square);

        try {
          nextChess.load(advanceFenTurnAfterManualMove(nextChess.fen(), piece.color, !!targetPiece, piece.type, from, to));
        } catch {
          return false;
        }

        const usedPowers: UsedPowersState = {
          ...gameState.usedPowers,
          [colorKey]: { ...currentUsed, leap: true },
        };

        finishTurn(nextChess, from, to, piece.type, `${from}-${to}`, emit, 'Leap', usedPowers);
        return true;
      }

      if (ability === 'trade') {
        if (piece.type !== 'r' || currentUsed.trade) {
          return false;
        }

        const targetPiece = nextChess.get(to as Square);
        if (!targetPiece || targetPiece.color !== piece.color) {
          return false;
        }

        const fromFile = from.charCodeAt(0) - 97;
        const fromRank = Number.parseInt(from[1], 10);
        const toFile = to.charCodeAt(0) - 97;
        const toRank = Number.parseInt(to[1], 10);
        const distance = Math.max(Math.abs(fromFile - toFile), Math.abs(fromRank - toRank));
        if (distance !== 1) {
          return false;
        }

        nextChess.remove(from as Square);
        nextChess.remove(to as Square);
        nextChess.put({ type: targetPiece.type, color: piece.color }, from as Square);
        nextChess.put({ type: 'r', color: piece.color }, to as Square);

        try {
          nextChess.load(advanceFenTurnAfterManualMove(nextChess.fen(), piece.color, false, piece.type, from, to));
        } catch {
          return false;
        }

        const usedPowers: UsedPowersState = {
          ...gameState.usedPowers,
          [colorKey]: { ...currentUsed, trade: true },
        };

        finishTurn(nextChess, from, to, piece.type, `${from}-${to}`, emit, 'Trade', usedPowers);
        return true;
      }

      return false;
      } catch {
        return false;
      }
    },
    [chess, emitNetwork, finishTurn, gameState.usedPowers],
  );

  const selectSquare = useCallback((square: string | null) => {
    setGameState((prev) => ({ ...prev, selectedSquare: square }));
  }, []);

  const setLegalMoves = useCallback((moves: string[]) => {
    setGameState((prev) => ({ ...prev, legalMoves: moves }));
  }, []);

  const decrementTimer = useCallback(() => {
    setGameState((prev) => {
      if (prev.gameOver || !prev.gameStarted) {
        return prev;
      }

      // Online: only the player whose turn it is updates the authoritative clock.
      if (prev.onlineMatch && prev.localPlayerColor && prev.localPlayerColor !== prev.currentTurn) {
        return prev;
      }

      const next = { ...prev };
      if (prev.currentTurn === 'w') {
        next.whiteTime = Math.max(0, prev.whiteTime - 1);
        if (next.whiteTime === 0) {
          next.gameOver = true;
          next.result = 'Black wins! White ran out of time.';
          emitNetwork({ type: 'game_over', winner_color: 'b', is_draw: false }, true);
        }
      } else {
        next.blackTime = Math.max(0, prev.blackTime - 1);
        if (next.blackTime === 0) {
          next.gameOver = true;
          next.result = 'White wins! Black ran out of time.';
          emitNetwork({ type: 'game_over', winner_color: 'w', is_draw: false }, true);
        }
      }

      if (prev.onlineMatch && prev.localPlayerColor === prev.currentTurn && !next.gameOver) {
        emitNetwork(
          {
            type: 'state_sync',
            state: {
              white_time: next.whiteTime,
              black_time: next.blackTime,
            },
          },
          true,
        );
      }

      return next;
    });
  }, [emitNetwork]);

  const getMoveNotation = useCallback(
    (from: string, to: string, promotion?: string): string | null => {
      try {
        const moves = chess.moves({ verbose: true });
        const move = moves.find((m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion));
        return move?.san ?? null;
      } catch {
        return null;
      }
    },
    [chess],
  );

  const goToMove = useCallback(
    (moveIndex: number) => {
      if (moveIndex < -1 || moveIndex >= gameState.moves.length) {
        return;
      }

      const nextChess = new Chess();
      for (let i = 0; i <= moveIndex; i += 1) {
        const move = gameState.moves[i];
        nextChess.move({ from: move.from as Square, to: move.to as Square, promotion: 'q' });
      }

      setChess(nextChess);
      setGameState((prev) => ({ ...prev, currentMoveIndex: moveIndex }));
    },
    [gameState.moves],
  );

  const resetGame = useCallback(() => {
    const instance = new Chess();
    resurrectionPendingRef.current = { w: false, b: false };
    setChess(instance);
    setGameState((prev) => {
      const tokenLimit = formatConfig[prev.format].maxTokens;
      return {
        ...prev,
        moves: [],
        currentTurn: 'w',
        selectedSquare: null,
        legalMoves: [],
        lastMove: null,
        currentMoveIndex: -1,
        gameOver: false,
        result: '',
        boardHistory: [instance.fen()],
        activePowerMode: null,
        whiteHarmonyTokens: tokenLimit,
        blackHarmonyTokens: tokenLimit,
        usedPowers: defaultUsedPowers(),
      };
    });
  }, []);

  const startGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, gameStarted: true }));
  }, []);

  const setActivePowerMode = useCallback((mode: string | null) => {
    setGameState((prev) => ({ ...prev, activePowerMode: mode }));
  }, []);

  const setSelectedPowerSquare = useCallback((square: string | null) => {
    setGameState((prev) => ({ ...prev, selectedPowerSquare: square }));
  }, []);

  const useHarmonyToken = useCallback(
    (player: PlayerColor, emit = true) => {
      setGameState((prev) => {
        if (prev.format !== 'knockout') {
          return prev;
        }

        let next = prev;
        if (player === 'w' && prev.whiteHarmonyTokens > 0) {
          next = {
            ...prev,
            whiteHarmonyTokens: prev.whiteHarmonyTokens - 1,
            blackTime: Math.max(0, prev.blackTime - 10),
          };
        } else if (player === 'b' && prev.blackHarmonyTokens > 0) {
          next = {
            ...prev,
            blackHarmonyTokens: prev.blackHarmonyTokens - 1,
            whiteTime: Math.max(0, prev.whiteTime - 10),
          };
        }

        if (next !== prev) {
          emitNetwork(
            {
              type: 'state_sync',
              state: {
                fen: chess.fen(),
                current_turn: next.currentTurn,
                white_time: next.whiteTime,
                black_time: next.blackTime,
                white_harmony_tokens: next.whiteHarmonyTokens,
                black_harmony_tokens: next.blackHarmonyTokens,
                used_powers: next.usedPowers,
                moves: next.moves,
              },
            },
            emit,
          );
        }

        return next;
      });
    },
    [emitNetwork, chess],
  );

  const surrender = useCallback(
    (player: PlayerColor, emit = true) => {
      setGameState((prev) => ({
        ...prev,
        gameOver: true,
        result: `${player === 'w' ? 'Black' : 'White'} wins by surrender!`,
      }));
      emitNetwork({ type: 'surrender', player }, emit);
      emitNetwork({ type: 'game_over', winner_color: player === 'w' ? 'b' : 'w', is_draw: false }, emit);
    },
    [emitNetwork],
  );

  const applyRemoteStateSync = useCallback((event: NetworkEvent & { type: 'state_sync' }) => {
    setGameState((prev) => {
      const fenTurn = typeof event.state.fen === 'string' ? event.state.fen.split(' ')[1] : undefined;
      const nextTurn = (fenTurn === 'w' || fenTurn === 'b' ? fenTurn : event.state.current_turn) ?? prev.currentTurn;
      const incomingMoves = event.state.moves ?? prev.moves;
      const positionChanged = incomingMoves.length !== prev.moves.length || nextTurn !== prev.currentTurn;
      return {
        ...prev,
        currentTurn: nextTurn,
        whiteTime: event.state.white_time ?? prev.whiteTime,
        blackTime: event.state.black_time ?? prev.blackTime,
        whiteHarmonyTokens: event.state.white_harmony_tokens ?? prev.whiteHarmonyTokens,
        blackHarmonyTokens: event.state.black_harmony_tokens ?? prev.blackHarmonyTokens,
        usedPowers: event.state.used_powers ?? prev.usedPowers,
        moves: incomingMoves,
        selectedSquare: positionChanged ? null : prev.selectedSquare,
        legalMoves: positionChanged ? [] : prev.legalMoves,
        activePowerMode: positionChanged ? null : prev.activePowerMode,
        selectedPowerSquare: positionChanged ? null : prev.selectedPowerSquare,
      };
    });

    setChess((prevChess) => {
      const fen = event.state.fen;
      if (!fen || fen === 'start') {
        return prevChess;
      }
      const next = new Chess();
      try {
        next.load(fen);
        return next;
      } catch {
        return prevChess;
      }
    });
  }, []);

  const applyRemoteEvent = useCallback(
    (event: NetworkEvent) => {
      try {
        // Authoritative online state comes from backend state_sync snapshots.
        if (event.type === 'state_sync') {
          applyRemoteStateSync(event);
          return;
        }
        if (event.type === 'game_over') {
          setGameState((prev) => ({
            ...prev,
            gameOver: true,
            result:
              event.is_draw || event.winner_color === null
                ? 'Game drawn.'
                : (event.winner_color === 'w' ? 'White' : 'Black') + ' wins!',
          }));
          return;
        }
      } catch {
        // Never crash UI on malformed realtime payloads.
      }
    },
    [applyRemoteStateSync],
  );

  const setNetworkEventHandler = useCallback((handler: ((event: NetworkEvent) => void) | null) => {
    networkHandlerRef.current = handler;
  }, []);

  return (
    <GameContext.Provider
      value={{
        gameState,
        chess,
        initializeGame,
        initializeOnlineGame,
        makeMove,
        selectSquare,
        setLegalMoves,
        resetGame,
        decrementTimer,
        getMoveNotation,
        goToMove,
        startGame,
        setActivePowerMode,
        setSelectedPowerSquare,
        makeSpecialMove,
        useHarmonyToken,
        surrender,
        applyRemoteEvent,
        applyRemoteStateSync,
        setNetworkEventHandler,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}




















