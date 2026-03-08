import { useGame } from '@/context/game-context';

interface PlayerInfoProps {
  variant?: 'compact' | 'full';
}

export function PlayerInfo({ variant = 'full' }: PlayerInfoProps) {
  const { gameState } = useGame();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatConfig = {
    blitz: { name: 'Blitz', icon: '⚡' },
    rapid: { name: 'Rapid', icon: '⏱️' },
    powers: { name: 'Powers', icon: '✨' },
    knockout: { name: 'Knockout', icon: '🔥' },
  };

  const config = formatConfig[gameState.format];

  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {/* White Player */}
        <div
          className={`p-3 rounded-lg border-2 transition-colors ${
            gameState.currentTurn === 'w' && !gameState.gameOver
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card'
          }`}
        >
          <p className="text-xs text-muted-foreground mb-1">White</p>
          <p className="font-semibold text-foreground text-sm truncate">
            {gameState.whitePlayer}
          </p>
          <p
            className={`text-xl font-mono font-bold mt-1 ${
              gameState.whiteTime < 60 && gameState.whiteTime > 0 ? 'text-red-500' : 'text-foreground'
            }`}
          >
            {formatTime(gameState.whiteTime)}
          </p>
        </div>

        {/* Black Player */}
        <div
          className={`p-3 rounded-lg border-2 transition-colors ${
            gameState.currentTurn === 'b' && !gameState.gameOver
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card'
          }`}
        >
          <p className="text-xs text-muted-foreground mb-1">Black</p>
          <p className="font-semibold text-foreground text-sm truncate">
            {gameState.blackPlayer}
          </p>
          <p
            className={`text-xl font-mono font-bold mt-1 ${
              gameState.blackTime < 60 && gameState.blackTime > 0 ? 'text-red-500' : 'text-foreground'
            }`}
          >
            {formatTime(gameState.blackTime)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-card border border-border rounded-lg p-4">
      {/* Format Info */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground">Format</p>
          <p className="font-semibold text-foreground flex items-center gap-2">
            {config.icon} {config.name}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Move</p>
          <p className="font-semibold text-foreground">
            {Math.ceil((gameState.moves.length + 1) / 2)}
          </p>
        </div>
      </div>

      {/* White Player */}
      <div
        className={`p-4 rounded-lg border-2 transition-colors ${
          gameState.currentTurn === 'w' && !gameState.gameOver
            ? 'border-primary bg-primary/10'
            : 'border-border'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border-2 border-gray-400 rounded"></div>
            <p className="font-semibold text-foreground">{gameState.whitePlayer}</p>
          </div>
          {gameState.currentTurn === 'w' && !gameState.gameOver && (
            <span className="text-xs font-semibold text-primary">TO MOVE</span>
          )}
        </div>
        <p
          className={`text-3xl font-mono font-bold ${
            gameState.whiteTime < 60 && gameState.whiteTime > 0 ? 'text-red-500' : 'text-foreground'
          }`}
        >
          {formatTime(gameState.whiteTime)}
        </p>
      </div>

      {/* Black Player */}
      <div
        className={`p-4 rounded-lg border-2 transition-colors ${
          gameState.currentTurn === 'b' && !gameState.gameOver
            ? 'border-primary bg-primary/10'
            : 'border-border'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black border-2 border-gray-400 rounded"></div>
            <p className="font-semibold text-foreground">{gameState.blackPlayer}</p>
          </div>
          {gameState.currentTurn === 'b' && !gameState.gameOver && (
            <span className="text-xs font-semibold text-primary">TO MOVE</span>
          )}
        </div>
        <p
          className={`text-3xl font-mono font-bold ${
            gameState.blackTime < 60 && gameState.blackTime > 0 ? 'text-red-500' : 'text-foreground'
          }`}
        >
          {formatTime(gameState.blackTime)}
        </p>
      </div>

      {/* Game Status */}
      {gameState.result && (
        <div className="p-4 bg-primary/10 border border-primary rounded-lg">
          <p className="font-semibold text-primary text-center">{gameState.result}</p>
        </div>
      )}
    </div>
  );
}
