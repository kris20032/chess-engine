/**
 * Performance profiling tests
 * Run with: npx jest src/engine/__tests__/performance.test.ts
 */

import { Position } from '../position';
import { searchPosition } from '../search';
import { generateLegalMoves } from '../makemove';
import { evaluateRelative } from '../evaluation';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MIDDLEGAME_FEN = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 8';
const ENDGAME_FEN = '8/8/4k3/8/8/3K4/8/8 w - - 0 1';

describe('Engine Performance Profiling', () => {
  describe('Move Generation Speed', () => {
    test('starting position move generation', () => {
      const pos = Position.fromFEN(STARTING_FEN);
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        generateLegalMoves(pos);
      }
      const end = performance.now();
      const timePerGeneration = (end - start) / iterations;

      console.log(`Move generation (starting): ${timePerGeneration.toFixed(4)}ms per call`);
      console.log(`  Throughput: ${(iterations / (end - start) * 1000).toFixed(0)} calls/sec`);

      // Should be reasonably fast (< 1ms per call)
      expect(timePerGeneration).toBeLessThan(1.0);
    });

    test('complex position move generation', () => {
      const pos = Position.fromFEN(MIDDLEGAME_FEN);
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        generateLegalMoves(pos);
      }
      const end = performance.now();
      const timePerGeneration = (end - start) / iterations;

      console.log(`Move generation (middlegame): ${timePerGeneration.toFixed(4)}ms per call`);
      console.log(`  Throughput: ${(iterations / (end - start) * 1000).toFixed(0)} calls/sec`);

      expect(timePerGeneration).toBeLessThan(1.0);
    });
  });

  describe('Evaluation Speed', () => {
    test('position evaluation speed', () => {
      const pos = Position.fromFEN(MIDDLEGAME_FEN);
      const iterations = 100000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        evaluateRelative(pos);
      }
      const end = performance.now();
      const timePerEval = (end - start) / iterations;

      console.log(`Evaluation: ${timePerEval.toFixed(4)}ms per call`);
      console.log(`  Throughput: ${(iterations / (end - start) * 1000).toFixed(0)} evals/sec`);

      // Should be very fast (< 0.02ms)
      expect(timePerEval).toBeLessThan(0.02);
    });
  });

  describe('Search Performance', () => {
    test('depth 4 search from starting position', () => {
      const pos = Position.fromFEN(STARTING_FEN);
      const depth = 4;

      const start = performance.now();
      const stats = searchPosition(pos, depth);
      const end = performance.now();

      const totalTime = end - start;
      const nps = (stats.nodes + stats.qnodes) / (totalTime / 1000);

      console.log('\nDepth 4 Starting Position Search:');
      console.log(`  Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Nodes: ${stats.nodes.toLocaleString()}`);
      console.log(`  Qnodes: ${stats.qnodes.toLocaleString()}`);
      console.log(`  Total: ${(stats.nodes + stats.qnodes).toLocaleString()}`);
      console.log(`  NPS: ${nps.toLocaleString(undefined, { maximumFractionDigits: 0 })} nodes/sec`);
      console.log(`  Best move: ${stats.bestMove ? 'found' : 'none'}`);

      // Should complete in reasonable time (< 8 seconds)
      expect(totalTime).toBeLessThan(8000);
      expect(stats.bestMove).not.toBeNull();
    });

    test('depth 5 search from middlegame', () => {
      const pos = Position.fromFEN(MIDDLEGAME_FEN);
      const depth = 5;

      const start = performance.now();
      const stats = searchPosition(pos, depth);
      const end = performance.now();

      const totalTime = end - start;
      const nps = (stats.nodes + stats.qnodes) / (totalTime / 1000);

      console.log('\nDepth 5 Middlegame Search:');
      console.log(`  Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Nodes: ${stats.nodes.toLocaleString()}`);
      console.log(`  Qnodes: ${stats.qnodes.toLocaleString()}`);
      console.log(`  Total: ${(stats.nodes + stats.qnodes).toLocaleString()}`);
      console.log(`  NPS: ${nps.toLocaleString(undefined, { maximumFractionDigits: 0 })} nodes/sec`);
      console.log(`  Score: ${stats.score}`);

      expect(totalTime).toBeLessThan(10000);
      expect(stats.bestMove).not.toBeNull();
    });

    test('time-limited search', () => {
      const pos = Position.fromFEN(MIDDLEGAME_FEN);
      const timeLimit = 1000; // 1 second

      const start = performance.now();
      const stats = searchPosition(pos, 100, timeLimit);
      const end = performance.now();

      const actualTime = end - start;

      console.log('\n1-second Time-Limited Search:');
      console.log(`  Time: ${actualTime.toFixed(2)}ms (limit: ${timeLimit}ms)`);
      console.log(`  Depth reached: ${stats.depth}`);
      console.log(`  Nodes: ${stats.nodes.toLocaleString()}`);
      console.log(`  Qnodes: ${stats.qnodes.toLocaleString()}`);

      // Should respect time limit (with some margin)
      expect(actualTime).toBeLessThan(timeLimit + 500);
      expect(stats.bestMove).not.toBeNull();
    });
  });

  describe('Transposition Table Effectiveness', () => {
    test('search with TT should be faster than without', () => {
      const pos = Position.fromFEN(MIDDLEGAME_FEN);
      const depth = 4;

      // First search (cold TT)
      const start1 = performance.now();
      const stats1 = searchPosition(pos, depth);
      const time1 = performance.now() - start1;

      // Second search (warm TT - same position)
      const start2 = performance.now();
      const stats2 = searchPosition(pos, depth);
      const time2 = performance.now() - start2;

      console.log('\nTransposition Table Effectiveness:');
      console.log(`  First search: ${time1.toFixed(2)}ms, ${stats1.nodes} nodes`);
      console.log(`  Second search: ${time2.toFixed(2)}ms, ${stats2.nodes} nodes`);
      console.log(`  Speedup: ${(time1 / time2).toFixed(2)}x`);

      // Second search should be significantly faster or use fewer nodes
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });
});

describe('Performance Benchmarks', () => {
  test('full benchmark suite', () => {
    const positions = [
      { name: 'Starting Position', fen: STARTING_FEN },
      { name: 'Middlegame', fen: MIDDLEGAME_FEN },
      { name: 'Endgame', fen: ENDGAME_FEN },
      {
        name: 'Kiwipete',
        fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      },
    ];

    console.log('\n=== Performance Benchmark Suite ===\n');

    positions.forEach(({ name, fen }) => {
      const pos = Position.fromFEN(fen);
      const depth = 4;

      const start = performance.now();
      const stats = searchPosition(pos, depth);
      const time = performance.now() - start;

      const totalNodes = stats.nodes + stats.qnodes;
      const nps = totalNodes / (time / 1000);

      console.log(`${name}:`);
      console.log(`  Depth: ${depth}`);
      console.log(`  Time: ${time.toFixed(2)}ms`);
      console.log(`  Nodes: ${totalNodes.toLocaleString()}`);
      console.log(`  NPS: ${nps.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
      console.log(`  Score: ${stats.score}`);
      console.log('');
    });

    expect(true).toBe(true); // Always pass, this is for benchmarking
  });
});
