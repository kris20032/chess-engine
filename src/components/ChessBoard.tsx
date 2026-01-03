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
}

export function ChessBoard({
  fen,
  onMove,
  selectedSquare,
  onSquareClick,
  legalMoves = [],
  flipped = false,
  isInteractive = true,
}: ChessBoardProps) {
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);
  const [promotionDialog, setPromotionDialog] = useState<{from: string; to: string} | null>(null);

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
        onMove(draggedFrom, square);
      }
    }
    setDraggedFrom(null);
  };

  const handlePromotion = (piece: string) => {
    if (promotionDialog) {
      onMove(promotionDialog.from, promotionDialog.to, piece);
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

    return (
      <div
        key={square}
        className={`
          aspect-square flex items-center justify-center text-4xl sm:text-5xl md:text-6xl cursor-pointer
          transition-colors relative
          ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
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
            className={`select-none ${piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]'}`}
          >
            {PIECE_SYMBOLS[piece]}
          </div>
        )}
        {isLegalDestination && !piece && (
          <div className="w-4 h-4 bg-green-500 rounded-full opacity-50" />
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
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">Choose promotion piece:</h3>
            <div className="flex gap-4">
              {['q', 'r', 'b', 'n'].map(piece => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="text-6xl hover:bg-gray-100 p-4 rounded transition-colors"
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
