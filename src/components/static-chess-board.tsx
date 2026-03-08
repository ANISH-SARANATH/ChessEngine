export function StaticChessBoard() {
  const pieces: Record<string, string> = {
    'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜',
    'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
    'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
    'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖',
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // White and light blue board
  const lightSquare = 'bg-white';
  const darkSquare = 'bg-blue-200 dark:bg-blue-300';
  const accentColor = 'text-blue-600 dark:text-blue-700';
  const borderColor = 'border-blue-200 dark:border-blue-300';

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xl inline-block border border-blue-200 dark:border-blue-300">
      <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
        {/* Chessboard - with integrated rank labels */}
        {ranks.map((rank, rankIndex) => (
          <div key={rank} className="flex">
            {/* Rank label on the left */}
            <div className={`w-8 h-12 flex items-center justify-center text-xs font-bold ${accentColor} bg-blue-50 dark:bg-blue-100 border-r ${borderColor}`}>
              {rank}
            </div>
            
            {/* Squares */}
            {files.map((file, fileIndex) => {
              const square = `${file}${rank}`;
              const isLightSquare = (rankIndex + fileIndex) % 2 === 0;
              const piece = pieces[square as keyof typeof pieces];
              const isBlackPiece = piece && piece.charCodeAt(0) > 9817;

              return (
                <div
                  key={square}
                  className={`w-12 h-12 flex items-center justify-center text-3xl font-bold
                    ${isLightSquare ? lightSquare : darkSquare}
                    ${fileIndex < 7 ? `border-r ${borderColor}` : ''}
                  `}
                >
                  {piece && (
                    <span 
                      className={`
                        ${isBlackPiece 
                          ? 'text-gray-800 dark:text-gray-900' 
                          : 'text-gray-500 dark:text-gray-600'
                        }
                      `}
                    >
                      {piece}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Bottom file labels */}
        <div className={`flex border-t ${borderColor}`}>
          <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold ${accentColor} bg-blue-50 dark:bg-blue-100 border-r ${borderColor}`}>
            
          </div>
          {files.map((file) => (
            <div
              key={file}
              className={`w-12 h-8 flex items-center justify-center text-xs font-bold uppercase ${accentColor} bg-blue-50/50 dark:bg-blue-100/50`}
            >
              {file}
            </div>
          ))}
        </div>
      </div>

      {/* Board info */}
      <div className="flex justify-between mt-2 px-1">
        <span className="text-xs text-blue-600 dark:text-blue-700">Classic setup</span>
        <span className="text-xs text-blue-600 dark:text-blue-700">White pieces</span>
      </div>
    </div>
  );
}