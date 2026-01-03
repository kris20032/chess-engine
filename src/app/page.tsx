'use client';

import { ChessBoard } from '@/components/ChessBoard';
import { useChessGame } from '@/hooks/useChessGame';

export default function Home() {
  const {
    fen,
    gameState,
    legalMoves,
    selectedSquare,
    setSelectedSquare,
    isAIThinking,
    difficulty,
    playingAsWhite,
    makeMove,
    resetGame,
    flipBoard,
    changeDifficulty,
    sideToMove,
    isInCheck,
  } = useChessGame(3);

  const handleSquareClick = (square: string) => {
    setSelectedSquare(square);
  };

  const getStatusMessage = () => {
    if (gameState.status === 'checkmate') {
      return `Checkmate! ${gameState.winner === 'white' ? 'White' : 'Black'} wins!`;
    }
    if (gameState.status === 'stalemate') {
      return 'Stalemate! Game is a draw.';
    }
    if (gameState.status === 'draw_insufficient_material') {
      return 'Draw by insufficient material.';
    }
    if (gameState.status === 'draw_fifty_move') {
      return 'Draw by fifty-move rule.';
    }
    if (gameState.status === 'draw_repetition') {
      return 'Draw by threefold repetition.';
    }
    if (isInCheck) {
      return `${sideToMove === 'white' ? 'White' : 'Black'} is in check!`;
    }
    if (isAIThinking) {
      return 'AI is thinking...';
    }
    return `${sideToMove === 'white' ? 'White' : 'Black'} to move`;
  };

  const getDifficultyName = (diff: number) => {
    if (diff <= 2) return 'Beginner';
    if (diff <= 4) return 'Intermediate';
    if (diff <= 6) return 'Advanced';
    if (diff <= 8) return 'Expert';
    return 'Master';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Chess Master
          </h1>
          <p className="text-slate-400">Professional Chess Engine with AI Opponent</p>
        </header>

        <div className="grid lg:grid-cols-[1fr,auto] gap-8 items-start">
          {/* Chess Board */}
          <div className="order-2 lg:order-1">
            <ChessBoard
              fen={fen}
              onMove={makeMove}
              selectedSquare={selectedSquare}
              onSquareClick={handleSquareClick}
              legalMoves={legalMoves}
              flipped={!playingAsWhite}
              isInteractive={!isAIThinking && gameState.status === 'ongoing'}
            />

            {/* Status Bar */}
            <div className="mt-4 p-4 bg-slate-800 rounded-lg text-center">
              <div className="text-xl font-semibold">
                {getStatusMessage()}
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="order-1 lg:order-2 lg:w-80 space-y-6">
            {/* Game Info */}
            <div className="bg-slate-800 rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-amber-400">Game Info</h2>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Playing as:</span>
                  <span className="font-semibold">{playingAsWhite ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Turn:</span>
                  <span className="font-semibold">{sideToMove === 'white' ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-semibold ${isInCheck ? 'text-red-400' : 'text-green-400'}`}>
                    {isInCheck ? 'Check' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Difficulty Control */}
            <div className="bg-slate-800 rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-amber-400">AI Difficulty</h2>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Level:</span>
                  <span className="font-semibold">{difficulty} - {getDifficultyName(difficulty)}</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficulty}
                  onChange={(e) => changeDifficulty(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />

                <div className="flex justify-between text-xs text-slate-500">
                  <span>Easy</span>
                  <span>Hard</span>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Higher difficulty means deeper search (stronger AI)
              </p>
            </div>

            {/* Game Controls */}
            <div className="bg-slate-800 rounded-lg p-6 space-y-3">
              <h2 className="text-2xl font-bold text-amber-400">Controls</h2>

              <button
                onClick={resetGame}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                New Game
              </button>

              <button
                onClick={flipBoard}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Flip Board
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-slate-800 rounded-lg p-6 space-y-2">
              <h2 className="text-xl font-bold text-amber-400">How to Play</h2>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>• Click or drag pieces to move</li>
                <li>• Green highlights show legal moves</li>
                <li>• AI automatically responds to your moves</li>
                <li>• Adjust difficulty for stronger AI</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>Built with Next.js 14+ | Bitboard Chess Engine | Negamax AI</p>
        </footer>
      </div>
    </div>
  );
}
