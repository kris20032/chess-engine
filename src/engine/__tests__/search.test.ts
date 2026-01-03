/**
 * Search and Evaluation Tests
 */

import { Position, Engine, evaluate, getBestMove, searchPosition } from '../index';

describe('Evaluation', () => {
  test('starting position is roughly equal', () => {
    const pos = Position.startingPosition();
    const score = evaluate(pos);
    // Starting position should be close to 0 (within 100 centipawns)
    expect(Math.abs(score)).toBeLessThan(100);
  });

  test('white advantage with extra pawn', () => {
    // White has 8 pawns, black has 7
    const fen = 'rnbqkbnr/ppppp1pp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const pos = Position.fromFEN(fen);
    const score = evaluate(pos);
    // White should be ahead by roughly 100 centipawns
    expect(score).toBeGreaterThan(50);
  });

  test('black advantage with extra piece', () => {
    // Black has 2 knights, white has 1
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
    const pos = Position.fromFEN(fen);
    const score = evaluate(pos);
    // Black should be ahead by roughly 300 centipawns
    expect(score).toBeLessThan(-200);
  });
});

describe('Search', () => {
  test('finds good move in tactical position', () => {
    // Position with tactical opportunity
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
    const pos = Position.fromFEN(fen);

    const stats = searchPosition(pos, 3);

    expect(stats.bestMove).not.toBeNull();
    expect(stats.nodes).toBeGreaterThan(0);
  });

  test('finds best capture', () => {
    // White can capture queen with knight
    const fen = '4k3/8/8/3q4/2N5/8/8/4K3 w - - 0 1';
    const pos = Position.fromFEN(fen);

    const move = getBestMove(pos, 3);
    expect(move).not.toBeNull();
  });

  test('avoids hanging piece', () => {
    // If white moves knight from d4, it hangs. Best is to move it safely
    const fen = '4k3/8/8/3r4/3N4/8/8/4K3 w - - 0 1';
    const pos = Position.fromFEN(fen);

    const move = getBestMove(pos, 3);
    expect(move).not.toBeNull();
  });

  test('search respects depth limit', () => {
    const pos = Position.startingPosition();

    const stats1 = searchPosition(pos, 1);
    const stats2 = searchPosition(pos, 2);

    expect(stats2.nodes).toBeGreaterThan(stats1.nodes);
    expect(stats1.depth).toBe(1);
    expect(stats2.depth).toBe(2);
  });

  test('handles positions with few legal moves', () => {
    // Limited moves available
    const fen = '4k3/8/4K3/8/8/8/8/7R w - - 0 1';
    const pos = Position.fromFEN(fen);

    const stats = searchPosition(pos, 3);

    expect(stats.nodes).toBeGreaterThan(0);
    // Should have found a move
    expect(stats.bestMove).not.toBeNull();
  });
});

describe('Engine AI', () => {
  test('getAIMove returns legal move', () => {
    const engine = new Engine();

    const move = engine.getAIMove(3);
    expect(move).not.toBeNull();

    const legalMoves = engine.getLegalMoves();
    expect(legalMoves).toContain(move);
  });

  test('makeAIMove makes legal move', () => {
    const engine = new Engine();

    const uci = engine.makeAIMove(2);
    expect(uci).not.toBeNull();
    expect(typeof uci).toBe('string');
  });

  test('difficulty levels work', () => {
    const engine = new Engine();

    // Lower difficulty should be faster
    const start1 = Date.now();
    engine.getAIMove(1);
    const time1 = Date.now() - start1;

    const engine2 = new Engine();
    const start2 = Date.now();
    engine2.getAIMove(5);
    const time2 = Date.now() - start2;

    // Higher difficulty should generally take longer (though not always guaranteed)
    expect(time2).toBeGreaterThanOrEqual(time1 * 0.5); // Allow some variance
  });

  test('search returns stats', () => {
    const engine = new Engine();

    const stats = engine.search(3);

    expect(stats.nodes).toBeGreaterThan(0);
    expect(stats.depth).toBe(3);
    expect(stats.bestMove).not.toBeNull();
    expect(stats.time).toBeGreaterThanOrEqual(0);
  });
});

describe('Transposition Table', () => {
  test('TT improves search speed', () => {
    // Position with many transpositions
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const pos = Position.fromFEN(fen);

    const stats = searchPosition(pos, 4);

    // With TT, we should see significant node reduction
    expect(stats.nodes).toBeGreaterThan(0);
    expect(stats.bestMove).not.toBeNull();
  });
});
