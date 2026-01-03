/**
 * Game State Detection Module
 *
 * Detects check, checkmate, stalemate, and various draw conditions.
 */

import { Position } from './position';
import { generateLegalMoves } from './makemove';
import { isInCheck } from './movegen';
import { PIECE_INDEX } from '@/types/chess';
import { popCount } from './bitboard';

export type GameStatus =
  | 'ongoing'
  | 'checkmate'
  | 'stalemate'
  | 'draw_fifty_move'
  | 'draw_repetition'
  | 'draw_insufficient_material';

export interface GameState {
  status: GameStatus;
  winner: 'white' | 'black' | null;
  inCheck: boolean;
}

/**
 * Get the current game state
 */
export function getGameState(position: Position): GameState {
  const inCheck = isInCheck(position);
  const legalMoves = generateLegalMoves(position);

  // No legal moves
  if (legalMoves.length === 0) {
    if (inCheck) {
      // Checkmate - current player loses
      return {
        status: 'checkmate',
        winner: position.sideToMove === 'white' ? 'black' : 'white',
        inCheck: true,
      };
    } else {
      // Stalemate
      return {
        status: 'stalemate',
        winner: null,
        inCheck: false,
      };
    }
  }

  // 50-move rule
  if (position.halfmoveClock >= 100) {
    return {
      status: 'draw_fifty_move',
      winner: null,
      inCheck,
    };
  }

  // Threefold repetition
  if (isThreefoldRepetition(position)) {
    return {
      status: 'draw_repetition',
      winner: null,
      inCheck,
    };
  }

  // Insufficient material
  if (isInsufficientMaterial(position)) {
    return {
      status: 'draw_insufficient_material',
      winner: null,
      inCheck,
    };
  }

  // Game continues
  return {
    status: 'ongoing',
    winner: null,
    inCheck,
  };
}

/**
 * Check for threefold repetition
 */
export function isThreefoldRepetition(position: Position): boolean {
  const currentHash = position.zobristHash;
  let count = 0;

  for (const hash of position.positionHistory) {
    if (hash === currentHash) {
      count++;
      if (count >= 3) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check for insufficient material
 *
 * Insufficient material occurs when neither side can checkmate:
 * - King vs King
 * - King + Bishop vs King
 * - King + Knight vs King
 * - King + Bishop vs King + Bishop (same colored bishops)
 */
export function isInsufficientMaterial(position: Position): boolean {
  // Count pieces
  const whitePawns = popCount(position.bitboards[PIECE_INDEX.WHITE_PAWN]);
  const blackPawns = popCount(position.bitboards[PIECE_INDEX.BLACK_PAWN]);
  const whiteKnights = popCount(position.bitboards[PIECE_INDEX.WHITE_KNIGHT]);
  const blackKnights = popCount(position.bitboards[PIECE_INDEX.BLACK_KNIGHT]);
  const whiteBishops = popCount(position.bitboards[PIECE_INDEX.WHITE_BISHOP]);
  const blackBishops = popCount(position.bitboards[PIECE_INDEX.BLACK_BISHOP]);
  const whiteRooks = popCount(position.bitboards[PIECE_INDEX.WHITE_ROOK]);
  const blackRooks = popCount(position.bitboards[PIECE_INDEX.BLACK_ROOK]);
  const whiteQueens = popCount(position.bitboards[PIECE_INDEX.WHITE_QUEEN]);
  const blackQueens = popCount(position.bitboards[PIECE_INDEX.BLACK_QUEEN]);

  // Any pawns, rooks, or queens = sufficient material
  if (whitePawns > 0 || blackPawns > 0) return false;
  if (whiteRooks > 0 || blackRooks > 0) return false;
  if (whiteQueens > 0 || blackQueens > 0) return false;

  const whiteMinor = whiteKnights + whiteBishops;
  const blackMinor = blackKnights + blackBishops;

  // King vs King
  if (whiteMinor === 0 && blackMinor === 0) {
    return true;
  }

  // King + minor vs King
  if (whiteMinor === 0 && blackMinor === 1) return true;
  if (whiteMinor === 1 && blackMinor === 0) return true;

  // King + Bishop vs King + Bishop (same color)
  if (
    whiteMinor === 1 &&
    blackMinor === 1 &&
    whiteBishops === 1 &&
    blackBishops === 1
  ) {
    // Check if bishops are on same colored squares
    const whiteBishopBB = position.bitboards[PIECE_INDEX.WHITE_BISHOP];
    const blackBishopBB = position.bitboards[PIECE_INDEX.BLACK_BISHOP];

    // Light squares mask: squares where (file + rank) is even
    const lightSquares = 0x55AA55AA55AA55AAn;

    const whiteOnLight = (whiteBishopBB & lightSquares) !== 0n;
    const blackOnLight = (blackBishopBB & lightSquares) !== 0n;

    if (whiteOnLight === blackOnLight) {
      return true; // Same colored bishops
    }
  }

  // Two knights vs King (technically can't force mate, but not a draw by rule)
  // We'll be conservative and not call this insufficient

  return false;
}

/**
 * Check if the current position is a draw
 */
export function isDraw(position: Position): boolean {
  const state = getGameState(position);
  return (
    state.status === 'stalemate' ||
    state.status === 'draw_fifty_move' ||
    state.status === 'draw_repetition' ||
    state.status === 'draw_insufficient_material'
  );
}

/**
 * Check if the game is over
 */
export function isGameOver(position: Position): boolean {
  const state = getGameState(position);
  return state.status !== 'ongoing';
}

/**
 * Can claim draw by 50-move rule (at 100 halfmoves)
 */
export function canClaimFiftyMoveDraw(position: Position): boolean {
  return position.halfmoveClock >= 100;
}

/**
 * Can claim draw by threefold repetition
 */
export function canClaimRepetitionDraw(position: Position): boolean {
  return isThreefoldRepetition(position);
}

/**
 * Get a human-readable status string
 */
export function getStatusString(position: Position): string {
  const state = getGameState(position);

  switch (state.status) {
    case 'checkmate':
      return `Checkmate! ${state.winner === 'white' ? 'White' : 'Black'} wins.`;
    case 'stalemate':
      return 'Stalemate! The game is a draw.';
    case 'draw_fifty_move':
      return 'Draw by fifty-move rule.';
    case 'draw_repetition':
      return 'Draw by threefold repetition.';
    case 'draw_insufficient_material':
      return 'Draw by insufficient material.';
    case 'ongoing':
      if (state.inCheck) {
        return `${position.sideToMove === 'white' ? 'White' : 'Black'} is in check.`;
      }
      return `${position.sideToMove === 'white' ? 'White' : 'Black'} to move.`;
  }
}
