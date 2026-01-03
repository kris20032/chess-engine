'use client';

import { Position } from '@/engine';
import { useState } from 'react';

// Unicode chess pieces
const PIECE_SYMBOLS: Record<string, string> = {
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
};

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  selectedSquare: string | null;
  onSquareClick: (square: string) => void;
  legalMoves?: string[];
  flipped?: boolean;
  isInteractive?: boolean;
  isInCheck?: boolean;
}

export function ChessBoard({
  fen,
  onMove,
  selectedSquare,
  onSquareClick,
  legalMoves = [],
  flipped = false,
  isInteractive = true,
  isInCheck = false,
}: ChessBoardProps) {
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);
  const [promotionDialog, setPromotionDialog] = useState<{from: string; to: string} | null>(null);
  const [lastMove, setLastMove] = useState<{from: string; to: string} | null>(null);
  const [animatingPiece, setAnimatingPiece] = useState<{square: string; piece: string} | null>(null);

  // Parse FEN to get piece positions
  const position = Position.fromFEN(fen);

  const getPieceAt = (square: string): string | null => {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1;
    const squareIndex = rank * 8 + file;

    const pieceIndex = position.pieceAt(squareIndex);
    if (pieceIndex === -1) return null;

    // Map piece index to FEN character
    const pieceMap = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
    return pieceMap[pieceIndex];
  };

  const isLegalMove = (from: string, to: string): boolean => {
    return legalMoves.some(move => move.startsWith(from + to));
  };

  const handleSquareClick = (square: string) => {
    if (!isInteractive) return;

    if (selectedSquare) {
      // Try to move
      const isPromotion = selectedSquare[1] === '7' && square[1] === '8' && getPieceAt(selectedSquare) === 'P' ||
                          selectedSquare[1] === '2' && square[1] === '1' && getPieceAt(selectedSquare) === 'p';

      if (isPromotion && isLegalMove(selectedSquare, square)) {
        setPromotionDialog({ from: selectedSquare, to: square });
      } else {
        const success = onMove(selectedSquare, square);
        if (success) {
          setLastMove({ from: selectedSquare, to: square });
        }
        if (!success && square !== selectedSquare) {
          // If move failed, maybe selecting a new piece
          onSquareClick(square);
        }
      }
    } else {
      onSquareClick(square);
    }
  };

  const handleDragStart = (e: React.DragEvent, square: string) => {
    if (!isInteractive) {
      e.preventDefault();
      return;
    }
    setDraggedFrom(square);
    onSquareClick(square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, square: string) => {
    e.preventDefault();
    if (draggedFrom && draggedFrom !== square) {
      const isPromotion = draggedFrom[1] === '7' && square[1] === '8' && getPieceAt(draggedFrom) === 'P' ||
                          draggedFrom[1] === '2' && square[1] === '1' && getPieceAt(draggedFrom) === 'p';

      if (isPromotion && isLegalMove(draggedFrom, square)) {
        setPromotionDialog({ from: draggedFrom, to: square });
      } else {
        const success = onMove(draggedFrom, square);
        if (success) {
          setLastMove({ from: draggedFrom, to: square });
        }
      }
    }
    setDraggedFrom(null);
  };

  const handlePromotion = (piece: string) => {
    if (promotionDialog) {
      const success = onMove(promotionDialog.from, promotionDialog.to, piece);
      if (success) {
        setLastMove({ from: promotionDialog.from, to: promotionDialog.to });
      }
      setPromotionDialog(null);
    }
  };

  const renderSquare = (file: number, rank: number) => {
    const displayFile = flipped ? 7 - file : file;
    const displayRank = flipped ? rank : 7 - rank;

    const square = String.fromCharCode(97 + displayFile) + (displayRank + 1);
    const isLight = (file + rank) % 2 === 0;
    const isSelected = selectedSquare === square;
    const piece = getPieceAt(square);

    // Check if this square is a legal move destination
    const isLegalDestination = selectedSquare && isLegalMove(selectedSquare, square);

    // Check if this square is part of last move
    const isLastMoveFrom = lastMove?.from === square;
    const isLastMoveTo = lastMove?.to === square;

    // Check if this is the king square and in check
    const isKingInCheck = isInCheck && (piece === 'K' || piece === 'k');

    return (
      <div
        key={square}
        className={`
          aspect-square flex items-center justify-center text-4xl sm:text-5xl md:text-6xl cursor-pointer
          transition-all duration-200 relative
          ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
          ${isKingInCheck ? 'bg-red-500 animate-pulse' : ''}
          ${!isKingInCheck && (isLastMoveFrom || isLastMoveTo) ? (isLight ? 'bg-yellow-200' : 'bg-yellow-600') : ''}
          ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''}
          ${isLegalDestination ? 'ring-4 ring-green-400 ring-inset' : ''}
        `}
        onClick={() => handleSquareClick(square)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, square)}
      >
        {piece && (
          <div
            draggable={isInteractive}
            onDragStart={(e) => handleDragStart(e, square)}
            className={`
              select-none transition-all duration-200
              ${isInteractive ? 'hover:scale-110 active:scale-95' : ''}
              ${piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]'}
              ${draggedFrom === square ? 'opacity-50' : 'opacity-100'}
            `}
          >
            {PIECE_SYMBOLS[piece]}
          </div>
        )}
        {isLegalDestination && !piece && (
          <div className="w-4 h-4 bg-green-500 rounded-full opacity-50 animate-pulse" />
        )}
        {isLegalDestination && piece && (
          <div className="absolute inset-0 border-4 border-green-500 rounded opacity-40 animate-pulse pointer-events-none" />
        )}
        {/* Coordinate labels */}
        {file === (flipped ? 7 : 0) && (
          <div className={`absolute left-1 top-1 text-xs font-semibold ${isLight ? 'text-amber-700' : 'text-amber-100'}`}>
            {8 - rank}
          </div>
        )}
        {rank === (flipped ? 0 : 7) && (
          <div className={`absolute right-1 bottom-1 text-xs font-semibold ${isLight ? 'text-amber-700' : 'text-amber-100'}`}>
            {String.fromCharCode(97 + file)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-8 gap-0 border-4 border-amber-900 shadow-2xl max-w-2xl mx-auto">
        {Array.from({ length: 8 }, (_, rank) =>
          Array.from({ length: 8 }, (_, file) => renderSquare(file, rank))
        )}
      </div>

      {/* Promotion dialog */}
      {promotionDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200 z-10">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl border-2 border-amber-500 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold mb-6 text-center text-amber-400">Promote to:</h3>
            <div className="flex gap-3">
              {['q', 'r', 'b', 'n'].map(piece => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="text-7xl hover:scale-110 active:scale-95 bg-amber-100 hover:bg-amber-200 p-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {PIECE_SYMBOLS[piece]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
