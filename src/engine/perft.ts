/**
 * Perft (Performance Test) Module
 *
 * Perft is a debugging function that walks the move generation tree
 * and counts leaf nodes. By comparing against known correct values,
 * we can verify our move generator is correct.
 */

import { Position } from './position';
import { generateMoves } from './movegen';
import { makeMove, unmakeMove } from './makemove';
import { moveToUCI } from './move';

/**
 * Count nodes at a given depth
 */
export function perft(position: Position, depth: number): number {
  if (depth === 0) return 1;

  const moves = generateMoves(position);
  let nodes = 0;

  for (let i = 0; i < moves.count; i++) {
    const move = moves.get(i);
    if (makeMove(position, move)) {
      nodes += perft(position, depth - 1);
      unmakeMove(position, move);
    }
  }

  return nodes;
}

/**
 * Divide perft - show node count for each first move
 * Useful for debugging to find which move is causing incorrect counts
 */
export function perftDivide(position: Position, depth: number): Map<string, number> {
  const results = new Map<string, number>();

  if (depth === 0) return results;

  const moves = generateMoves(position);

  for (let i = 0; i < moves.count; i++) {
    const move = moves.get(i);
    if (makeMove(position, move)) {
      const nodes = perft(position, depth - 1);
      results.set(moveToUCI(move), nodes);
      unmakeMove(position, move);
    }
  }

  return results;
}

/**
 * Known perft results for testing
 */
export const PERFT_POSITIONS: {
  name: string;
  fen: string;
  results: { depth: number; nodes: number }[];
}[] = [
  {
    name: 'Starting Position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    results: [
      { depth: 1, nodes: 20 },
      { depth: 2, nodes: 400 },
      { depth: 3, nodes: 8902 },
      { depth: 4, nodes: 197281 },
      { depth: 5, nodes: 4865609 },
    ],
  },
  {
    name: 'Kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    results: [
      { depth: 1, nodes: 48 },
      { depth: 2, nodes: 2039 },
      { depth: 3, nodes: 97862 },
      { depth: 4, nodes: 4085603 },
    ],
  },
  {
    name: 'Position 3',
    fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    results: [
      { depth: 1, nodes: 14 },
      { depth: 2, nodes: 191 },
      { depth: 3, nodes: 2812 },
      { depth: 4, nodes: 43238 },
      { depth: 5, nodes: 674624 },
    ],
  },
  {
    name: 'Position 4',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    results: [
      { depth: 1, nodes: 6 },
      { depth: 2, nodes: 264 },
      { depth: 3, nodes: 9467 },
      { depth: 4, nodes: 422333 },
    ],
  },
  {
    name: 'Position 5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    results: [
      { depth: 1, nodes: 44 },
      { depth: 2, nodes: 1486 },
      { depth: 3, nodes: 62379 },
      { depth: 4, nodes: 2103487 },
    ],
  },
  {
    name: 'Position 6',
    fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    results: [
      { depth: 1, nodes: 46 },
      { depth: 2, nodes: 2079 },
      { depth: 3, nodes: 89890 },
      { depth: 4, nodes: 3894594 },
    ],
  },
];

/**
 * Run perft test for a position
 */
export function runPerftTest(
  fen: string,
  depth: number,
  expectedNodes: number
): { passed: boolean; actualNodes: number; expected: number; time: number } {
  const position = Position.fromFEN(fen);
  const start = performance.now();
  const actualNodes = perft(position, depth);
  const time = performance.now() - start;

  return {
    passed: actualNodes === expectedNodes,
    actualNodes,
    expected: expectedNodes,
    time,
  };
}

/**
 * Run all perft tests
 */
export function runAllPerftTests(maxDepth: number = 4): {
  name: string;
  results: { depth: number; passed: boolean; nodes: number; expected: number; time: number }[];
}[] {
  const allResults = [];

  for (const test of PERFT_POSITIONS) {
    const results = [];

    for (const { depth, nodes } of test.results) {
      if (depth > maxDepth) continue;

      const result = runPerftTest(test.fen, depth, nodes);
      results.push({
        depth,
        passed: result.passed,
        nodes: result.actualNodes,
        expected: result.expected,
        time: result.time,
      });
    }

    allResults.push({
      name: test.name,
      results,
    });
  }

  return allResults;
}

/**
 * Print perft results
 */
export function printPerftResults(results: ReturnType<typeof runAllPerftTests>): void {
  let totalPassed = 0;
  let totalTests = 0;

  for (const position of results) {
    console.log(`\n${position.name}:`);

    for (const result of position.results) {
      const status = result.passed ? '✓' : '✗';
      console.log(
        `  Depth ${result.depth}: ${status} ${result.nodes} nodes (expected ${result.expected}) [${result.time.toFixed(2)}ms]`
      );

      totalTests++;
      if (result.passed) totalPassed++;
    }
  }

  console.log(`\n${totalPassed}/${totalTests} tests passed`);
}
