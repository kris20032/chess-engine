/**
 * Chess Engine Tests
 *
 * Comprehensive tests for the chess engine including:
 * - Bitboard operations
 * - FEN parsing
 * - Move generation
 * - Perft testing
 * - Game state detection
 */

import {
  Position,
  Engine,
  perft,
  squareBB,
  testBit,
  setBit,
  clearBit,
  popCount,
  bitScanForward,
  squareToAlgebraic,
  algebraicToSquare,
  getKnightAttacks,
  getKingAttacks,
  getPawnAttacks,
  getRookAttacks,
  getBishopAttacks,
  generateLegalMoves,
  isInCheck,
  getGameState,
  STARTING_FEN,
  SQUARES,
  PIECE_INDEX,
} from '../index';

describe('Bitboard Operations', () => {
  test('squareBB creates correct single-bit bitboard', () => {
    expect(squareBB(0)).toBe(1n);
    expect(squareBB(1)).toBe(2n);
    expect(squareBB(63)).toBe(0x8000000000000000n);
  });

  test('testBit correctly checks bits', () => {
    const bb = 0b1010n;
    expect(testBit(bb, 0)).toBe(false);
    expect(testBit(bb, 1)).toBe(true);
    expect(testBit(bb, 2)).toBe(false);
    expect(testBit(bb, 3)).toBe(true);
  });

  test('setBit sets bits correctly', () => {
    expect(setBit(0n, 0)).toBe(1n);
    expect(setBit(0n, 3)).toBe(8n);
    expect(setBit(1n, 3)).toBe(9n);
  });

  test('clearBit clears bits correctly', () => {
    expect(clearBit(9n, 0)).toBe(8n);
    expect(clearBit(9n, 3)).toBe(1n);
  });

  test('popCount counts bits correctly', () => {
    expect(popCount(0n)).toBe(0);
    expect(popCount(1n)).toBe(1);
    expect(popCount(0xFFn)).toBe(8);
    expect(popCount(0xFFFFFFFFFFFFFFFFn)).toBe(64);
  });

  test('bitScanForward finds LSB correctly', () => {
    expect(bitScanForward(1n)).toBe(0);
    expect(bitScanForward(8n)).toBe(3);
    expect(bitScanForward(0b1010n)).toBe(1);
    expect(bitScanForward(0n)).toBe(-1);
  });

  test('squareToAlgebraic converts correctly', () => {
    expect(squareToAlgebraic(0)).toBe('a1');
    expect(squareToAlgebraic(7)).toBe('h1');
    expect(squareToAlgebraic(56)).toBe('a8');
    expect(squareToAlgebraic(63)).toBe('h8');
    expect(squareToAlgebraic(28)).toBe('e4');
  });

  test('algebraicToSquare converts correctly', () => {
    expect(algebraicToSquare('a1')).toBe(0);
    expect(algebraicToSquare('h1')).toBe(7);
    expect(algebraicToSquare('a8')).toBe(56);
    expect(algebraicToSquare('h8')).toBe(63);
    expect(algebraicToSquare('e4')).toBe(28);
  });
});

describe('Position and FEN', () => {
  test('parses starting position correctly', () => {
    const pos = Position.fromFEN(STARTING_FEN);

    expect(pos.sideToMove).toBe('white');
    expect(pos.castlingRights).toBe(15); // KQkq
    expect(pos.enPassantSquare).toBe(-1);
    expect(pos.halfmoveClock).toBe(0);
    expect(pos.fullmoveNumber).toBe(1);

    // Check piece placement
    expect(popCount(pos.bitboards[PIECE_INDEX.WHITE_PAWN])).toBe(8);
    expect(popCount(pos.bitboards[PIECE_INDEX.BLACK_PAWN])).toBe(8);
    expect(popCount(pos.bitboards[PIECE_INDEX.WHITE_KNIGHT])).toBe(2);
    expect(popCount(pos.bitboards[PIECE_INDEX.BLACK_KNIGHT])).toBe(2);
  });

  test('toFEN generates correct FEN', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(pos.toFEN()).toBe(STARTING_FEN);
  });

  test('parses FEN with en passant', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const pos = Position.fromFEN(fen);

    expect(pos.sideToMove).toBe('black');
    expect(pos.enPassantSquare).toBe(20); // e3
  });

  test('parses FEN with partial castling rights', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Kq - 0 1';
    const pos = Position.fromFEN(fen);

    expect(pos.canCastleKingside('white')).toBe(true);
    expect(pos.canCastleQueenside('white')).toBe(false);
    expect(pos.canCastleKingside('black')).toBe(false);
    expect(pos.canCastleQueenside('black')).toBe(true);
  });
});

describe('Attack Tables', () => {
  test('knight attacks from center', () => {
    // Knight on e4 (square 28)
    const attacks = getKnightAttacks(28);
    expect(popCount(attacks)).toBe(8);
    expect(testBit(attacks, 18)).toBe(true); // c3
    expect(testBit(attacks, 22)).toBe(true); // g3
    expect(testBit(attacks, 34)).toBe(true); // c5
    expect(testBit(attacks, 38)).toBe(true); // g5
    expect(testBit(attacks, 11)).toBe(true); // d2
    expect(testBit(attacks, 13)).toBe(true); // f2
    expect(testBit(attacks, 43)).toBe(true); // d6
    expect(testBit(attacks, 45)).toBe(true); // f6
  });

  test('knight attacks from corner', () => {
    // Knight on a1 (square 0)
    const attacks = getKnightAttacks(0);
    expect(popCount(attacks)).toBe(2);
    expect(testBit(attacks, 10)).toBe(true); // c2
    expect(testBit(attacks, 17)).toBe(true); // b3
  });

  test('king attacks from center', () => {
    // King on e4 (square 28)
    const attacks = getKingAttacks(28);
    expect(popCount(attacks)).toBe(8);
  });

  test('king attacks from corner', () => {
    // King on a1 (square 0)
    const attacks = getKingAttacks(0);
    expect(popCount(attacks)).toBe(3);
  });

  test('white pawn attacks', () => {
    // Pawn on e4 (square 28)
    const attacks = getPawnAttacks(28, true);
    expect(popCount(attacks)).toBe(2);
    expect(testBit(attacks, 35)).toBe(true); // d5
    expect(testBit(attacks, 37)).toBe(true); // f5
  });

  test('black pawn attacks', () => {
    // Pawn on e5 (square 36)
    const attacks = getPawnAttacks(36, false);
    expect(popCount(attacks)).toBe(2);
    expect(testBit(attacks, 27)).toBe(true); // d4
    expect(testBit(attacks, 29)).toBe(true); // f4
  });

  test('rook attacks on empty board', () => {
    // Rook on e4 (square 28)
    const attacks = getRookAttacks(28, 0n);
    expect(popCount(attacks)).toBe(14); // 7 horizontal + 7 vertical
  });

  test('rook attacks with blockers', () => {
    // Rook on e4 with piece on e6
    const blockers = squareBB(44); // e6
    const attacks = getRookAttacks(28, blockers);
    expect(testBit(attacks, 44)).toBe(true); // Can capture blocker
    expect(testBit(attacks, 52)).toBe(false); // Blocked beyond
  });

  test('bishop attacks on empty board', () => {
    // Bishop on e4 (square 28)
    const attacks = getBishopAttacks(28, 0n);
    expect(popCount(attacks)).toBe(13);
  });
});

describe('Move Generation', () => {
  test('starting position has 20 legal moves', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    const moves = generateLegalMoves(pos);
    expect(moves.length).toBe(20);
  });

  test('castling is generated when legal', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
    const pos = Position.fromFEN(fen);
    const moves = generateLegalMoves(pos);

    // Should include both castling moves
    const engine = new Engine(fen);
    const uciMoves = engine.getLegalMovesUCI();
    expect(uciMoves).toContain('e1g1'); // Kingside
    expect(uciMoves).toContain('e1c1'); // Queenside
  });

  test('cannot castle through check', () => {
    // Rook attacks f1
    const fen = 'r3k2r/pppppppp/8/8/8/5r2/PPPPPPPP/R3K2R w KQkq - 0 1';
    const pos = Position.fromFEN(fen);

    const engine = new Engine(fen);
    const uciMoves = engine.getLegalMovesUCI();
    expect(uciMoves).not.toContain('e1g1'); // Blocked kingside
  });

  test('en passant is generated correctly', () => {
    // After 1.e4 d5 2.e5 f5
    const fen = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
    const engine = new Engine(fen);
    const uciMoves = engine.getLegalMovesUCI();
    expect(uciMoves).toContain('e5f6'); // En passant capture
  });

  test('promotion generates all piece types', () => {
    const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    const engine = new Engine(fen);
    const uciMoves = engine.getLegalMovesUCI();

    expect(uciMoves).toContain('a7a8q');
    expect(uciMoves).toContain('a7a8r');
    expect(uciMoves).toContain('a7a8b');
    expect(uciMoves).toContain('a7a8n');
  });
});

describe('Check Detection', () => {
  test('detects rook check on open file', () => {
    // Black king on e8 is in check from white rook on e1
    const fen = '4k3/8/8/8/8/8/8/4R2K b - - 0 1';
    const pos = Position.fromFEN(fen);
    expect(isInCheck(pos)).toBe(true);
  });

  test('detects queen check on open diagonal', () => {
    // Black king on e8 in check from queen on h5 (open diagonal)
    const fen = '4k3/8/8/7Q/8/8/8/4K3 b - - 0 1';
    const pos = Position.fromFEN(fen);
    expect(isInCheck(pos)).toBe(true);
  });

  test('detects knight check', () => {
    // Black king on e8 in check from knight on f6
    const fen = '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1';
    const pos = Position.fromFEN(fen);
    expect(isInCheck(pos)).toBe(true);
  });

  test('no check in starting position', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(isInCheck(pos)).toBe(false);
  });
});

describe('Game State', () => {
  test('detects checkmate', () => {
    // Fool's mate
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
    const pos = Position.fromFEN(fen);
    const state = getGameState(pos);

    expect(state.status).toBe('checkmate');
    expect(state.winner).toBe('black');
  });

  test('detects stalemate', () => {
    const fen = 'k7/8/1K6/8/8/8/8/8 b - - 0 1';
    const pos = Position.fromFEN(fen);
    const state = getGameState(pos);

    expect(state.status).toBe('stalemate');
    expect(state.winner).toBe(null);
  });

  test('detects insufficient material (K vs K)', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const pos = Position.fromFEN(fen);
    const state = getGameState(pos);

    expect(state.status).toBe('draw_insufficient_material');
  });

  test('detects insufficient material (K+B vs K)', () => {
    const fen = '4k3/8/8/8/8/8/8/4KB2 w - - 0 1';
    const pos = Position.fromFEN(fen);
    const state = getGameState(pos);

    expect(state.status).toBe('draw_insufficient_material');
  });

  test('game is ongoing in starting position', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    const state = getGameState(pos);

    expect(state.status).toBe('ongoing');
  });
});

describe('Perft Tests', () => {
  test('starting position depth 1', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(perft(pos, 1)).toBe(20);
  });

  test('starting position depth 2', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(perft(pos, 2)).toBe(400);
  });

  test('starting position depth 3', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(perft(pos, 3)).toBe(8902);
  });

  test('starting position depth 4', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(perft(pos, 4)).toBe(197281);
  });

  test('kiwipete depth 1', () => {
    const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
    const pos = Position.fromFEN(fen);
    expect(perft(pos, 1)).toBe(48);
  });

  test('kiwipete depth 2', () => {
    const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
    const pos = Position.fromFEN(fen);
    expect(perft(pos, 2)).toBe(2039);
  });

  test('kiwipete depth 3', () => {
    const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
    const pos = Position.fromFEN(fen);
    expect(perft(pos, 3)).toBe(97862);
  });
});

describe('Engine Class', () => {
  test('initializes with starting position', () => {
    const engine = new Engine();
    expect(engine.getFEN()).toBe(STARTING_FEN);
  });

  test('can make moves', () => {
    const engine = new Engine();
    expect(engine.move('e2e4')).toBe(true);
    expect(engine.getSideToMove()).toBe('black');
  });

  test('rejects illegal moves', () => {
    const engine = new Engine();
    expect(engine.move('e2e5')).toBe(false); // Too far
    expect(engine.move('e1e2')).toBe(false); // Blocked
    expect(engine.move('a1a8')).toBe(false); // Blocked
  });

  test('clone creates independent copy', () => {
    const engine = new Engine();
    engine.move('e2e4');

    const clone = engine.clone();
    clone.move('e7e5');

    // Original should still be at move 1
    expect(engine.getFEN()).not.toBe(clone.getFEN());
  });

  test('reset returns to starting position', () => {
    const engine = new Engine();
    engine.move('e2e4');
    engine.move('e7e5');
    engine.reset();

    expect(engine.getFEN()).toBe(STARTING_FEN);
  });
});
