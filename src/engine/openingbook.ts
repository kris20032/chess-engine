/**
 * Opening Book Module
 *
 * Provides opening move suggestions based on a database of common chess openings.
 * This helps the engine play strong, theory-based moves in the opening phase.
 */

import { Position } from './position';
import { Move } from '@/types/chess';
import { generateLegalMoves } from './makemove';
import { moveToUCI } from './move';

/**
 * Opening book entry
 */
interface BookEntry {
  fen: string;
  moves: BookMove[];
}

interface BookMove {
  uci: string;
  weight: number; // Higher = more popular/better
  name?: string; // Opening name
}

/**
 * Opening book database
 * Organized by position FEN with move recommendations
 */
const OPENING_BOOK: BookEntry[] = [
  // Starting position
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [
      { uci: 'e2e4', weight: 100, name: "King's Pawn" },
      { uci: 'd2d4', weight: 95, name: "Queen's Pawn" },
      { uci: 'c2c4', weight: 80, name: 'English Opening' },
      { uci: 'g1f3', weight: 85, name: 'Reti Opening' },
      { uci: 'e2e3', weight: 50 },
      { uci: 'd2d3', weight: 45 },
    ],
  },
  // After 1.e4
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    moves: [
      { uci: 'e7e5', weight: 100, name: "King's Pawn Game" },
      { uci: 'c7c5', weight: 95, name: 'Sicilian Defense' },
      { uci: 'e7e6', weight: 85, name: 'French Defense' },
      { uci: 'c7c6', weight: 80, name: 'Caro-Kann Defense' },
      { uci: 'd7d5', weight: 75, name: 'Scandinavian Defense' },
      { uci: 'g8f6', weight: 70, name: 'Alekhine Defense' },
    ],
  },
  // After 1.d4
  {
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    moves: [
      { uci: 'd7d5', weight: 100, name: "Queen's Gambit" },
      { uci: 'g8f6', weight: 95, name: 'Indian Defenses' },
      { uci: 'e7e6', weight: 85 },
      { uci: 'f7f5', weight: 70, name: 'Dutch Defense' },
      { uci: 'c7c5', weight: 75, name: 'Benoni Defense' },
    ],
  },
  // After 1.e4 e5
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    moves: [
      { uci: 'g1f3', weight: 100, name: 'Italian/Spanish/etc' },
      { uci: 'f1c4', weight: 85, name: "Bishop's Opening" },
      { uci: 'b1c3', weight: 75, name: 'Vienna Game' },
      { uci: 'f2f4', weight: 70, name: "King's Gambit" },
      { uci: 'd2d4', weight: 65, name: 'Center Game' },
    ],
  },
  // After 1.e4 e5 2.Nf3
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    moves: [
      { uci: 'b8c6', weight: 100, name: 'Spanish/Italian' },
      { uci: 'g8f6', weight: 90, name: 'Petrov Defense' },
      { uci: 'd7d6', weight: 75, name: 'Philidor Defense' },
    ],
  },
  // After 1.e4 e5 2.Nf3 Nc6
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    moves: [
      { uci: 'f1b5', weight: 100, name: 'Ruy Lopez' },
      { uci: 'f1c4', weight: 95, name: 'Italian Game' },
      { uci: 'b1c3', weight: 80, name: 'Four Knights' },
      { uci: 'd2d4', weight: 75, name: 'Scotch Game' },
      { uci: 'f1b5', weight: 70, name: 'Vienna Game' },
    ],
  },
  // After 1.e4 c5 (Sicilian)
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    moves: [
      { uci: 'g1f3', weight: 100, name: 'Open Sicilian' },
      { uci: 'b1c3', weight: 85, name: 'Closed Sicilian' },
      { uci: 'c2c3', weight: 75, name: 'Alapin Variation' },
      { uci: 'f2f4', weight: 60, name: 'Grand Prix Attack' },
    ],
  },
  // After 1.d4 d5
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
    moves: [
      { uci: 'c2c4', weight: 100, name: "Queen's Gambit" },
      { uci: 'g1f3', weight: 85, name: 'London System' },
      { uci: 'b1c3', weight: 75 },
      { uci: 'c1f4', weight: 70, name: 'London System' },
    ],
  },
  // After 1.d4 Nf6
  {
    fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
    moves: [
      { uci: 'c2c4', weight: 100, name: 'Indian Defenses' },
      { uci: 'g1f3', weight: 90 },
      { uci: 'c1f4', weight: 75, name: 'London System' },
      { uci: 'b1c3', weight: 70 },
    ],
  },
  // After 1.d4 Nf6 2.c4
  {
    fen: 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    moves: [
      { uci: 'e7e6', weight: 100, name: "Queen's Indian/Nimzo" },
      { uci: 'g7g6', weight: 95, name: "King's Indian" },
      { uci: 'c7c5', weight: 85, name: 'Benoni Defense' },
      { uci: 'e7e5', weight: 75, name: 'Budapest Gambit' },
    ],
  },
  // Ruy Lopez main line
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    moves: [
      { uci: 'a7a6', weight: 100, name: 'Morphy Defense' },
      { uci: 'g8f6', weight: 85, name: 'Berlin Defense' },
      { uci: 'f7f5', weight: 70, name: 'Schliemann Defense' },
      { uci: 'd7d6', weight: 65, name: 'Steinitz Defense' },
    ],
  },
  // Italian Game
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    moves: [
      { uci: 'f8c5', weight: 100, name: 'Giuoco Piano' },
      { uci: 'g8f6', weight: 90, name: 'Two Knights Defense' },
      { uci: 'f8e7', weight: 75 },
    ],
  },
  // Queen's Gambit Declined
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    moves: [
      { uci: 'e7e6', weight: 100, name: "Queen's Gambit Declined" },
      { uci: 'd5c4', weight: 95, name: "Queen's Gambit Accepted" },
      { uci: 'c7c6', weight: 85, name: 'Slav Defense' },
      { uci: 'e7e5', weight: 75, name: 'Albin Counter-Gambit' },
    ],
  },
];

/**
 * Normalize FEN for lookup (ignore move counters)
 */
function normalizeFEN(fen: string): string {
  const parts = fen.split(' ');
  // Keep position, side to move, castling, en passant - ignore halfmove/fullmove
  return parts.slice(0, 4).join(' ');
}

/**
 * Probe opening book for a position
 */
export function probeBook(position: Position): Move | null {
  const fen = normalizeFEN(position.toFEN());
  const entry = OPENING_BOOK.find(e => normalizeFEN(e.fen) === fen);

  if (!entry || entry.moves.length === 0) {
    return null;
  }

  // Get legal moves for validation
  const legalMoves = generateLegalMoves(position);
  const legalUCIs = legalMoves.map(m => moveToUCI(m));

  // Filter book moves to only legal ones
  const validBookMoves = entry.moves.filter(bm => legalUCIs.includes(bm.uci));

  if (validBookMoves.length === 0) {
    return null;
  }

  // Weighted random selection
  const totalWeight = validBookMoves.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;

  for (const bookMove of validBookMoves) {
    random -= bookMove.weight;
    if (random <= 0) {
      // Find the corresponding Move object
      const moveIndex = legalUCIs.indexOf(bookMove.uci);
      return legalMoves[moveIndex];
    }
  }

  // Fallback to first valid book move
  const moveIndex = legalUCIs.indexOf(validBookMoves[0].uci);
  return legalMoves[moveIndex];
}

/**
 * Check if position is in opening book
 */
export function isInBook(position: Position): boolean {
  const fen = normalizeFEN(position.toFEN());
  return OPENING_BOOK.some(e => normalizeFEN(e.fen) === fen);
}

/**
 * Get all book moves for a position (for UI display)
 */
export function getBookMoves(position: Position): BookMove[] {
  const fen = normalizeFEN(position.toFEN());
  const entry = OPENING_BOOK.find(e => normalizeFEN(e.fen) === fen);
  return entry?.moves || [];
}

/**
 * Get opening name for current position
 */
export function getOpeningName(position: Position): string | null {
  const fen = normalizeFEN(position.toFEN());
  const entry = OPENING_BOOK.find(e => normalizeFEN(e.fen) === fen);

  if (!entry || entry.moves.length === 0) {
    return null;
  }

  // Return the name of the most popular move
  const topMove = entry.moves.reduce((max, m) => m.weight > max.weight ? m : max);
  return topMove.name || null;
}
