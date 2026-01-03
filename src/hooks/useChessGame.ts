'use client';

import { useState, useCallback, useEffect } from 'react';
import { Engine } from '@/engine';
import type { GameState } from '@/engine';

export interface ChessGameState {
  fen: string;
  gameState: GameState;
  legalMoves: string[];
  selectedSquare: string | null;
  isAIThinking: boolean;
}

export function useChessGame(initialDifficulty: number = 5) {
  const [engine] = useState(() => new Engine());
  const [fen, setFen] = useState(engine.getFEN());
  const [gameState, setGameState] = useState<GameState>(engine.getGameState());
  const [legalMoves, setLegalMoves] = useState<string[]>(engine.getLegalMovesUCI());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [playingAsWhite, setPlayingAsWhite] = useState(true);

  // Update state after any move
  const updateState = useCallback(() => {
    setFen(engine.getFEN());
    setGameState(engine.getGameState());
    setLegalMoves(engine.getLegalMovesUCI());
    setSelectedSquare(null);
  }, [engine]);

  // Make a move
  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    let uci = from + to;
    if (promotion) uci += promotion;

    const success = engine.move(uci);
    if (success) {
      updateState();
      return true;
    }
    return false;
  }, [engine, updateState]);

  // Make AI move
  const makeAIMove = useCallback(async () => {
    if (isAIThinking || gameState.status !== 'ongoing') return;

    setIsAIThinking(true);

    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    const moveUci = engine.makeAIMove(difficulty);

    setIsAIThinking(false);

    if (moveUci) {
      updateState();
      return moveUci;
    }
    return null;
  }, [engine, difficulty, isAIThinking, gameState.status, updateState]);

  // Reset game
  const resetGame = useCallback(() => {
    engine.reset();
    updateState();
  }, [engine, updateState]);

  // Flip board
  const flipBoard = useCallback(() => {
    setPlayingAsWhite(prev => !prev);
  }, []);

  // Change difficulty
  const changeDifficulty = useCallback((newDifficulty: number) => {
    setDifficulty(Math.max(1, Math.min(10, newDifficulty)));
  }, []);

  // Auto-play AI moves if it's AI's turn
  useEffect(() => {
    const isWhiteTurn = engine.getSideToMove() === 'white';
    const isAITurn = playingAsWhite ? !isWhiteTurn : isWhiteTurn;

    if (isAITurn && gameState.status === 'ongoing' && !isAIThinking) {
      makeAIMove();
    }
  }, [fen, playingAsWhite, gameState.status, isAIThinking, makeAIMove, engine]);

  return {
    fen,
    gameState,
    legalMoves,
    selectedSquare,
    setSelectedSquare,
    isAIThinking,
    difficulty,
    playingAsWhite,
    makeMove,
    makeAIMove,
    resetGame,
    flipBoard,
    changeDifficulty,
    sideToMove: engine.getSideToMove(),
    isInCheck: engine.isInCheck(),
  };
}
