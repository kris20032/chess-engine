/**
 * Make/Unmake Move Module
 *
 * Handles applying and reverting moves on the position.
 * Maintains all game state including castling rights, en passant,
 * and Zobrist hash for efficient undo.
 */

import { Position, PositionState } from './position';
import {
  getFromSquare,
  getToSquare,
  getMoveFlags,
  isCapture,
  isPromotion,
  getPromotionPiece,
  isEnPassant,
  isKingsideCastle,
  isQueensideCastle,
  isDoublePawnPush,
} from './move';
import { MOVE_FLAGS, PIECE_INDEX, CASTLING, Move, SQUARES } from '@/types/chess';
import { squareBB, testBit, setBit, clearBit, rankOf } from './bitboard';
import { isSquareAttacked } from './movegen';
import {
  computeZobristHash,
  hashMovePiece,
  hashAddPiece,
  hashRemovePiece,
  hashSideToMove,
  hashCastling,
  hashEnPassant,
} from './zobrist';

/**
 * Make a move on the position
 * Returns true if the move was legal, false if it left the king in check
 */
export function makeMove(position: Position, move: Move): boolean {
  const from = getFromSquare(move);
  const to = getToSquare(move);
  const flags = getMoveFlags(move);
  const isWhite = position.sideToMove === 'white';

  // Save state for unmake
  const state: PositionState = {
    castlingRights: position.castlingRights,
    enPassantSquare: position.enPassantSquare,
    halfmoveClock: position.halfmoveClock,
    capturedPiece: -1,
    zobristHash: position.zobristHash,
  };

  // Find the moving piece
  const movingPiece = position.pieceAt(from);
  if (movingPiece === -1) {
    return false; // No piece at from square
  }

  let newHash = position.zobristHash;

  // Handle captures
  if (isCapture(move) && !isEnPassant(move)) {
    const capturedPiece = position.pieceAt(to);
    if (capturedPiece !== -1) {
      state.capturedPiece = capturedPiece;
      position.removePiece(capturedPiece, to);
      newHash = hashRemovePiece(newHash, capturedPiece, to);
    }
  }

  // Handle en passant capture
  if (isEnPassant(move)) {
    const capturedSquare = isWhite ? to - 8 : to + 8;
    const capturedPawn = isWhite ? PIECE_INDEX.BLACK_PAWN : PIECE_INDEX.WHITE_PAWN;
    state.capturedPiece = capturedPawn;
    position.removePiece(capturedPawn, capturedSquare);
    newHash = hashRemovePiece(newHash, capturedPawn, capturedSquare);
  }

  // Move the piece
  if (isPromotion(move)) {
    // Remove pawn and add promoted piece
    position.removePiece(movingPiece, from);
    newHash = hashRemovePiece(newHash, movingPiece, from);

    const promoPieceType = getPromotionPiece(move); // 0=N, 1=B, 2=R, 3=Q
    const promoPiece = isWhite
      ? PIECE_INDEX.WHITE_KNIGHT + promoPieceType
      : PIECE_INDEX.BLACK_KNIGHT + promoPieceType;
    position.addPiece(promoPiece, to);
    newHash = hashAddPiece(newHash, promoPiece, to);
  } else {
    position.movePiece(movingPiece, from, to);
    newHash = hashMovePiece(newHash, movingPiece, from, to);
  }

  // Handle castling
  if (isKingsideCastle(move)) {
    const rookFrom = isWhite ? SQUARES.H1 : SQUARES.H8;
    const rookTo = isWhite ? SQUARES.F1 : SQUARES.F8;
    const rook = isWhite ? PIECE_INDEX.WHITE_ROOK : PIECE_INDEX.BLACK_ROOK;
    position.movePiece(rook, rookFrom, rookTo);
    newHash = hashMovePiece(newHash, rook, rookFrom, rookTo);
  } else if (isQueensideCastle(move)) {
    const rookFrom = isWhite ? SQUARES.A1 : SQUARES.A8;
    const rookTo = isWhite ? SQUARES.D1 : SQUARES.D8;
    const rook = isWhite ? PIECE_INDEX.WHITE_ROOK : PIECE_INDEX.BLACK_ROOK;
    position.movePiece(rook, rookFrom, rookTo);
    newHash = hashMovePiece(newHash, rook, rookFrom, rookTo);
  }

  // Update castling rights
  const oldCastling = position.castlingRights;
  position.castlingRights = updateCastlingRights(position.castlingRights, from, to);
  newHash = hashCastling(newHash, oldCastling, position.castlingRights);

  // Update en passant square
  const oldEp = position.enPassantSquare;
  if (isDoublePawnPush(move)) {
    position.enPassantSquare = isWhite ? to - 8 : to + 8;
  } else {
    position.enPassantSquare = -1;
  }
  newHash = hashEnPassant(newHash, oldEp, position.enPassantSquare);

  // Update halfmove clock
  const isPawn = movingPiece === PIECE_INDEX.WHITE_PAWN || movingPiece === PIECE_INDEX.BLACK_PAWN;
  if (isPawn || isCapture(move)) {
    position.halfmoveClock = 0;
  } else {
    position.halfmoveClock++;
  }

  // Update fullmove number
  if (!isWhite) {
    position.fullmoveNumber++;
  }

  // Switch side to move
  position.sideToMove = isWhite ? 'black' : 'white';
  newHash = hashSideToMove(newHash);

  position.zobristHash = newHash;

  // Store state for unmake
  position.stateHistory.push(state);

  // Store position in history for repetition detection
  position.positionHistory.push(newHash);

  // Check if move is legal (king not in check)
  const kingSquare = position.kingSquare(isWhite ? 'white' : 'black');
  if (isSquareAttacked(position, kingSquare, !isWhite)) {
    // Illegal move - undo
    unmakeMove(position, move);
    return false;
  }

  // Additional castling legality: check if king passed through attacked square
  if (isKingsideCastle(move) || isQueensideCastle(move)) {
    // Check the square the king passed through
    const throughSquare = isKingsideCastle(move)
      ? (isWhite ? SQUARES.F1 : SQUARES.F8)
      : (isWhite ? SQUARES.D1 : SQUARES.D8);

    // Also check original square (can't castle out of check)
    if (
      isSquareAttacked(position, from, !isWhite) ||
      isSquareAttacked(position, throughSquare, !isWhite)
    ) {
      unmakeMove(position, move);
      return false;
    }
  }

  return true;
}

/**
 * Unmake a move (revert to previous position)
 */
export function unmakeMove(position: Position, move: Move): void {
  const state = position.stateHistory.pop();
  if (!state) {
    throw new Error('No state to unmake');
  }

  // Remove from position history
  position.positionHistory.pop();

  const from = getFromSquare(move);
  const to = getToSquare(move);
  const wasWhite = position.sideToMove === 'black'; // Opposite of current side

  // Find the piece that moved (now at 'to' square, or promoted piece)
  const pieceAtTo = position.pieceAt(to);

  // Switch side back
  position.sideToMove = wasWhite ? 'white' : 'black';

  // Restore state
  position.castlingRights = state.castlingRights;
  position.enPassantSquare = state.enPassantSquare;
  position.halfmoveClock = state.halfmoveClock;
  position.zobristHash = state.zobristHash;

  // Update fullmove number
  if (!wasWhite) {
    position.fullmoveNumber--;
  }

  // Handle promotion - need to restore pawn
  if (isPromotion(move)) {
    position.removePiece(pieceAtTo, to);
    const pawn = wasWhite ? PIECE_INDEX.WHITE_PAWN : PIECE_INDEX.BLACK_PAWN;
    position.addPiece(pawn, from);
  } else {
    // Move piece back
    position.movePiece(pieceAtTo, to, from);
  }

  // Handle castling - move rook back
  if (isKingsideCastle(move)) {
    const rookFrom = wasWhite ? SQUARES.H1 : SQUARES.H8;
    const rookTo = wasWhite ? SQUARES.F1 : SQUARES.F8;
    const rook = wasWhite ? PIECE_INDEX.WHITE_ROOK : PIECE_INDEX.BLACK_ROOK;
    position.movePiece(rook, rookTo, rookFrom);
  } else if (isQueensideCastle(move)) {
    const rookFrom = wasWhite ? SQUARES.A1 : SQUARES.A8;
    const rookTo = wasWhite ? SQUARES.D1 : SQUARES.D8;
    const rook = wasWhite ? PIECE_INDEX.WHITE_ROOK : PIECE_INDEX.BLACK_ROOK;
    position.movePiece(rook, rookTo, rookFrom);
  }

  // Restore captured piece
  if (state.capturedPiece !== -1) {
    if (isEnPassant(move)) {
      const capturedSquare = wasWhite ? to - 8 : to + 8;
      position.addPiece(state.capturedPiece, capturedSquare);
    } else {
      position.addPiece(state.capturedPiece, to);
    }
  }

  position.updateAggregateBitboards();
}

/**
 * Update castling rights based on move
 */
function updateCastlingRights(rights: number, from: number, to: number): number {
  // If king moves, lose all castling rights for that side
  if (from === SQUARES.E1) {
    rights &= ~(CASTLING.WHITE_KINGSIDE | CASTLING.WHITE_QUEENSIDE);
  }
  if (from === SQUARES.E8) {
    rights &= ~(CASTLING.BLACK_KINGSIDE | CASTLING.BLACK_QUEENSIDE);
  }

  // If rook moves or is captured, lose that side's castling right
  if (from === SQUARES.A1 || to === SQUARES.A1) {
    rights &= ~CASTLING.WHITE_QUEENSIDE;
  }
  if (from === SQUARES.H1 || to === SQUARES.H1) {
    rights &= ~CASTLING.WHITE_KINGSIDE;
  }
  if (from === SQUARES.A8 || to === SQUARES.A8) {
    rights &= ~CASTLING.BLACK_QUEENSIDE;
  }
  if (from === SQUARES.H8 || to === SQUARES.H8) {
    rights &= ~CASTLING.BLACK_KINGSIDE;
  }

  return rights;
}

/**
 * Generate all legal moves (filters out moves that leave king in check)
 */
export function generateLegalMoves(position: Position): Move[] {
  // Import here to avoid circular dependency
  const { generateMoves } = require('./movegen');

  const pseudoLegal = generateMoves(position);
  const legal: Move[] = [];

  for (let i = 0; i < pseudoLegal.count; i++) {
    const move = pseudoLegal.get(i);
    if (makeMove(position, move)) {
      legal.push(move);
      unmakeMove(position, move);
    }
  }

  return legal;
}
