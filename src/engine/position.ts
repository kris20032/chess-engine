/**
 * Position Module
 *
 * Represents a chess position using 12 bitboards (one for each piece type/color).
 * Includes all state needed for legal move generation and game rules.
 */

import {
  squareBB,
  setBit,
  clearBit,
  testBit,
  EMPTY,
  fileOf,
  rankOf,
  makeSquare,
} from './bitboard';
import { PIECE_INDEX, CASTLING, Color, Square, STARTING_FEN } from '@/types/chess';

/**
 * Position state for make/unmake move
 */
export interface PositionState {
  castlingRights: number;
  enPassantSquare: number;
  halfmoveClock: number;
  capturedPiece: number; // -1 if no capture, otherwise PIECE_INDEX
  zobristHash: bigint;
}

/**
 * Chess position represented with bitboards
 */
export class Position {
  // 12 piece bitboards
  bitboards: bigint[];

  // Aggregate bitboards (computed from piece bitboards)
  whitePieces: bigint;
  blackPieces: bigint;
  allPieces: bigint;

  // Game state
  sideToMove: Color;
  castlingRights: number; // 4 bits: KQkq
  enPassantSquare: number; // 0-63 or -1 if none
  halfmoveClock: number; // For 50-move rule
  fullmoveNumber: number;

  // Zobrist hash for transposition table
  zobristHash: bigint;

  // History for unmake move
  stateHistory: PositionState[];

  // Position history for repetition detection (zobrist hashes)
  positionHistory: bigint[];

  constructor() {
    // Initialize empty bitboards
    this.bitboards = new Array(12).fill(0n);
    this.whitePieces = 0n;
    this.blackPieces = 0n;
    this.allPieces = 0n;

    this.sideToMove = 'white';
    this.castlingRights = 0;
    this.enPassantSquare = -1;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.zobristHash = 0n;

    this.stateHistory = [];
    this.positionHistory = [];
  }

  /**
   * Update aggregate bitboards from piece bitboards
   */
  updateAggregateBitboards(): void {
    this.whitePieces =
      this.bitboards[PIECE_INDEX.WHITE_PAWN] |
      this.bitboards[PIECE_INDEX.WHITE_KNIGHT] |
      this.bitboards[PIECE_INDEX.WHITE_BISHOP] |
      this.bitboards[PIECE_INDEX.WHITE_ROOK] |
      this.bitboards[PIECE_INDEX.WHITE_QUEEN] |
      this.bitboards[PIECE_INDEX.WHITE_KING];

    this.blackPieces =
      this.bitboards[PIECE_INDEX.BLACK_PAWN] |
      this.bitboards[PIECE_INDEX.BLACK_KNIGHT] |
      this.bitboards[PIECE_INDEX.BLACK_BISHOP] |
      this.bitboards[PIECE_INDEX.BLACK_ROOK] |
      this.bitboards[PIECE_INDEX.BLACK_QUEEN] |
      this.bitboards[PIECE_INDEX.BLACK_KING];

    this.allPieces = this.whitePieces | this.blackPieces;
  }

  /**
   * Get the piece at a square
   * Returns -1 if empty, otherwise PIECE_INDEX value
   */
  pieceAt(square: Square): number {
    const bb = squareBB(square);
    for (let piece = 0; piece < 12; piece++) {
      if ((this.bitboards[piece] & bb) !== 0n) {
        return piece;
      }
    }
    return -1;
  }

  /**
   * Check if a square is empty
   */
  isEmpty(square: Square): boolean {
    return !testBit(this.allPieces, square);
  }

  /**
   * Check if a square has a piece of the given color
   */
  hasColorAt(square: Square, color: Color): boolean {
    const bb = color === 'white' ? this.whitePieces : this.blackPieces;
    return testBit(bb, square);
  }

  /**
   * Add a piece to the position
   */
  addPiece(piece: number, square: Square): void {
    this.bitboards[piece] = setBit(this.bitboards[piece], square);
    this.updateAggregateBitboards();
  }

  /**
   * Remove a piece from the position
   */
  removePiece(piece: number, square: Square): void {
    this.bitboards[piece] = clearBit(this.bitboards[piece], square);
    this.updateAggregateBitboards();
  }

  /**
   * Move a piece from one square to another
   */
  movePiece(piece: number, from: Square, to: Square): void {
    this.bitboards[piece] = clearBit(this.bitboards[piece], from);
    this.bitboards[piece] = setBit(this.bitboards[piece], to);
    this.updateAggregateBitboards();
  }

  /**
   * Get the king square for a color
   */
  kingSquare(color: Color): Square {
    const kingBB =
      color === 'white'
        ? this.bitboards[PIECE_INDEX.WHITE_KING]
        : this.bitboards[PIECE_INDEX.BLACK_KING];

    // Find the set bit
    for (let sq = 0; sq < 64; sq++) {
      if (testBit(kingBB, sq)) return sq;
    }
    return -1; // Should never happen in valid position
  }

  /**
   * Check if a color can castle kingside
   */
  canCastleKingside(color: Color): boolean {
    const flag =
      color === 'white' ? CASTLING.WHITE_KINGSIDE : CASTLING.BLACK_KINGSIDE;
    return (this.castlingRights & flag) !== 0;
  }

  /**
   * Check if a color can castle queenside
   */
  canCastleQueenside(color: Color): boolean {
    const flag =
      color === 'white' ? CASTLING.WHITE_QUEENSIDE : CASTLING.BLACK_QUEENSIDE;
    return (this.castlingRights & flag) !== 0;
  }

  /**
   * Get the opposite color
   */
  static oppositeColor(color: Color): Color {
    return color === 'white' ? 'black' : 'white';
  }

  /**
   * Clone the position
   */
  clone(): Position {
    const pos = new Position();
    pos.bitboards = [...this.bitboards];
    pos.whitePieces = this.whitePieces;
    pos.blackPieces = this.blackPieces;
    pos.allPieces = this.allPieces;
    pos.sideToMove = this.sideToMove;
    pos.castlingRights = this.castlingRights;
    pos.enPassantSquare = this.enPassantSquare;
    pos.halfmoveClock = this.halfmoveClock;
    pos.fullmoveNumber = this.fullmoveNumber;
    pos.zobristHash = this.zobristHash;
    pos.stateHistory = [...this.stateHistory];
    pos.positionHistory = [...this.positionHistory];
    return pos;
  }

  /**
   * Create position from FEN string
   */
  static fromFEN(fen: string): Position {
    const pos = new Position();
    const parts = fen.trim().split(/\s+/);

    if (parts.length < 4) {
      throw new Error('Invalid FEN: not enough parts');
    }

    // Parse piece placement
    const rows = parts[0].split('/');
    if (rows.length !== 8) {
      throw new Error('Invalid FEN: piece placement must have 8 rows');
    }

    for (let rank = 7; rank >= 0; rank--) {
      const row = rows[7 - rank];
      let file = 0;

      for (const char of row) {
        if (file > 7) break;

        if (char >= '1' && char <= '8') {
          file += parseInt(char);
        } else {
          const square = makeSquare(file, rank);
          const pieceIndex = charToPieceIndex(char);
          if (pieceIndex >= 0) {
            pos.bitboards[pieceIndex] = setBit(pos.bitboards[pieceIndex], square);
          }
          file++;
        }
      }
    }

    // Parse side to move
    pos.sideToMove = parts[1] === 'w' ? 'white' : 'black';

    // Parse castling rights
    pos.castlingRights = 0;
    if (parts[2] !== '-') {
      for (const char of parts[2]) {
        switch (char) {
          case 'K':
            pos.castlingRights |= CASTLING.WHITE_KINGSIDE;
            break;
          case 'Q':
            pos.castlingRights |= CASTLING.WHITE_QUEENSIDE;
            break;
          case 'k':
            pos.castlingRights |= CASTLING.BLACK_KINGSIDE;
            break;
          case 'q':
            pos.castlingRights |= CASTLING.BLACK_QUEENSIDE;
            break;
        }
      }
    }

    // Parse en passant square
    if (parts[3] === '-') {
      pos.enPassantSquare = -1;
    } else {
      const file = parts[3].charCodeAt(0) - 97;
      const rank = parseInt(parts[3][1]) - 1;
      pos.enPassantSquare = makeSquare(file, rank);
    }

    // Parse halfmove clock (optional)
    pos.halfmoveClock = parts.length > 4 ? parseInt(parts[4]) : 0;

    // Parse fullmove number (optional)
    pos.fullmoveNumber = parts.length > 5 ? parseInt(parts[5]) : 1;

    pos.updateAggregateBitboards();

    return pos;
  }

  /**
   * Convert position to FEN string
   */
  toFEN(): string {
    const parts: string[] = [];

    // Piece placement
    const rows: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let row = '';
      let empty = 0;

      for (let file = 0; file < 8; file++) {
        const square = makeSquare(file, rank);
        const piece = this.pieceAt(square);

        if (piece === -1) {
          empty++;
        } else {
          if (empty > 0) {
            row += empty.toString();
            empty = 0;
          }
          row += pieceIndexToChar(piece);
        }
      }

      if (empty > 0) {
        row += empty.toString();
      }
      rows.push(row);
    }
    parts.push(rows.join('/'));

    // Side to move
    parts.push(this.sideToMove === 'white' ? 'w' : 'b');

    // Castling rights
    let castling = '';
    if (this.castlingRights & CASTLING.WHITE_KINGSIDE) castling += 'K';
    if (this.castlingRights & CASTLING.WHITE_QUEENSIDE) castling += 'Q';
    if (this.castlingRights & CASTLING.BLACK_KINGSIDE) castling += 'k';
    if (this.castlingRights & CASTLING.BLACK_QUEENSIDE) castling += 'q';
    parts.push(castling || '-');

    // En passant
    if (this.enPassantSquare === -1) {
      parts.push('-');
    } else {
      const file = String.fromCharCode(97 + fileOf(this.enPassantSquare));
      const rank = rankOf(this.enPassantSquare) + 1;
      parts.push(`${file}${rank}`);
    }

    // Halfmove clock
    parts.push(this.halfmoveClock.toString());

    // Fullmove number
    parts.push(this.fullmoveNumber.toString());

    return parts.join(' ');
  }

  /**
   * Create starting position
   */
  static startingPosition(): Position {
    return Position.fromFEN(STARTING_FEN);
  }
}

/**
 * Convert FEN character to piece index
 */
function charToPieceIndex(char: string): number {
  switch (char) {
    case 'P':
      return PIECE_INDEX.WHITE_PAWN;
    case 'N':
      return PIECE_INDEX.WHITE_KNIGHT;
    case 'B':
      return PIECE_INDEX.WHITE_BISHOP;
    case 'R':
      return PIECE_INDEX.WHITE_ROOK;
    case 'Q':
      return PIECE_INDEX.WHITE_QUEEN;
    case 'K':
      return PIECE_INDEX.WHITE_KING;
    case 'p':
      return PIECE_INDEX.BLACK_PAWN;
    case 'n':
      return PIECE_INDEX.BLACK_KNIGHT;
    case 'b':
      return PIECE_INDEX.BLACK_BISHOP;
    case 'r':
      return PIECE_INDEX.BLACK_ROOK;
    case 'q':
      return PIECE_INDEX.BLACK_QUEEN;
    case 'k':
      return PIECE_INDEX.BLACK_KING;
    default:
      return -1;
  }
}

/**
 * Convert piece index to FEN character
 */
function pieceIndexToChar(piece: number): string {
  switch (piece) {
    case PIECE_INDEX.WHITE_PAWN:
      return 'P';
    case PIECE_INDEX.WHITE_KNIGHT:
      return 'N';
    case PIECE_INDEX.WHITE_BISHOP:
      return 'B';
    case PIECE_INDEX.WHITE_ROOK:
      return 'R';
    case PIECE_INDEX.WHITE_QUEEN:
      return 'Q';
    case PIECE_INDEX.WHITE_KING:
      return 'K';
    case PIECE_INDEX.BLACK_PAWN:
      return 'p';
    case PIECE_INDEX.BLACK_KNIGHT:
      return 'n';
    case PIECE_INDEX.BLACK_BISHOP:
      return 'b';
    case PIECE_INDEX.BLACK_ROOK:
      return 'r';
    case PIECE_INDEX.BLACK_QUEEN:
      return 'q';
    case PIECE_INDEX.BLACK_KING:
      return 'k';
    default:
      return '?';
  }
}

export { pieceIndexToChar, charToPieceIndex };
