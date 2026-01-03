/**
 * Evaluation Module
 *
 * Evaluates chess positions using material and positional factors.
 * Returns scores from white's perspective (positive = white advantage).
 */

import { Position } from './position';
import { PIECE_INDEX } from '@/types/chess';
import { getSquares, rankOf, fileOf } from './bitboard';

// Material values in centipawns
export const PIECE_VALUES = {
  PAWN: 100,
  KNIGHT: 320,
  BISHOP: 330,
  ROOK: 500,
  QUEEN: 900,
  KING: 20000,
};

// Piece-square tables (from white's perspective, rank 0 = rank 1)
// Values are in centipawns, bonuses for good squares

const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_GAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

const KING_END_GAME_TABLE = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

/**
 * Mirror square index for black pieces (flip vertically)
 */
function mirrorSquare(square: number): number {
  const rank = rankOf(square);
  const file = fileOf(square);
  return (7 - rank) * 8 + file;
}

/**
 * Get piece-square table value for a piece at a square
 */
function getPieceSquareValue(pieceIndex: number, square: number, isEndgame: boolean): number {
  const isWhite = pieceIndex < 6;
  const pieceType = pieceIndex % 6;

  // Use square as-is for white, mirrored for black
  const sq = isWhite ? square : mirrorSquare(square);

  switch (pieceType) {
    case 0: return PAWN_TABLE[sq];
    case 1: return KNIGHT_TABLE[sq];
    case 2: return BISHOP_TABLE[sq];
    case 3: return ROOK_TABLE[sq];
    case 4: return QUEEN_TABLE[sq];
    case 5: return isEndgame ? KING_END_GAME_TABLE[sq] : KING_MIDDLE_GAME_TABLE[sq];
    default: return 0;
  }
}

/**
 * Determine if position is in endgame phase
 * Simple heuristic: endgame if queens are off or very little material
 */
function isEndgame(position: Position): boolean {
  const whiteQueens = position.bitboards[PIECE_INDEX.WHITE_QUEEN];
  const blackQueens = position.bitboards[PIECE_INDEX.BLACK_QUEEN];

  // No queens = endgame
  if (whiteQueens === 0n && blackQueens === 0n) {
    return true;
  }

  // Count total non-pawn, non-king material
  let material = 0;
  for (let i = 1; i < 5; i++) { // Knights, Bishops, Rooks, Queens
    material += getSquares(position.bitboards[i]).length;
    material += getSquares(position.bitboards[i + 6]).length;
  }

  // Endgame if total pieces (excluding pawns and kings) <= 6
  return material <= 6;
}

/**
 * Evaluate position from white's perspective
 * Positive score = white is better, negative = black is better
 */
export function evaluate(position: Position): number {
  let score = 0;
  const endgame = isEndgame(position);

  // Material and positional evaluation
  const pieceValues = [
    PIECE_VALUES.PAWN,
    PIECE_VALUES.KNIGHT,
    PIECE_VALUES.BISHOP,
    PIECE_VALUES.ROOK,
    PIECE_VALUES.QUEEN,
    PIECE_VALUES.KING,
  ];

  // Evaluate white pieces
  for (let i = 0; i < 6; i++) {
    const squares = getSquares(position.bitboards[i]);
    for (const sq of squares) {
      score += pieceValues[i];
      score += getPieceSquareValue(i, sq, endgame);
    }
  }

  // Evaluate black pieces
  for (let i = 6; i < 12; i++) {
    const squares = getSquares(position.bitboards[i]);
    for (const sq of squares) {
      score -= pieceValues[i - 6];
      score -= getPieceSquareValue(i, sq, endgame);
    }
  }

  return score;
}

/**
 * Evaluate position from current side to move perspective
 * Used in negamax search
 */
export function evaluateRelative(position: Position): number {
  const score = evaluate(position);
  return position.sideToMove === 'white' ? score : -score;
}
