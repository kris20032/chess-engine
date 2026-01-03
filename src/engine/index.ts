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
  GameStatus,
  GameState,
} from './gamestate';

// Perft testing
export {
  perft,
  perftDivide,
  runPerftTest,
  runAllPerftTests,
  printPerftResults,
  PERFT_POSITIONS,
} from './perft';

/**
 * Chess Engine class for convenient usage
 */
import { Position } from './position';
import { generateLegalMoves, makeMove, unmakeMove } from './makemove';
import { getGameState, isGameOver } from './gamestate';
import { moveToUCI, parseUCI, createMove, MoveList } from './move';
import { generateMoves, isInCheck } from './movegen';
import { STARTING_FEN, Move, MOVE_FLAGS } from '@/types/chess';

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
}
