/**
 * Move Module
 *
 * 16-bit move encoding:
 * Bits 0-5:   From square (0-63)
 * Bits 6-11:  To square (0-63)
 * Bits 12-15: Flags (move type)
 */

import { Move, MOVE_FLAGS } from '@/types/chess';
import { squareToAlgebraic, algebraicToSquare } from './bitboard';

// Bit masks for move extraction
const FROM_MASK = 0x3F;        // 6 bits
const TO_MASK = 0xFC0;         // 6 bits shifted
const FLAG_MASK = 0xF000;      // 4 bits shifted

/**
 * Create a move from components
 */
export function createMove(from: number, to: number, flags: number = MOVE_FLAGS.QUIET): Move {
  return from | (to << 6) | (flags << 12);
}

/**
 * Extract the from square from a move
 */
export function getFromSquare(move: Move): number {
  return move & FROM_MASK;
}

/**
 * Extract the to square from a move
 */
export function getToSquare(move: Move): number {
  return (move & TO_MASK) >> 6;
}

/**
 * Extract the flags from a move
 */
export function getMoveFlags(move: Move): number {
  return (move & FLAG_MASK) >> 12;
}

/**
 * Check if move is a capture
 */
export function isCapture(move: Move): boolean {
  const flags = getMoveFlags(move);
  return (flags & 0x4) !== 0; // Bit 2 indicates capture
}

/**
 * Check if move is a promotion
 */
export function isPromotion(move: Move): boolean {
  const flags = getMoveFlags(move);
  return (flags & 0x8) !== 0; // Bit 3 indicates promotion
}

/**
 * Get promotion piece type (knight=0, bishop=1, rook=2, queen=3)
 */
export function getPromotionPiece(move: Move): number {
  const flags = getMoveFlags(move);
  return flags & 0x3; // Bottom 2 bits when promotion flag is set
}

/**
 * Check if move is en passant
 */
export function isEnPassant(move: Move): boolean {
  return getMoveFlags(move) === MOVE_FLAGS.EN_PASSANT;
}

/**
 * Check if move is castling
 */
export function isCastling(move: Move): boolean {
  const flags = getMoveFlags(move);
  return flags === MOVE_FLAGS.KING_CASTLE || flags === MOVE_FLAGS.QUEEN_CASTLE;
}

/**
 * Check if move is kingside castling
 */
export function isKingsideCastle(move: Move): boolean {
  return getMoveFlags(move) === MOVE_FLAGS.KING_CASTLE;
}

/**
 * Check if move is queenside castling
 */
export function isQueensideCastle(move: Move): boolean {
  return getMoveFlags(move) === MOVE_FLAGS.QUEEN_CASTLE;
}

/**
 * Check if move is a double pawn push
 */
export function isDoublePawnPush(move: Move): boolean {
  return getMoveFlags(move) === MOVE_FLAGS.DOUBLE_PAWN_PUSH;
}

/**
 * Convert move to UCI notation (e.g., "e2e4", "e7e8q")
 */
export function moveToUCI(move: Move): string {
  const from = squareToAlgebraic(getFromSquare(move));
  const to = squareToAlgebraic(getToSquare(move));

  if (isPromotion(move)) {
    const pieceChars = ['n', 'b', 'r', 'q'];
    return from + to + pieceChars[getPromotionPiece(move)];
  }

  return from + to;
}

/**
 * Parse UCI notation to move components
 * Returns { from, to, promotion } or null if invalid
 */
export function parseUCI(uci: string): { from: number; to: number; promotion: string | null } | null {
  if (uci.length < 4 || uci.length > 5) return null;

  const from = algebraicToSquare(uci.substring(0, 2));
  const to = algebraicToSquare(uci.substring(2, 4));
  const promotion = uci.length === 5 ? uci[4] : null;

  if (from < 0 || from > 63 || to < 0 || to > 63) return null;

  return { from, to, promotion };
}

/**
 * Convert move to SAN notation (e.g., "e4", "Nf3", "O-O")
 * Note: This requires position context for disambiguation
 */
export function moveToSAN(
  move: Move,
  pieceType: string,
  isCheck: boolean,
  isCheckmate: boolean,
  disambiguation: string = ''
): string {
  const flags = getMoveFlags(move);
  const to = squareToAlgebraic(getToSquare(move));
  const from = squareToAlgebraic(getFromSquare(move));

  // Castling
  if (flags === MOVE_FLAGS.KING_CASTLE) {
    return isCheckmate ? 'O-O#' : isCheck ? 'O-O+' : 'O-O';
  }
  if (flags === MOVE_FLAGS.QUEEN_CASTLE) {
    return isCheckmate ? 'O-O-O#' : isCheck ? 'O-O-O+' : 'O-O-O';
  }

  let san = '';

  // Pawn moves
  if (pieceType === 'pawn') {
    if (isCapture(move)) {
      san = from[0] + 'x' + to;
    } else {
      san = to;
    }
    if (isPromotion(move)) {
      const pieceChars = ['N', 'B', 'R', 'Q'];
      san += '=' + pieceChars[getPromotionPiece(move)];
    }
  } else {
    // Piece moves
    const pieceChar = pieceType[0].toUpperCase();
    san = pieceChar === 'K' ? 'K' : pieceChar; // Knight uses N
    if (pieceType === 'knight') san = 'N';

    san += disambiguation;

    if (isCapture(move)) {
      san += 'x';
    }
    san += to;
  }

  if (isCheckmate) {
    san += '#';
  } else if (isCheck) {
    san += '+';
  }

  return san;
}

/**
 * Move list with static allocation for performance
 */
export class MoveList {
  moves: Move[];
  count: number;

  constructor(capacity: number = 256) {
    this.moves = new Array(capacity);
    this.count = 0;
  }

  push(move: Move): void {
    this.moves[this.count++] = move;
  }

  clear(): void {
    this.count = 0;
  }

  get(index: number): Move {
    return this.moves[index];
  }

  [Symbol.iterator](): Iterator<Move> {
    let index = 0;
    const moves = this.moves;
    const count = this.count;
    return {
      next(): IteratorResult<Move> {
        if (index < count) {
          return { value: moves[index++], done: false };
        }
        return { value: undefined as unknown as Move, done: true };
      },
    };
  }

  toArray(): Move[] {
    return this.moves.slice(0, this.count);
  }
}

/**
 * Create a null move (used in null move pruning)
 */
export const NULL_MOVE: Move = 0;

/**
 * Check if move is null
 */
export function isNullMove(move: Move): boolean {
  return move === NULL_MOVE;
}
