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

  const getDifficultyName = (diff: number) => {
    if (diff <= 2) return 'Beginner';
    if (diff <= 4) return 'Intermediate';
    if (diff <= 6) return 'Advanced';
    if (diff <= 8) return 'Expert';
    return 'Master';
  };

  return (
    <div className="min-h-screen bg-[#312e2b] text-white">
      {/* Top Navigation Bar */}
      <nav className="bg-[#262421] border-b border-[#3d3a36] px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white">♔ Chess Master</h1>
            <Link href="/lobby">
              <button className="px-4 py-1.5 bg-[#81b64c] hover:bg-[#6d9940] rounded text-white text-sm font-semibold transition-colors">
                Play Multiplayer
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={flipBoard}
              className="px-3 py-1.5 bg-[#54524f] hover:bg-[#6a6762] rounded text-white text-sm font-medium transition-colors"
            >
              ⟲ Flip
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-1.5 bg-[#7fa650] hover:bg-[#6d8f44] rounded text-white text-sm font-semibold transition-colors"
            >
              New Game
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto p-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column: Game Board */}
          <div className="flex flex-col gap-4">
            {/* Top Player Card */}
            <div className="bg-[#262421] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3c3a37] flex items-center justify-center text-xl">
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-white">AI Opponent</div>
                  <div className="text-xs text-[#a8a29e]">{getDifficultyName(difficulty)} • Level {difficulty}</div>
                </div>
              </div>
              {!playingAsWhite && sideToMove === 'black' && gameState.status === 'ongoing' && (
                <div className="flex items-center gap-2">
                  {isAIThinking && <div className="text-xs text-[#81b64c] animate-pulse">Thinking...</div>}
                  <div className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Chess Board with Evaluation Bar */}
            <div className="bg-[#262421] rounded-lg p-4 relative">
              <div className="flex gap-3">
                <div className="w-8">
                  <EvaluationBar score={evaluation} openingName={openingName} />
                </div>
                <div className="flex-1">
                  <ChessBoard
                    fen={fen}
                    onMove={makeMove}
                    selectedSquare={selectedSquare}
                    onSquareClick={handleSquareClick}
                    legalMoves={legalMoves}
                    flipped={!playingAsWhite}
                    isInteractive={!isAIThinking && gameState.status === 'ongoing' && !isReviewMode}
                    isInCheck={isInCheck}
                  />
                </div>
              </div>

              {/* Game Status Overlay */}
              {gameState.status !== 'ongoing' && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-[#262421] rounded-xl p-8 max-w-sm mx-4 border-2 border-[#81b64c]">
                    <div className="text-center space-y-4">
                      <div className="text-5xl">
                        {gameState.status === 'checkmate'
                          ? (gameState.winner === (playingAsWhite ? 'white' : 'black') ? '🏆' : '💔')
                          : '🤝'}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {gameState.status === 'checkmate'
                            ? (gameState.winner === (playingAsWhite ? 'white' : 'black') ? 'Victory!' : 'Defeat')
                            : 'Draw'}
                        </h2>
                        <p className="text-sm text-[#a8a29e]">
                          {gameState.status === 'checkmate' && `${gameState.winner === 'white' ? 'White' : 'Black'} wins by checkmate`}
                          {gameState.status === 'stalemate' && 'Stalemate'}
                          {gameState.status === 'draw_insufficient_material' && 'Insufficient material'}
                          {gameState.status === 'draw_fifty_move' && 'Fifty-move rule'}
                          {gameState.status === 'draw_repetition' && 'Threefold repetition'}
                        </p>
                      </div>
                      <button
                        onClick={resetGame}
                        className="w-full py-3 px-6 bg-[#81b64c] hover:bg-[#6d9940] rounded-lg font-semibold transition-colors"
                      >
                        Play Again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Player Card */}
            <div className="bg-[#262421] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3c3a37] flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <div className="font-semibold text-white">You</div>
                  <div className="text-xs text-[#a8a29e]">Human Player</div>
                </div>
              </div>
              {playingAsWhite && sideToMove === 'white' && gameState.status === 'ongoing' && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-[#a8a29e]">Your turn</div>
                  <div className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Move History & Controls */}
          <div className="space-y-4">
            {/* AI Difficulty Card */}
            <div className="bg-[#262421] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#a8a29e] mb-3">AI Difficulty</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{getDifficultyName(difficulty)}</span>
                  <span className="text-xs text-[#a8a29e]">Level {difficulty}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficulty}
                  onChange={(e) => changeDifficulty(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#3d3a36] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#81b64c]"
                />
                <div className="flex justify-between text-[10px] text-[#6f6c67]">
                  <span>Beginner</span>
                  <span>Master</span>
                </div>
              </div>
            </div>

            {/* Move Navigation */}
            <div className="bg-[#262421] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#a8a29e]">Moves</h3>
                {isReviewMode && (
                  <button
                    onClick={goToLatest}
                    className="text-xs px-2 py-1 bg-[#81b64c] hover:bg-[#6d9940] rounded text-white font-medium transition-colors"
                  >
                    Latest
                  </button>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <button
                  onClick={() => navigateToMove(0)}
                  disabled={currentMoveIndex === 0}
                  className="p-2 bg-[#3d3a36] hover:bg-[#54524f] disabled:bg-[#2a2826] disabled:text-[#54524f] rounded text-white text-xs transition-colors disabled:cursor-not-allowed"
                  title="First move"
                >
                  ⟪
                </button>
                <button
                  onClick={goBackMove}
                  disabled={currentMoveIndex === 0}
                  className="p-2 bg-[#3d3a36] hover:bg-[#54524f] disabled:bg-[#2a2826] disabled:text-[#54524f] rounded text-white text-xs transition-colors disabled:cursor-not-allowed"
                  title="Previous (←)"
                >
                  ‹
                </button>
                <button
                  onClick={goForwardMove}
                  disabled={currentMoveIndex === moveHistory.length - 1}
                  className="p-2 bg-[#3d3a36] hover:bg-[#54524f] disabled:bg-[#2a2826] disabled:text-[#54524f] rounded text-white text-xs transition-colors disabled:cursor-not-allowed"
                  title="Next (→)"
                >
                  ›
                </button>
                <button
                  onClick={goToLatest}
                  disabled={currentMoveIndex === moveHistory.length - 1}
                  className="p-2 bg-[#3d3a36] hover:bg-[#54524f] disabled:bg-[#2a2826] disabled:text-[#54524f] rounded text-white text-xs transition-colors disabled:cursor-not-allowed"
                  title="Last move"
                >
                  ⟫
                </button>
              </div>

              {/* Move List */}
              <div className="bg-[#1a1816] rounded p-3 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm">
                  {moveHistory.length === 1 ? (
                    <div className="col-span-3 text-center text-[#6f6c67] text-xs py-4">
                      No moves yet
                    </div>
                  ) : (
                    moveHistory.slice(1).map((entry, index) => {
                      const realIndex = index + 1;
                      const moveNumber = Math.ceil(realIndex / 2);
                      const isWhiteMove = realIndex % 2 === 1;
                      const isCurrent = realIndex === currentMoveIndex;

                      if (isWhiteMove) {
                        const blackMove = moveHistory[realIndex + 1];
                        return (
                          <div key={realIndex} className="contents">
                            <div className="text-[#6f6c67] text-xs py-1">{moveNumber}.</div>
                            <div
                              onClick={() => navigateToMove(realIndex)}
                              className={`py-1 px-2 rounded cursor-pointer font-mono text-xs ${
                                isCurrent ? 'bg-[#81b64c] text-white font-semibold' : 'hover:bg-[#2a2826] text-[#e4e1dd]'
                              }`}
                            >
                              {entry.san}
                            </div>
                            {blackMove ? (
                              <div
                                onClick={() => navigateToMove(realIndex + 1)}
                                className={`py-1 px-2 rounded cursor-pointer font-mono text-xs ${
                                  currentMoveIndex === realIndex + 1 ? 'bg-[#81b64c] text-white font-semibold' : 'hover:bg-[#2a2826] text-[#e4e1dd]'
                                }`}
                              >
                                {blackMove.san}
                              </div>
                            ) : (
                              <div></div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })
                  )}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-center text-[#6f6c67]">
                Use ← → arrow keys to navigate
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-[#262421] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#a8a29e] mb-3">Game Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#a8a29e]">You are:</span>
                  <span className="text-white font-medium">{playingAsWhite ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a8a29e]">To move:</span>
                  <span className="text-white font-medium">{sideToMove === 'white' ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a8a29e]">Status:</span>
                  <span className={`font-medium ${isInCheck ? 'text-red-400' : 'text-[#81b64c]'}`}>
                    {isInCheck ? 'Check!' : 'Normal'}
                  </span>
                </div>
                {openingName && (
                  <div className="flex justify-between">
                    <span className="text-[#a8a29e]">Opening:</span>
                    <span className="text-white font-medium text-xs text-right max-w-[180px]">{openingName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
