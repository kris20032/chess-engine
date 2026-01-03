/**
 * Debug test for check detection
 */

import {
  Position,
  isSquareAttacked,
  getBishopAttacks,
  getRookAttacks,
  squareBB,
  printBitboard,
  PIECE_INDEX,
  isInCheck,
  popCount,
  testBit,
  generateLegalMoves,
  moveToUCI,
} from '../index';

describe('Debug Promotion', () => {
  test('pawn promotion moves', () => {
    const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    const pos = Position.fromFEN(fen);

    console.log('Position:');
    console.log('White pawn BB:');
    console.log(printBitboard(pos.bitboards[PIECE_INDEX.WHITE_PAWN]));
    console.log('All pieces:');
    console.log(printBitboard(pos.allPieces));

    // Debug pawn move generation
    const { shiftNorth, RANK_8, FULL } = require('../bitboard');
    const { generateMoves } = require('../movegen');
    const { makeMove, unmakeMove } = require('../makemove');
    const { createMove, MOVE_FLAGS, getFromSquare, getToSquare } = require('../move');

    const pawns = pos.bitboards[PIECE_INDEX.WHITE_PAWN];
    const empty = ~pos.allPieces & FULL; // Mask to 64 bits!
    console.log('Empty squares:');
    console.log(printBitboard(empty));

    const singlePush = shiftNorth(pawns) & empty;
    console.log('Single push targets:');
    console.log(printBitboard(singlePush));

    const promoSingle = singlePush & RANK_8;
    console.log('Promotion push targets:');
    console.log(printBitboard(promoSingle));

    // Generate pseudo-legal moves
    const pseudoLegal = generateMoves(pos);
    console.log('Pseudo-legal move count:', pseudoLegal.count);

    // Try to make the promotion move manually
    // a7=48, a8=56
    const promoMove = createMove(48, 56, 11); // QUEEN_PROMO = 11
    console.log('Manually created promo move from:', getFromSquare(promoMove), 'to:', getToSquare(promoMove));

    const posClone = pos.clone();
    console.log('Before makeMove - White pawn:');
    console.log(printBitboard(posClone.bitboards[PIECE_INDEX.WHITE_PAWN]));

    const result = makeMove(posClone, promoMove);
    console.log('makeMove result:', result);

    if (result) {
      console.log('After makeMove - White pawn:');
      console.log(printBitboard(posClone.bitboards[PIECE_INDEX.WHITE_PAWN]));
      console.log('After makeMove - White queen:');
      console.log(printBitboard(posClone.bitboards[PIECE_INDEX.WHITE_QUEEN]));
    }

    const moves = generateLegalMoves(pos);
    console.log('Legal moves:', moves.map(moveToUCI));

    // Should have 4 promotion moves for the pawn
    const promoMoves = moves.map(moveToUCI).filter((m: string) => m.startsWith('a7a8'));
    console.log('Promotion moves:', promoMoves);

    expect(promoMoves).toContain('a7a8q');
  });
});
