import { useState, useEffect, useCallback } from 'react';
import { Engine } from '@/engine';
import { getSocket } from './useSocket';

interface GameState {
  status: string;
  winner: string | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

export function useMultiplayerGame(gameId: string, playerColor: 'white' | 'black') {
  const [engine] = useState(() => new Engine());
  const [fen, setFen] = useState(engine.getFEN());
  const [gameState, setGameState] = useState<GameState>({
    status: 'ongoing',
    winner: null,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
  });
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveCount, setMoveCount] = useState(0);

  const socket = getSocket();

  // Update game state based on engine
  const updateState = useCallback(() => {
    const newFen = engine.getFEN();
    setFen(newFen);

    const gameState = engine.getGameState();
    const isInCheck = engine.isInCheck();

    setGameState({
      status: gameState.status,
      winner: gameState.winner,
      isCheck: isInCheck,
      isCheckmate: gameState.status === 'checkmate',
      isStalemate: gameState.status === 'stalemate',
      isDraw: gameState.status.startsWith('draw_'),
    });
  }, [engine]);

  // Initialize socket listeners
  useEffect(() => {
    if (!socket) return;

    // Join the game room
    socket.emit('join_game', gameId);

    // Listen for game state updates
    socket.on('game_state', (game: any) => {
      console.log('Received game state:', game);
      if (game.fen) {
        engine.setPosition(game.fen);
        updateState();
        setMoveCount(game.moves?.length || 0);
      }
    });

    // Listen for opponent moves
    socket.on('move_made', (data: any) => {
      console.log('Opponent made move:', data);
      if (data.fen) {
        engine.setPosition(data.fen);
        updateState();
        setMoveCount((prev) => prev + 1);
      }
    });

    // Listen for game end
    socket.on('game_ended', (data: any) => {
      console.log('Game ended:', data);
      setGameState((prev) => ({
        ...prev,
        status: data.status,
      }));
    });

    return () => {
      socket.emit('leave_game', gameId);
      socket.off('game_state');
      socket.off('move_made');
      socket.off('game_ended');
    };
  }, [gameId, socket, engine, updateState]);

  const handleSquareClick = useCallback((square: string) => {
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    setSelectedSquare(square);
    const moves = engine.getLegalMovesUCI();
    const movesFromSquare = moves.filter((m: string) => m.startsWith(square));
    setLegalMoves(movesFromSquare);
  }, [selectedSquare, engine]);

  const makeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    // Check if it's this player's turn
    const isWhiteTurn = engine.getSideToMove() === 'white';
    const isPlayerTurn = (isWhiteTurn && playerColor === 'white') || (!isWhiteTurn && playerColor === 'black');

    if (!isPlayerTurn) {
      console.log('Not your turn!');
      return false;
    }

    let uci = from + to;
    if (promotion) uci += promotion;

    const success = engine.move(uci);

    if (success && socket) {
      const newFen = engine.getFEN();
      updateState();

      // Emit move to server
      socket.emit('make_move', {
        gameId,
        from,
        to,
        promotion,
        uci,
        fen: newFen,
        moveNum: moveCount + 1,
      });

      setMoveCount((prev) => prev + 1);
      setSelectedSquare(null);
      setLegalMoves([]);

      // Check for game end
      const gameStateCheck = engine.getGameState();
      if (gameStateCheck.status !== 'ongoing') {
        socket.emit('end_game', {
          gameId,
          status: 'completed',
          result: gameStateCheck.status === 'checkmate'
            ? (gameStateCheck.winner === 'white' ? 'white_win' : 'black_win')
            : 'draw',
        });
      }
    }

    return success;
  }, [engine, socket, gameId, playerColor, moveCount, updateState]);

  const sideToMove = engine.getSideToMove();
  const isInCheck = engine.isInCheck();
  const isMyTurn = (sideToMove === 'white' && playerColor === 'white') ||
                   (sideToMove === 'black' && playerColor === 'black');

  return {
    fen,
    gameState,
    selectedSquare,
    setSelectedSquare: handleSquareClick,
    legalMoves,
    makeMove,
    sideToMove,
    isInCheck,
    isMyTurn,
  };
}
