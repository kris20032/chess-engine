'use client';

import Link from 'next/link';
import { ChessBoard } from '@/components/ChessBoard';
import { useChessGame } from '@/hooks/useChessGame';
import { EvaluationBar } from '@/components/EvaluationBar';

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
    evaluation,
    openingName,
    // Move navigation
    moveHistory,
    currentMoveIndex,
    isReviewMode,
    goBackMove,
    goForwardMove,
    goToLatest,
    navigateToMove,
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
              isInCheck={isInCheck}
            />

            {/* Evaluation Bar */}
            <div className="mt-4">
              <EvaluationBar score={evaluation} openingName={openingName} />
            </div>

            {/* Status Bar */}
            <div className="mt-4 p-4 bg-slate-800 rounded-lg text-center">
              <div className="text-xl font-semibold">
                {getStatusMessage()}
              </div>
            </div>

            {/* Game Over Banner */}
            {gameState.status !== 'ongoing' && (
              <div className="mt-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 rounded-2xl shadow-2xl border-4 border-amber-500 animate-in fade-in duration-300">
                {gameState.status === 'checkmate' && (
                  <>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-5xl animate-bounce">
                        {gameState.winner === (playingAsWhite ? 'white' : 'black') ? '🎉' : '😢'}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                          {gameState.winner === (playingAsWhite ? 'white' : 'black') ? 'You Won!' : 'You Lost!'}
                        </h2>
                        <p className="text-lg text-slate-300">
                          Checkmate! {gameState.winner === 'white' ? 'White' : 'Black'} wins!
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {gameState.status === 'stalemate' && (
                  <>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-5xl">🤝</div>
                      <div>
                        <h2 className="text-3xl font-bold text-amber-400">
                          Stalemate!
                        </h2>
                        <p className="text-lg text-slate-300">
                          The game is a draw.
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {(gameState.status === 'draw_insufficient_material' ||
                  gameState.status === 'draw_fifty_move' ||
                  gameState.status === 'draw_repetition') && (
                  <>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-5xl">🤝</div>
                      <div>
                        <h2 className="text-3xl font-bold text-amber-400">
                          Draw!
                        </h2>
                        <p className="text-lg text-slate-300">
                          {gameState.status === 'draw_insufficient_material' && 'Insufficient material'}
                          {gameState.status === 'draw_fifty_move' && 'Fifty-move rule'}
                          {gameState.status === 'draw_repetition' && 'Threefold repetition'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={resetGame}
                    className="flex-1 py-3 px-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl font-bold text-base transition-all transform hover:scale-105 active:scale-95"
                  >
                    New Game
                  </button>
                </div>
              </div>
            )}
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

              <Link href="/lobby">
                <button className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg font-semibold transition-all transform hover:scale-105">
                  👥 Play Multiplayer
                </button>
              </Link>

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

            {/* Move Navigation */}
            <div className="bg-slate-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-amber-400">Move History</h2>
                {isReviewMode && (
                  <button
                    onClick={goToLatest}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-semibold transition-all"
                  >
                    Latest
                  </button>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex gap-2">
                <button
                  onClick={goBackMove}
                  disabled={currentMoveIndex === 0}
                  className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                  title="Previous move (←)"
                >
                  ← Back
                </button>
                <button
                  onClick={goForwardMove}
                  disabled={currentMoveIndex === moveHistory.length - 1}
                  className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                  title="Next move (→)"
                >
                  Forward →
                </button>
              </div>

              {/* Move List */}
              <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                <div className="space-y-1">
                  {moveHistory.map((entry, index) => {
                    if (index === 0) return null; // Skip starting position
                    const moveNumber = Math.ceil(index / 2);
                    const isWhiteMove = index % 2 === 1;
                    const isCurrent = index === currentMoveIndex;

                    return (
                      <div
                        key={index}
                        onClick={() => navigateToMove(index)}
                        className={`px-2 py-1 rounded cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-amber-600 text-white font-bold'
                            : 'hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="text-slate-400 text-sm mr-2">
                          {isWhiteMove ? `${moveNumber}.` : ''}
                        </span>
                        <span className="font-mono text-sm">
                          {entry.san}
                        </span>
                      </div>
                    );
                  })}
                  {moveHistory.length === 1 && (
                    <div className="text-center text-slate-500 text-sm py-2">
                      No moves yet
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-400 text-center">
                Use ← → arrow keys to navigate
              </div>
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
