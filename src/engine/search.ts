/**
 * Search Module
 *
 * Implements Negamax algorithm with alpha-beta pruning,
 * quiescence search, and move ordering.
 */

import { Position } from './position';
import { Move, PIECE_INDEX } from '@/types/chess';
import { evaluateRelative } from './evaluation';
import { makeMove, unmakeMove, generateLegalMoves } from './makemove';
import { getGameState } from './gamestate';
import { isCapture, getFromSquare, getToSquare } from './move';
import { globalTT, TTEntryType } from './transposition';

// Search constants
const MATE_SCORE = 100000;
const MATE_THRESHOLD = MATE_SCORE - 1000;
const INFINITY = 200000;

// Statistics for debugging
export interface SearchStats {
  nodes: number;
  qnodes: number;
  depth: number;
  time: number;
  bestMove: Move | null;
  score: number;
}

/**
 * Negamax search with alpha-beta pruning
 */
function negamax(
  position: Position,
  depth: number,
  alpha: number,
  beta: number,
  stats: SearchStats
): number {
  stats.nodes++;
  const originalAlpha = alpha;

  // Probe transposition table
  const ttEntry = globalTT.probe(position.zobristHash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.type === TTEntryType.EXACT) {
      return ttEntry.score;
    } else if (ttEntry.type === TTEntryType.LOWER) {
      alpha = Math.max(alpha, ttEntry.score);
    } else if (ttEntry.type === TTEntryType.UPPER) {
      beta = Math.min(beta, ttEntry.score);
    }

    if (alpha >= beta) {
      return ttEntry.score;
    }
  }

  // Check for terminal conditions
  const gameState = getGameState(position);
  if (gameState.status === 'checkmate') {
    // Mate score adjusted by ply (prefer faster mates)
    return -MATE_SCORE + (stats.depth - depth);
  }
  if (gameState.status !== 'ongoing') {
    return 0; // Draw
  }

  // Leaf node - evaluate or enter quiescence
  if (depth <= 0) {
    return quiescence(position, alpha, beta, stats);
  }

  const legalMoves = generateLegalMoves(position);
  if (legalMoves.length === 0) {
    // Stalemate or checkmate (should be caught above)
    return 0;
  }

  // Try TT move first if available
  if (ttEntry && ttEntry.bestMove) {
    const ttMoveIndex = legalMoves.findIndex(m => m === ttEntry.bestMove);
    if (ttMoveIndex > 0) {
      // Move TT move to front
      const [ttMove] = legalMoves.splice(ttMoveIndex, 1);
      legalMoves.unshift(ttMove);
    }
  }

  // Order remaining moves
  orderMoves(legalMoves, position);

  let bestScore = -INFINITY;
  let bestMove: Move | null = null;

  for (const move of legalMoves) {
    if (!makeMove(position, move)) continue;

    const score = -negamax(position, depth - 1, -beta, -alpha, stats);

    unmakeMove(position, move);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
    }

    // Beta cutoff
    if (alpha >= beta) {
      // Store lower bound
      globalTT.store(position.zobristHash, depth, beta, TTEntryType.LOWER, bestMove);
      return beta;
    }
  }

  // Store in transposition table
  const ttType = bestScore <= originalAlpha ? TTEntryType.UPPER : TTEntryType.EXACT;
  globalTT.store(position.zobristHash, depth, bestScore, ttType, bestMove);

  return bestScore;
}

/**
 * Quiescence search - only search captures to avoid horizon effect
 */
function quiescence(
  position: Position,
  alpha: number,
  beta: number,
  stats: SearchStats
): number {
  stats.qnodes++;

  // Stand-pat score
  const standPat = evaluateRelative(position);

  if (standPat >= beta) {
    return beta;
  }

  if (standPat > alpha) {
    alpha = standPat;
  }

  // Generate and search only captures
  const allMoves = generateLegalMoves(position);
  const captures = allMoves.filter(move => isCapture(move));

  // Order captures by MVV-LVA
  orderMoves(captures, position);

  for (const move of captures) {
    if (!makeMove(position, move)) continue;

    const score = -quiescence(position, -beta, -alpha, stats);

    unmakeMove(position, move);

    if (score >= beta) {
      return beta;
    }

    if (score > alpha) {
      alpha = score;
    }
  }

  return alpha;
}

/**
 * Get piece value for MVV-LVA
 */
function getPieceValue(pieceIndex: number): number {
  const type = pieceIndex % 6;
  const values = [100, 320, 330, 500, 900, 20000]; // P, N, B, R, Q, K
  return values[type];
}

/**
 * Calculate MVV-LVA score for a capture
 * Higher score = better capture (valuable victim, cheap attacker)
 */
function getMVVLVAScore(move: Move, position: Position): number {
  const from = getFromSquare(move);
  const to = getToSquare(move);

  const attacker = position.pieceAt(from);
  const victim = position.pieceAt(to);

  if (attacker === -1 || victim === -1) return 0;

  // MVV-LVA: (victim value * 10) - attacker value
  // This prioritizes capturing valuable pieces with less valuable pieces
  return getPieceValue(victim) * 10 - getPieceValue(attacker);
}

/**
 * Order moves for better alpha-beta pruning
 * 1. TT move (already handled in negamax)
 * 2. Captures ordered by MVV-LVA
 * 3. Quiet moves
 */
function orderMoves(moves: Move[], position: Position): void {
  moves.sort((a, b) => {
    const aCapture = isCapture(a);
    const bCapture = isCapture(b);

    // Captures before quiet moves
    if (aCapture && !bCapture) return -1;
    if (!aCapture && bCapture) return 1;

    // Both captures - use MVV-LVA
    if (aCapture && bCapture) {
      return getMVVLVAScore(b, position) - getMVVLVAScore(a, position);
    }

    // Both quiet moves - no specific ordering yet
    return 0;
  });
}

/**
 * Iterative deepening search
 */
export function searchPosition(
  position: Position,
  maxDepth: number,
  timeLimit?: number
): SearchStats {
  const startTime = Date.now();
  const stats: SearchStats = {
    nodes: 0,
    qnodes: 0,
    depth: 0,
    time: 0,
    bestMove: null,
    score: 0,
  };

  // Increment TT age for new search
  globalTT.incrementAge();

  const legalMoves = generateLegalMoves(position);
  if (legalMoves.length === 0) {
    return stats;
  }

  // Single legal move - return immediately
  if (legalMoves.length === 1) {
    stats.bestMove = legalMoves[0];
    stats.score = 0;
    stats.time = Date.now() - startTime;
    return stats;
  }

  let bestMove = legalMoves[0];
  let bestScore = -INFINITY;

  // Iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    stats.depth = depth;
    let alpha = -INFINITY;
    const beta = INFINITY;

    for (const move of legalMoves) {
      if (!makeMove(position, move)) continue;

      const score = -negamax(position, depth - 1, -beta, -alpha, stats);

      unmakeMove(position, move);

      if (score > alpha) {
        alpha = score;
        bestMove = move;
        bestScore = score;
      }
    }

    stats.bestMove = bestMove;
    stats.score = bestScore;

    // Check time limit
    if (timeLimit && Date.now() - startTime >= timeLimit) {
      break;
    }
  }

  stats.time = Date.now() - startTime;
  return stats;
}

/**
 * Get best move for a position at given depth
 */
export function getBestMove(position: Position, depth: number): Move | null {
  const stats = searchPosition(position, depth);
  return stats.bestMove;
}

/**
 * Get best move with time limit
 */
export function getBestMoveWithTime(position: Position, timeMs: number): Move | null {
  const stats = searchPosition(position, 100, timeMs); // Max depth 100
  return stats.bestMove;
}
