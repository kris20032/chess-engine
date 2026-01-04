/**
 * Chess Engine
 *
 * A professional-grade chess engine using bitboard representation
 * with magic bitboards for sliding pieces.
 *
 * Features:
 * - 12 bitboard position representation
 * - Magic bitboards for O(1) sliding piece attacks
 * - Precomputed attack tables for knights, kings, pawns
 * - Zobrist hashing for transposition tables
 * - Full move generation with 16-bit move encoding
 * - Legal move filtering
 * - Game state detection (check, checkmate, stalemate, draws)
 * - Perft testing for verification
 */

// Core types
export * from '@/types/chess';

// Bitboard operations
export {
  squareBB,
  testBit,
  setBit,
  clearBit,
  popCount,
  bitScanForward,
  squareToAlgebraic,
  algebraicToSquare,
  printBitboard,
  getSquares,
  fileOf,
  rankOf,
  makeSquare,
} from './bitboard';

// Position
export { Position, pieceIndexToChar, charToPieceIndex } from './position';

// Attack tables
export {
  getKnightAttacks,
  getKingAttacks,
  getPawnAttacks,
  initializeAttackTables,
} from './attacks';

// Magic bitboards
export {
  getRookAttacks,
  getBishopAttacks,
  getQueenAttacks,
  initializeMagicBitboards,
} from './magic';

// Move encoding
export {
  createMove,
  getFromSquare,
  getToSquare,
  getMoveFlags,
  isCapture,
  isPromotion,
  getPromotionPiece,
  isEnPassant,
  isCastling,
  isKingsideCastle,
  isQueensideCastle,
  isDoublePawnPush,
  moveToUCI,
  parseUCI,
  moveToSAN,
  MoveList,
  NULL_MOVE,
  isNullMove,
} from './move';

// Move generation
export {
  generateMoves,
  generateCaptures,
  isSquareAttacked,
  isInCheck,
  givesCheck,
} from './movegen';

// Make/unmake moves
export { makeMove, unmakeMove, generateLegalMoves } from './makemove';

// Zobrist hashing
export {
  computeZobristHash,
  hashMovePiece,
  hashAddPiece,
  hashRemovePiece,
  hashSideToMove,
  hashCastling,
  hashEnPassant,
  initializeZobrist,
  ZOBRIST_PIECES,
  ZOBRIST_SIDE,
  ZOBRIST_CASTLING,
  ZOBRIST_EN_PASSANT,
} from './zobrist';

// Game state
export {
  getGameState,
  isThreefoldRepetition,
  isInsufficientMaterial,
  isDraw,
  isGameOver,
  canClaimFiftyMoveDraw,
  canClaimRepetitionDraw,
  getStatusString,
} from './gamestate';
export type { GameStatus, GameState } from './gamestate';

// Perft testing
export {
  perft,
  perftDivide,
  runPerftTest,
  runAllPerftTests,
  printPerftResults,
  PERFT_POSITIONS,
} from './perft';

// Evaluation
export { evaluate, evaluateRelative } from './evaluation';

// Search
export {
  searchPosition,
  getBestMove,
  getBestMoveWithTime,
} from './search';
export type { SearchStats } from './search';

// Transposition table
export { TranspositionTable, TTEntryType, globalTT } from './transposition';

/**
 * Chess Engine class for convenient usage
 */
import { Position } from './position';
import { generateLegalMoves, makeMove } from './makemove';
import { getGameState, isGameOver } from './gamestate';
import { moveToUCI, parseUCI } from './move';
import { generateMoves, isInCheck } from './movegen';
import { STARTING_FEN, Move } from '@/types/chess';
import { getBestMove, searchPosition } from './search';
import type { SearchStats } from './search';
import { evaluate } from './evaluation';
import { getOpeningName } from './openingbook';

export class Engine {
  private position: Position;

  constructor(fen: string = STARTING_FEN) {
    this.position = Position.fromFEN(fen);
  }

  /**
   * Get the current position
   */
  getPosition(): Position {
    return this.position;
  }

  /**
   * Set position from FEN
   */
  setPosition(fen: string): void {
    this.position = Position.fromFEN(fen);
  }

  /**
   * Get current FEN
   */
  getFEN(): string {
    return this.position.toFEN();
  }

  /**
   * Get all legal moves
   */
  getLegalMoves(): Move[] {
    return generateLegalMoves(this.position);
  }

  /**
   * Get legal moves in UCI format
   */
  getLegalMovesUCI(): string[] {
    return this.getLegalMoves().map(moveToUCI);
  }

  /**
   * Make a move (UCI format)
   * Returns true if legal
   */
  move(uci: string): boolean {
    const parsed = parseUCI(uci);
    if (!parsed) return false;

    // Find the matching legal move
    const legalMoves = generateMoves(this.position);
    for (let i = 0; i < legalMoves.count; i++) {
      const move = legalMoves.get(i);
      if (moveToUCI(move) === uci) {
        return makeMove(this.position, move);
      }
    }

    return false;
  }

  /**
   * Make a move from square indices
   */
  moveFromSquares(from: number, to: number, promotion?: string): boolean {
    let uci = `${String.fromCharCode(97 + (from % 8))}${Math.floor(from / 8) + 1}`;
    uci += `${String.fromCharCode(97 + (to % 8))}${Math.floor(to / 8) + 1}`;
    if (promotion) uci += promotion;
    return this.move(uci);
  }

  /**
   * Undo the last move
   */
  undo(): boolean {
    // Can't undo without stored move
    // This would require storing move history
    return false;
  }

  /**
   * Get game state
   */
  getGameState() {
    return getGameState(this.position);
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return isGameOver(this.position);
  }

  /**
   * Check if current side is in check
   */
  isInCheck(): boolean {
    return isInCheck(this.position);
  }

  /**
   * Get side to move
   */
  getSideToMove(): 'white' | 'black' {
    return this.position.sideToMove;
  }

  /**
   * Reset to starting position
   */
  reset(): void {
    this.position = Position.startingPosition();
  }

  /**
   * Clone the engine state
   */
  clone(): Engine {
    const engine = new Engine();
    engine.position = this.position.clone();
    return engine;
  }

  /**
   * Get best move at given depth (AI move)
   */
  getBestMove(depth: number): Move | null {
    return getBestMove(this.position, depth);
  }

  /**
   * Get best move with time limit (AI move)
   */
  getBestMoveWithTime(timeMs: number): Move | null {
    return getBestMove(this.position, Math.max(1, Math.floor(timeMs / 1000)));
  }

  /**
   * Search position and return statistics
   */
  search(depth: number, timeLimit?: number): SearchStats {
    return searchPosition(this.position, depth, timeLimit);
  }

  /**
   * Get AI move for difficulty level
   * @param difficulty - 1 (easiest) to 10 (hardest)
   */
  getAIMove(difficulty: number = 5): Move | null {
    // Map difficulty to search depth
    // 1-2: depth 1-2 (beginner)
    // 3-4: depth 3-4 (intermediate)
    // 5-6: depth 5-6 (advanced)
    // 7-8: depth 7-8 (expert)
    // 9-10: depth 9-10 (master)
    const depth = Math.max(1, Math.min(10, difficulty));
    return this.getBestMove(depth);
  }

  /**
   * Make AI move at given difficulty
   * Returns the move made (UCI format) or null if no legal moves
   */
  makeAIMove(difficulty: number = 5): string | null {
    const move = this.getAIMove(difficulty);
    if (!move) return null;

    const uci = moveToUCI(move);
    if (makeMove(this.position, move)) {
      return uci;
    }
    return null;
  }

  /**
   * Get position evaluation score
   * Returns score in centipawns from white's perspective
   * Positive = white is better, negative = black is better
   */
  getEvaluation(): number {
    return evaluate(this.position);
  }

  /**
   * Get opening name for current position
   * Returns the opening name if position is in book, null otherwise
   */
  getOpeningName(): string | null {
    return getOpeningName(this.position);
  }
}
