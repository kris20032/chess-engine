'use client';

import { Position } from '@/engine';
import { useState, useEffect } from 'react';

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
  colorScheme?: { light: string; dark: string };
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
  colorScheme = { light: '#f0d9b5', dark: '#b58863' },
}: ChessBoardProps) {
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);
  const [promotionDialog, setPromotionDialog] = useState<{from: string; to: string} | null>(null);
  const [lastMove, setLastMove] = useState<{from: string; to: string} | null>(null);
  const [animatingMove, setAnimatingMove] = useState<{from: string; to: string; piece: string} | null>(null);
  const [premove, setPremove] = useState<{from: string; to: string} | null>(null);
  const [previousFen, setPreviousFen] = useState(fen);

  // Parse FEN to get piece positions
  const position = Position.fromFEN(fen);

  // Detect piece moves for animation
  useEffect(() => {
    if (fen !== previousFen) {
      // Find which piece moved by comparing FENs
      const prevPos = Position.fromFEN(previousFen);
      const currPos = Position.fromFEN(fen);

      // Simple detection: find a square that had a piece and now doesn't
      // and a square that didn't have a piece and now does
      for (let i = 0; i < 64; i++) {
        const prevPiece = prevPos.pieceAt(i);
        const currPiece = currPos.pieceAt(i);

        if (prevPiece !== -1 && currPiece === -1) {
          // Piece left this square
          const fromFile = i % 8;
          const fromRank = Math.floor(i / 8);
          const from = String.fromCharCode(97 + fromFile) + (fromRank + 1);

          // Find where it went
          for (let j = 0; j < 64; j++) {
            const prevDestPiece = prevPos.pieceAt(j);
            const currDestPiece = currPos.pieceAt(j);

            if (currDestPiece !== -1 && (prevDestPiece === -1 || prevDestPiece !== currDestPiece)) {
              const toFile = j % 8;
              const toRank = Math.floor(j / 8);
              const to = String.fromCharCode(97 + toFile) + (toRank + 1);

              const pieceMap = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
              setAnimatingMove({ from, to, piece: pieceMap[currDestPiece] });

              // Clear animation after it completes
              setTimeout(() => setAnimatingMove(null), 300);
              setPreviousFen(fen);
              return;
            }
          }
        }
      }
      setPreviousFen(fen);
    }
  }, [fen, previousFen]);

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

  // Execute premove when it becomes player's turn
  useEffect(() => {
    if (premove && isInteractive) {
      const success = onMove(premove.from, premove.to);
      if (success) {
        setLastMove(premove);
      }
      setPremove(null);
    }
  }, [isInteractive, premove, onMove]);

  const handleSquareClick = (square: string) => {
    if (selectedSquare) {
      // Try to move
      const isPromotion = selectedSquare[1] === '7' && square[1] === '8' && getPieceAt(selectedSquare) === 'P' ||
                          selectedSquare[1] === '2' && square[1] === '1' && getPieceAt(selectedSquare) === 'p';

      if (isPromotion && isLegalMove(selectedSquare, square)) {
        setPromotionDialog({ from: selectedSquare, to: square });
      } else if (isInteractive) {
        const success = onMove(selectedSquare, square);
        if (success) {
          setLastMove({ from: selectedSquare, to: square });
        }
        if (!success && square !== selectedSquare) {
          // If move failed, maybe selecting a new piece
          onSquareClick(square);
        }
      } else {
        // Not our turn - set as premove
        if (isLegalMove(selectedSquare, square)) {
          setPremove({ from: selectedSquare, to: square });
        }
        onSquareClick(square);
      }
    } else {
      onSquareClick(square);
    }
  };

  const handleDragStart = (e: React.DragEvent, square: string) => {
    if (!isInteractive && !premove) {
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
      } else if (isInteractive) {
        const success = onMove(draggedFrom, square);
        if (success) {
          setLastMove({ from: draggedFrom, to: square });
        }
      } else {
        // Not our turn - set as premove
        if (isLegalMove(draggedFrom, square)) {
          setPremove({ from: draggedFrom, to: square });
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

    // Check if this is premove
    const isPremoveFrom = premove?.from === square;
    const isPremoveTo = premove?.to === square;

    // Check if this is the king square and in check
    const isKingInCheck = isInCheck && (piece === 'K' || piece === 'k');

    // Determine background color
    let bgColor = isLight ? colorScheme.light : colorScheme.dark;
    if (isKingInCheck) {
      bgColor = '#ef4444'; // red-500
    } else if (!isKingInCheck && (isLastMoveFrom || isLastMoveTo)) {
      bgColor = isLight ? '#cdd26a' : '#aaa23a';
    } else if (!isKingInCheck && (isPremoveFrom || isPremoveTo)) {
      bgColor = isLight ? '#d4a574' : '#a67c52';
    }

    return (
      <div
        key={square}
        className={`
          aspect-square flex items-center justify-center text-6xl sm:text-7xl md:text-8xl cursor-pointer
          transition-all duration-500 ease-out relative
          ${isKingInCheck ? 'animate-pulse' : ''}
          ${isSelected ? 'ring-4 ring-blue-400 ring-inset' : ''}
          ${isLegalDestination ? 'ring-4 ring-green-400 ring-inset' : ''}
        `}
        style={{ backgroundColor: bgColor }}
        onClick={() => handleSquareClick(square)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, square)}
      >
        {piece && (
          <div
            draggable={isInteractive || !!premove}
            onDragStart={(e) => handleDragStart(e, square)}
            className={`
              select-none transition-all duration-500 ease-out
              ${isInteractive || premove ? 'hover:scale-110 active:scale-95 hover:drop-shadow-2xl' : ''}
              ${piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)]' : 'text-black drop-shadow-[0_3px_3px_rgba(255,255,255,0.6)]'}
              ${draggedFrom === square ? 'opacity-40' : 'opacity-100'}
            `}
          >
            {PIECE_SYMBOLS[piece]}
          </div>
        )}
        {isLegalDestination && !piece && (
          <div className="w-5 h-5 bg-green-500 rounded-full opacity-60 transition-all duration-500" />
        )}
        {isLegalDestination && piece && (
          <div className="absolute inset-0 border-4 border-green-500 rounded opacity-50 pointer-events-none transition-all duration-500" />
        )}
        {/* Coordinate labels */}
        {file === (flipped ? 7 : 0) && (
          <div
            className="absolute left-1.5 top-1.5 text-xs font-bold"
            style={{ color: isLight ? colorScheme.dark : colorScheme.light }}
          >
            {8 - rank}
          </div>
        )}
        {rank === (flipped ? 0 : 7) && (
          <div
            className="absolute right-1.5 bottom-1 text-xs font-bold"
            style={{ color: isLight ? colorScheme.dark : colorScheme.light }}
          >
            {String.fromCharCode(97 + file)}
          </div>
        )}
      </div>
    );
  };

  // Calculate animation position
  const getSquarePosition = (square: string, flipped: boolean) => {
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    const displayFile = flipped ? 7 - file : file;
    const displayRank = flipped ? rank : 7 - rank;
    return { x: displayFile * 12.5, y: displayRank * 12.5 }; // 12.5% per square
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-8 gap-0 border-4 border-[#8b7355] shadow-2xl max-w-2xl mx-auto">
        {Array.from({ length: 8 }, (_, rank) =>
          Array.from({ length: 8 }, (_, file) => renderSquare(file, rank))
        )}
      </div>

      {/* Sliding piece animation overlay */}
      {animatingMove && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute text-6xl sm:text-7xl md:text-8xl transition-all duration-300 ease-out"
            style={{
              left: `${getSquarePosition(animatingMove.from, flipped).x}%`,
              top: `${getSquarePosition(animatingMove.from, flipped).y}%`,
              transform: `translate(${
                (getSquarePosition(animatingMove.to, flipped).x - getSquarePosition(animatingMove.from, flipped).x)
              }%, ${
                (getSquarePosition(animatingMove.to, flipped).y - getSquarePosition(animatingMove.from, flipped).y)
              }%)`,
              width: '12.5%',
              height: '12.5%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className={`${
                animatingMove.piece === animatingMove.piece.toUpperCase()
                  ? 'text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)]'
                  : 'text-black drop-shadow-[0_3px_3px_rgba(255,255,255,0.6)]'
              }`}
            >
              {PIECE_SYMBOLS[animatingMove.piece]}
            </span>
          </div>
        </div>
      )}

      {premove && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded text-sm font-semibold shadow-lg">
          Premove: {premove.from} → {premove.to}
        </div>
      )}

      {/* Promotion dialog */}
      {promotionDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-300 z-10">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl border-2 border-amber-500 animate-in zoom-in-95 duration-500">
            <h3 className="text-2xl font-bold mb-6 text-center text-amber-400">Promote to:</h3>
            <div className="flex gap-3">
              {['q', 'r', 'b', 'n'].map(piece => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="text-7xl hover:scale-110 active:scale-95 bg-amber-100 hover:bg-amber-200 p-6 rounded-xl transition-all duration-500 shadow-lg hover:shadow-xl"
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
