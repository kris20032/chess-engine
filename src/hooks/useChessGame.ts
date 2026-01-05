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

export interface MoveHistoryEntry {
  fen: string;
  move: string | null; // UCI move that led to this position (null for starting position)
  san: string | null; // SAN notation for display
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
  const [evaluation, setEvaluation] = useState(() => engine.getEvaluation());
  const [openingName, setOpeningName] = useState<string | null>(() => engine.getOpeningName());

  // Move history for navigation
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([
    { fen: engine.getFEN(), move: null, san: null }
  ]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Update state after any move
  const updateState = useCallback(() => {
    setFen(engine.getFEN());
    setGameState(engine.getGameState());
    setLegalMoves(engine.getLegalMovesUCI());
    setSelectedSquare(null);
    setEvaluation(engine.getEvaluation());
    setOpeningName(engine.getOpeningName());
  }, [engine]);

  // Navigate to a specific move in history
  const navigateToMove = useCallback((index: number) => {
    if (index < 0 || index >= moveHistory.length) return;

    const targetPosition = moveHistory[index];
    engine.setPosition(targetPosition.fen);
    setCurrentMoveIndex(index);
    setIsReviewMode(index < moveHistory.length - 1);
    updateState();
  }, [moveHistory, engine, updateState]);

  // Go back one move
  const goBackMove = useCallback(() => {
    if (currentMoveIndex > 0) {
      navigateToMove(currentMoveIndex - 1);
    }
  }, [currentMoveIndex, navigateToMove]);

  // Go forward one move
  const goForwardMove = useCallback(() => {
    if (currentMoveIndex < moveHistory.length - 1) {
      navigateToMove(currentMoveIndex + 1);
    }
  }, [currentMoveIndex, moveHistory.length, navigateToMove]);

  // Go to latest position
  const goToLatest = useCallback(() => {
    navigateToMove(moveHistory.length - 1);
    setIsReviewMode(false);
  }, [moveHistory.length, navigateToMove]);

  // Make a move
  const makeMove = useCallback((from: string, to: string, promotion?: string) => {
    // If in review mode, go to latest position first
    if (isReviewMode) {
      goToLatest();
      return false; // Don't make the move in review mode
    }

    let uci = from + to;
    if (promotion) uci += promotion;

    const success = engine.move(uci);
    if (success) {
      // Add to history (truncate if we were reviewing and made a new move)
      const newHistory = moveHistory.slice(0, currentMoveIndex + 1);
      newHistory.push({
        fen: engine.getFEN(),
        move: uci,
        san: uci, // For now, use UCI as display notation
      });
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);
      updateState();
      return true;
    }
    return false;
  }, [engine, updateState, moveHistory, currentMoveIndex, isReviewMode, goToLatest]);

  // Make AI move
  const makeAIMove = useCallback(async () => {
    if (isAIThinking || gameState.status !== 'ongoing' || isReviewMode) return;

    setIsAIThinking(true);

    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    const moveUci = engine.makeAIMove(difficulty);

    setIsAIThinking(false);

    if (moveUci) {
      // Add AI move to history
      setMoveHistory(prev => [
        ...prev,
        {
          fen: engine.getFEN(),
          move: moveUci,
          san: moveUci,
        }
      ]);
      setCurrentMoveIndex(prev => prev + 1);
      updateState();
      return moveUci;
    }
    return null;
  }, [engine, difficulty, isAIThinking, gameState.status, updateState, isReviewMode]);

  // Reset game
  const resetGame = useCallback(() => {
    engine.reset();
    setMoveHistory([{ fen: engine.getFEN(), move: null, san: null }]);
    setCurrentMoveIndex(0);
    setIsReviewMode(false);
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

    if (isAITurn && gameState.status === 'ongoing' && !isAIThinking && !isReviewMode) {
      makeAIMove();
    }
  }, [fen, playingAsWhite, gameState.status, isAIThinking, makeAIMove, engine, isReviewMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBackMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goForwardMove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBackMove, goForwardMove]);

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
  };
}
