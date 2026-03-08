export interface ChessPiece {
  type: string;
  color: 'w' | 'b';
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}
