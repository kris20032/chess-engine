/**
 * Move Generation Module
 *
 * Generates pseudo-legal moves using bitboards and precomputed attack tables.
 * Pseudo-legal means moves that follow piece movement rules but might leave
 * the king in check - these are filtered later in makeMove.
 */

import { Position } from './position';
import { MoveList, createMove } from './move';
import { MOVE_FLAGS, PIECE_INDEX, CASTLING, Color, SQUARES } from '@/types/chess';
import {
  testBit,
  squareBB,
  getSquares,
  shiftNorth,
  shiftSouth,
  RANK_2,
  RANK_7,
  RANK_4,
  RANK_5,
  RANK_1,
  RANK_8,
  FULL,
} from './bitboard';
import { getKnightAttacks, getKingAttacks, getPawnAttacks } from './attacks';
import { getRookAttacks, getBishopAttacks, getQueenAttacks } from './magic';

/**
 * Generate all pseudo-legal moves for the current position
 */
export function generateMoves(position: Position): MoveList {
  const moves = new MoveList();
  const us = position.sideToMove;
  const isWhite = us === 'white';

  generatePawnMoves(position, moves, isWhite);
  generateKnightMoves(position, moves, isWhite);
  generateBishopMoves(position, moves, isWhite);
  generateRookMoves(position, moves, isWhite);
  generateQueenMoves(position, moves, isWhite);
  generateKingMoves(position, moves, isWhite);

  return moves;
}

/**
 * Generate all pseudo-legal captures (for quiescence search)
 */
export function generateCaptures(position: Position): MoveList {
  const moves = new MoveList();
  const us = position.sideToMove;
  const isWhite = us === 'white';

  generatePawnCaptures(position, moves, isWhite);
  generateKnightCaptures(position, moves, isWhite);
  generateBishopCaptures(position, moves, isWhite);
  generateRookCaptures(position, moves, isWhite);
  generateQueenCaptures(position, moves, isWhite);
  generateKingCaptures(position, moves, isWhite);

  return moves;
}

/**
 * Generate pawn moves
 */
function generatePawnMoves(position: Position, moves: MoveList, isWhite: boolean): void {
  const pawns = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_PAWN]
    : position.bitboards[PIECE_INDEX.BLACK_PAWN];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;
  const empty = ~position.allPieces & FULL; // Mask to 64 bits

  const promotionRank = isWhite ? RANK_8 : RANK_1;
  const startRank = isWhite ? RANK_2 : RANK_7;
  const doublePushRank = isWhite ? RANK_4 : RANK_5;

  // Single pawn push
  const singlePush = isWhite ? shiftNorth(pawns) & empty : shiftSouth(pawns) & empty;

  // Non-promotion pushes
  const nonPromoSingle = singlePush & ~promotionRank;
  for (const to of getSquares(nonPromoSingle)) {
    const from = isWhite ? to - 8 : to + 8;
    moves.push(createMove(from, to, MOVE_FLAGS.QUIET));
  }

  // Promotion pushes
  const promoSingle = singlePush & promotionRank;
  for (const to of getSquares(promoSingle)) {
    const from = isWhite ? to - 8 : to + 8;
    moves.push(createMove(from, to, MOVE_FLAGS.KNIGHT_PROMO));
    moves.push(createMove(from, to, MOVE_FLAGS.BISHOP_PROMO));
    moves.push(createMove(from, to, MOVE_FLAGS.ROOK_PROMO));
    moves.push(createMove(from, to, MOVE_FLAGS.QUEEN_PROMO));
  }

  // Double pawn push
  const eligiblePawns = pawns & startRank;
  const doublePush = isWhite
    ? shiftNorth(shiftNorth(eligiblePawns) & empty) & empty & doublePushRank
    : shiftSouth(shiftSouth(eligiblePawns) & empty) & empty & doublePushRank;

  for (const to of getSquares(doublePush)) {
    const from = isWhite ? to - 16 : to + 16;
    moves.push(createMove(from, to, MOVE_FLAGS.DOUBLE_PAWN_PUSH));
  }

  // Captures
  generatePawnCaptures(position, moves, isWhite);
}

/**
 * Generate pawn captures (including en passant and promotion captures)
 */
function generatePawnCaptures(position: Position, moves: MoveList, isWhite: boolean): void {
  const pawns = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_PAWN]
    : position.bitboards[PIECE_INDEX.BLACK_PAWN];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;
  const promotionRank = isWhite ? RANK_8 : RANK_1;

  for (const from of getSquares(pawns)) {
    const attacks = getPawnAttacks(from, isWhite) & enemies;

    for (const to of getSquares(attacks)) {
      if (testBit(promotionRank, to)) {
        // Promotion captures
        moves.push(createMove(from, to, MOVE_FLAGS.KNIGHT_PROMO_CAPTURE));
        moves.push(createMove(from, to, MOVE_FLAGS.BISHOP_PROMO_CAPTURE));
        moves.push(createMove(from, to, MOVE_FLAGS.ROOK_PROMO_CAPTURE));
        moves.push(createMove(from, to, MOVE_FLAGS.QUEEN_PROMO_CAPTURE));
      } else {
        moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
      }
    }
  }

  // En passant
  if (position.enPassantSquare >= 0) {
    const epSquare = position.enPassantSquare;
    const epBB = squareBB(epSquare);

    for (const from of getSquares(pawns)) {
      if ((getPawnAttacks(from, isWhite) & epBB) !== 0n) {
        moves.push(createMove(from, epSquare, MOVE_FLAGS.EN_PASSANT));
      }
    }
  }
}

/**
 * Generate knight moves
 */
function generateKnightMoves(position: Position, moves: MoveList, isWhite: boolean): void {
  const knights = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_KNIGHT]
    : position.bitboards[PIECE_INDEX.BLACK_KNIGHT];
  const friendly = isWhite ? position.whitePieces : position.blackPieces;
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(knights)) {
    const attacks = getKnightAttacks(from) & ~friendly;

    // Quiet moves
    const quietMoves = attacks & ~position.allPieces;
    for (const to of getSquares(quietMoves)) {
      moves.push(createMove(from, to, MOVE_FLAGS.QUIET));
    }

    // Captures
    const captures = attacks & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate knight captures only
 */
function generateKnightCaptures(position: Position, moves: MoveList, isWhite: boolean): void {
  const knights = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_KNIGHT]
    : position.bitboards[PIECE_INDEX.BLACK_KNIGHT];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(knights)) {
    const captures = getKnightAttacks(from) & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate bishop moves
 */
function generateBishopMoves(position: Position, moves: MoveList, isWhite: boolean): void {
  const bishops = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_BISHOP]
    : position.bitboards[PIECE_INDEX.BLACK_BISHOP];
  const friendly = isWhite ? position.whitePieces : position.blackPieces;
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(bishops)) {
    const attacks = getBishopAttacks(from, position.allPieces) & ~friendly;

    // Quiet moves
    const quietMoves = attacks & ~position.allPieces;
    for (const to of getSquares(quietMoves)) {
      moves.push(createMove(from, to, MOVE_FLAGS.QUIET));
    }

    // Captures
    const captures = attacks & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate bishop captures only
 */
function generateBishopCaptures(position: Position, moves: MoveList, isWhite: boolean): void {
  const bishops = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_BISHOP]
    : position.bitboards[PIECE_INDEX.BLACK_BISHOP];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(bishops)) {
    const captures = getBishopAttacks(from, position.allPieces) & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate rook moves
 */
function generateRookMoves(position: Position, moves: MoveList, isWhite: boolean): void {
  const rooks = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_ROOK]
    : position.bitboards[PIECE_INDEX.BLACK_ROOK];
  const friendly = isWhite ? position.whitePieces : position.blackPieces;
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(rooks)) {
    const attacks = getRookAttacks(from, position.allPieces) & ~friendly;

    // Quiet moves
    const quietMoves = attacks & ~position.allPieces;
    for (const to of getSquares(quietMoves)) {
      moves.push(createMove(from, to, MOVE_FLAGS.QUIET));
    }

    // Captures
    const captures = attacks & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate rook captures only
 */
function generateRookCaptures(position: Position, moves: MoveList, isWhite: boolean): void {
  const rooks = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_ROOK]
    : position.bitboards[PIECE_INDEX.BLACK_ROOK];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(rooks)) {
    const captures = getRookAttacks(from, position.allPieces) & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate queen moves
 */
function generateQueenMoves(position: Position, moves: MoveList, isWhite: boolean): void {
  const queens = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_QUEEN]
    : position.bitboards[PIECE_INDEX.BLACK_QUEEN];
  const friendly = isWhite ? position.whitePieces : position.blackPieces;
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(queens)) {
    const attacks = getQueenAttacks(from, position.allPieces) & ~friendly;

    // Quiet moves
    const quietMoves = attacks & ~position.allPieces;
    for (const to of getSquares(quietMoves)) {
      moves.push(createMove(from, to, MOVE_FLAGS.QUIET));
    }

    // Captures
    const captures = attacks & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate queen captures only
 */
function generateQueenCaptures(position: Position, moves: MoveList, isWhite: boolean): void {
  const queens = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_QUEEN]
    : position.bitboards[PIECE_INDEX.BLACK_QUEEN];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  for (const from of getSquares(queens)) {
    const captures = getQueenAttacks(from, position.allPieces) & enemies;
    for (const to of getSquares(captures)) {
      moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
    }
  }
}

/**
 * Generate king moves (including castling)
 */
function generateKingMoves(position: Position, moves: MoveList, isWhite: boolean): void {
  const king = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_KING]
    : position.bitboards[PIECE_INDEX.BLACK_KING];
  const friendly = isWhite ? position.whitePieces : position.blackPieces;
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  const kingSquares = getSquares(king);
  if (kingSquares.length === 0) return;

  const from = kingSquares[0];
  const attacks = getKingAttacks(from) & ~friendly;

  // Quiet moves
  const quietMoves = attacks & ~position.allPieces;
  for (const to of getSquares(quietMoves)) {
    moves.push(createMove(from, to, MOVE_FLAGS.QUIET));
  }

  // Captures
  const captures = attacks & enemies;
  for (const to of getSquares(captures)) {
    moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
  }

  // Castling
  generateCastlingMoves(position, moves, isWhite, from);
}

/**
 * Generate king captures only
 */
function generateKingCaptures(position: Position, moves: MoveList, isWhite: boolean): void {
  const king = isWhite
    ? position.bitboards[PIECE_INDEX.WHITE_KING]
    : position.bitboards[PIECE_INDEX.BLACK_KING];
  const enemies = isWhite ? position.blackPieces : position.whitePieces;

  const kingSquares = getSquares(king);
  if (kingSquares.length === 0) return;

  const from = kingSquares[0];
  const captures = getKingAttacks(from) & enemies;
  for (const to of getSquares(captures)) {
    moves.push(createMove(from, to, MOVE_FLAGS.CAPTURE));
  }
}

/**
 * Generate castling moves
 * Note: Does not check if king passes through attacked squares (done in isLegal)
 */
function generateCastlingMoves(
  position: Position,
  moves: MoveList,
  isWhite: boolean,
  kingSquare: number
): void {
  // King must be on starting square
  const expectedKingSquare = isWhite ? SQUARES.E1 : SQUARES.E8;
  if (kingSquare !== expectedKingSquare) return;

  // Kingside castling
  const kingsideRight = isWhite ? CASTLING.WHITE_KINGSIDE : CASTLING.BLACK_KINGSIDE;
  if (position.castlingRights & kingsideRight) {
    const f = isWhite ? SQUARES.F1 : SQUARES.F8;
    const g = isWhite ? SQUARES.G1 : SQUARES.G8;

    // Squares between king and rook must be empty
    if (!testBit(position.allPieces, f) && !testBit(position.allPieces, g)) {
      moves.push(createMove(kingSquare, g, MOVE_FLAGS.KING_CASTLE));
    }
  }

  // Queenside castling
  const queensideRight = isWhite ? CASTLING.WHITE_QUEENSIDE : CASTLING.BLACK_QUEENSIDE;
  if (position.castlingRights & queensideRight) {
    const d = isWhite ? SQUARES.D1 : SQUARES.D8;
    const c = isWhite ? SQUARES.C1 : SQUARES.C8;
    const b = isWhite ? SQUARES.B1 : SQUARES.B8;

    // Squares between king and rook must be empty
    if (!testBit(position.allPieces, d) && !testBit(position.allPieces, c) && !testBit(position.allPieces, b)) {
      moves.push(createMove(kingSquare, c, MOVE_FLAGS.QUEEN_CASTLE));
    }
  }
}

/**
 * Check if a square is attacked by a given side
 */
export function isSquareAttacked(position: Position, square: number, byWhite: boolean): boolean {
  // Knight attacks
  const knights = byWhite
    ? position.bitboards[PIECE_INDEX.WHITE_KNIGHT]
    : position.bitboards[PIECE_INDEX.BLACK_KNIGHT];
  if ((getKnightAttacks(square) & knights) !== 0n) return true;

  // King attacks
  const king = byWhite
    ? position.bitboards[PIECE_INDEX.WHITE_KING]
    : position.bitboards[PIECE_INDEX.BLACK_KING];
  if ((getKingAttacks(square) & king) !== 0n) return true;

  // Pawn attacks (reverse direction)
  const pawns = byWhite
    ? position.bitboards[PIECE_INDEX.WHITE_PAWN]
    : position.bitboards[PIECE_INDEX.BLACK_PAWN];
  // If white is attacking, we check black pawn attack pattern from the square
  if ((getPawnAttacks(square, !byWhite) & pawns) !== 0n) return true;

  // Bishop/Queen attacks
  const bishops = byWhite
    ? position.bitboards[PIECE_INDEX.WHITE_BISHOP]
    : position.bitboards[PIECE_INDEX.BLACK_BISHOP];
  const queens = byWhite
    ? position.bitboards[PIECE_INDEX.WHITE_QUEEN]
    : position.bitboards[PIECE_INDEX.BLACK_QUEEN];
  if ((getBishopAttacks(square, position.allPieces) & (bishops | queens)) !== 0n) return true;

  // Rook/Queen attacks
  const rooks = byWhite
    ? position.bitboards[PIECE_INDEX.WHITE_ROOK]
    : position.bitboards[PIECE_INDEX.BLACK_ROOK];
  if ((getRookAttacks(square, position.allPieces) & (rooks | queens)) !== 0n) return true;

  return false;
}

/**
 * Check if the current side's king is in check
 */
export function isInCheck(position: Position): boolean {
  const isWhite = position.sideToMove === 'white';
  const kingSquare = position.kingSquare(position.sideToMove);
  return isSquareAttacked(position, kingSquare, !isWhite);
}

/**
 * Check if the opponent's king is in check (used after making a move)
 */
export function givesCheck(position: Position): boolean {
  const isWhite = position.sideToMove === 'white';
  const opponentKingSquare = position.kingSquare(isWhite ? 'black' : 'white');
  return isSquareAttacked(position, opponentKingSquare, isWhite);
}
