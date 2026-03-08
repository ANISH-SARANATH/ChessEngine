import { useGame } from '@/context/game-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function MoveHistory() {
  const { gameState, goToMove } = useGame();
  const [copied, setCopied] = useState(false);

  // Get format accent color from gameState
  const formatColors = {
    blitz: 'from-red-600 to-red-400',
    rapid: 'from-purple-600 to-purple-400',
    powers: 'from-orange-600 to-orange-400',
    knockout: 'from-blue-600 to-blue-400',
  };

  const formatTextColors = {
    blitz: 'text-red-600 dark:text-red-400',
    rapid: 'text-purple-600 dark:text-purple-400',
    powers: 'text-orange-600 dark:text-orange-400',
    knockout: 'text-blue-600 dark:text-blue-400',
  };

  const formatBgColors = {
    blitz: 'bg-red-50 dark:bg-red-950/20',
    rapid: 'bg-purple-50 dark:bg-purple-950/20',
    powers: 'bg-orange-50 dark:bg-orange-950/20',
    knockout: 'bg-blue-50 dark:bg-blue-950/20',
  };

  const accentColor = formatColors[gameState.format] || 'from-blue-600 to-blue-400';
  const textColor = formatTextColors[gameState.format] || 'text-blue-600 dark:text-blue-400';
  const bgColor = formatBgColors[gameState.format] || 'bg-blue-50 dark:bg-blue-950/20';

  // Group moves into pairs (white, black)
  const movePairs: Array<{ moveNumber: number; whiteName: string; blackName: string; whiteMove: typeof gameState.moves[number] | null; blackMove: typeof gameState.moves[number] | null; }> = [];
  for (let i = 0; i < gameState.moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      whiteName: gameState.whitePlayer,
      blackName: gameState.blackPlayer,
      whiteMove: gameState.moves[i] || null,
      blackMove: gameState.moves[i + 1] || null,
    });
  }

  const copyMoves = () => {
    const movesList = movePairs
      .map((pair) => {
        let line = `${pair.moveNumber}.`;
        if (pair.whiteMove) line += ` ${pair.whiteMove.san}`;
        if (pair.blackMove) line += ` ${pair.blackMove.san}`;
        return line;
      })
      .join(' ');
    
    navigator.clipboard.writeText(movesList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header with accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentColor}`} />
      
      <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">Move History</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {gameState.moves.length} move{gameState.moves.length !== 1 ? 's' : ''}
            </p>
          </div>
          {gameState.moves.length > 0 && (
            <button
              onClick={copyMoves}
              className={`p-1.5 hover:${bgColor} rounded-md transition-colors ${textColor}`}
              title="Copy moves"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Moves List */}
      <ScrollArea className="flex-1 w-full">
        <div className="px-3 py-2 space-y-1.5">
          {movePairs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              Make your first move!
            </p>
          ) : (
            movePairs.map((pair) => (
              <div key={pair.moveNumber} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  {/* Move Number */}
                  <span className={`font-bold w-6 flex-shrink-0 ${textColor}`}>
                    {pair.moveNumber}.
                  </span>

                  {/* White Move */}
                  {pair.whiteMove && (
                    <button
                      onClick={() => goToMove(pair.moveNumber * 2 - 2)}
                      className={`flex items-center gap-1.5 flex-1 px-2 py-1 rounded cursor-pointer transition-all text-left ${
                        gameState.currentMoveIndex === pair.moveNumber * 2 - 2
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500 font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Click to replay position"
                    >
                      <span className="text-[10px] text-muted-foreground font-medium w-3.5">W</span>
                      <span className="text-xs font-medium text-foreground">
                        {pair.whiteMove.san}
                      </span>
                    </button>
                  )}

                  {/* Black Move */}
                  {pair.blackMove && (
                    <button
                      onClick={() => goToMove(pair.moveNumber * 2 - 1)}
                      className={`flex items-center gap-1.5 flex-1 px-2 py-1 rounded cursor-pointer transition-all text-left ${
                        gameState.currentMoveIndex === pair.moveNumber * 2 - 1
                          ? 'bg-slate-200 dark:bg-slate-700 ring-1 ring-slate-500 font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Click to replay position"
                    >
                      <span className="text-[10px] text-muted-foreground font-medium w-3.5">B</span>
                      <span className="text-xs font-medium text-foreground">
                        {pair.blackMove.san}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

