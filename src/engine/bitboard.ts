/**
 * Bitboard Operations Module
 *
 * Uses BigInt for 64-bit operations (JavaScript doesn't have native 64-bit integers).
 * Each bit represents a square: bit 0 = a1, bit 63 = h8
 */

// Constants
export const EMPTY = 0n;
export const FULL = 0xFFFFFFFFFFFFFFFFn;

/**
 * Get file (column) of a square (0-7, where 0=a, 7=h)
 */
export function fileOf(square: number): number {
  return square & 7;
}

/**
 * Get rank (row) of a square (0-7, where 0=rank 1, 7=rank 8)
 */
export function rankOf(square: number): number {
  return square >> 3;
}

/**
 * Create a square from file and rank
 */
export function makeSquare(file: number, rank: number): number {
  return rank * 8 + file;
}

/**
 * Create a bitboard with a single bit set
 */
export function squareBB(square: number): bigint {
  return 1n << BigInt(square);
}

/**
 * Check if a bit is set in a bitboard
 */
export function testBit(bb: bigint, square: number): boolean {
  return (bb & squareBB(square)) !== 0n;
}

/**
 * Set a bit in a bitboard
 */
export function setBit(bb: bigint, square: number): bigint {
  return bb | squareBB(square);
}

/**
 * Clear a bit in a bitboard
 */
export function clearBit(bb: bigint, square: number): bigint {
  return bb & ~squareBB(square);
}

/**
 * Toggle a bit in a bitboard
 */
export function toggleBit(bb: bigint, square: number): bigint {
  return bb ^ squareBB(square);
}

/**
 * Count number of set bits (population count)
 */
export function popCount(bb: bigint): number {
  let count = 0;
  while (bb !== 0n) {
    bb &= bb - 1n; // Clear least significant bit
    count++;
  }
  return count;
}

/**
 * Get index of least significant bit (LSB)
 * Returns -1 if bitboard is empty
 */
export function bitScanForward(bb: bigint): number {
  if (bb === 0n) return -1;

  // De Bruijn multiplication method
  const debruijn64 = 0x03f79d71b4cb0a89n;
  const index64: number[] = [
    0, 1, 48, 2, 57, 49, 28, 3, 61, 58, 50, 42, 38, 29, 17, 4,
    62, 55, 59, 36, 53, 51, 43, 22, 45, 39, 33, 30, 24, 18, 12, 5,
    63, 47, 56, 27, 60, 41, 37, 16, 54, 35, 52, 21, 44, 32, 23, 11,
    46, 26, 40, 15, 34, 20, 31, 10, 25, 14, 19, 9, 13, 8, 7, 6
  ];

  const isolated = bb & (-bb); // Isolate LSB
  // Use BigInt.asIntN to handle potential overflow
  const idx = Number((isolated * debruijn64) >> 58n) & 63;
  return index64[idx];
}

/**
 * Pop least significant bit and return its index
 */
export function popLSB(bbRef: { bb: bigint }): number {
  const square = bitScanForward(bbRef.bb);
  if (square >= 0) {
    bbRef.bb &= bbRef.bb - 1n; // Clear LSB
  }
  return square;
}

/**
 * Get index of most significant bit (MSB)
 * Returns -1 if bitboard is empty
 */
export function bitScanReverse(bb: bigint): number {
  if (bb === 0n) return -1;

  let result = 0;
  if (bb > 0xFFFFFFFFn) { result += 32; bb >>= 32n; }
  if (bb > 0xFFFFn) { result += 16; bb >>= 16n; }
  if (bb > 0xFFn) { result += 8; bb >>= 8n; }
  if (bb > 0xFn) { result += 4; bb >>= 4n; }
  if (bb > 0x3n) { result += 2; bb >>= 2n; }
  if (bb > 0x1n) { result += 1; }

  return result;
}

/**
 * Shift bitboard north (up) by one rank
 */
export function shiftNorth(bb: bigint): bigint {
  return (bb << 8n) & FULL;
}

/**
 * Shift bitboard south (down) by one rank
 */
export function shiftSouth(bb: bigint): bigint {
  return bb >> 8n;
}

/**
 * Shift bitboard east (right) by one file
 */
export function shiftEast(bb: bigint): bigint {
  return (bb << 1n) & ~0x0101010101010101n; // Clear a-file wraps
}

/**
 * Shift bitboard west (left) by one file
 */
export function shiftWest(bb: bigint): bigint {
  return (bb >> 1n) & ~0x8080808080808080n; // Clear h-file wraps
}

/**
 * Shift bitboard northeast
 */
export function shiftNorthEast(bb: bigint): bigint {
  return (bb << 9n) & ~0x0101010101010101n & FULL;
}

/**
 * Shift bitboard northwest
 */
export function shiftNorthWest(bb: bigint): bigint {
  return (bb << 7n) & ~0x8080808080808080n & FULL;
}

/**
 * Shift bitboard southeast
 */
export function shiftSouthEast(bb: bigint): bigint {
  return (bb >> 7n) & ~0x0101010101010101n;
}

/**
 * Shift bitboard southwest
 */
export function shiftSouthWest(bb: bigint): bigint {
  return (bb >> 9n) & ~0x8080808080808080n;
}

/**
 * Convert square index to algebraic notation (e.g., 0 -> "a1", 63 -> "h8")
 */
export function squareToAlgebraic(square: number): string {
  const file = String.fromCharCode(97 + fileOf(square)); // 'a' + file
  const rank = String(rankOf(square) + 1);
  return file + rank;
}

/**
 * Convert algebraic notation to square index (e.g., "e4" -> 28)
 */
export function algebraicToSquare(algebraic: string): number {
  const file = algebraic.charCodeAt(0) - 97; // 'a' = 0
  const rank = parseInt(algebraic[1]) - 1;
  return makeSquare(file, rank);
}

/**
 * Print a bitboard as an 8x8 grid (for debugging)
 */
export function printBitboard(bb: bigint): string {
  let result = '';
  for (let rank = 7; rank >= 0; rank--) {
    result += `${rank + 1} `;
    for (let file = 0; file < 8; file++) {
      const square = makeSquare(file, rank);
      result += testBit(bb, square) ? '1 ' : '. ';
    }
    result += '\n';
  }
  result += '  a b c d e f g h\n';
  return result;
}

/**
 * Get all squares set in a bitboard as an array
 */
export function getSquares(bb: bigint): number[] {
  const squares: number[] = [];
  let copy = bb;
  while (copy !== 0n) {
    const sq = bitScanForward(copy);
    squares.push(sq);
    copy &= copy - 1n;
  }
  return squares;
}

// File and rank bitboards
export const FILE_A = 0x0101010101010101n;
export const FILE_B = 0x0202020202020202n;
export const FILE_C = 0x0404040404040404n;
export const FILE_D = 0x0808080808080808n;
export const FILE_E = 0x1010101010101010n;
export const FILE_F = 0x2020202020202020n;
export const FILE_G = 0x4040404040404040n;
export const FILE_H = 0x8080808080808080n;

export const RANK_1 = 0x00000000000000FFn;
export const RANK_2 = 0x000000000000FF00n;
export const RANK_3 = 0x0000000000FF0000n;
export const RANK_4 = 0x00000000FF000000n;
export const RANK_5 = 0x000000FF00000000n;
export const RANK_6 = 0x0000FF0000000000n;
export const RANK_7 = 0x00FF000000000000n;
export const RANK_8 = 0xFF00000000000000n;

export const FILES = [FILE_A, FILE_B, FILE_C, FILE_D, FILE_E, FILE_F, FILE_G, FILE_H];
export const RANKS = [RANK_1, RANK_2, RANK_3, RANK_4, RANK_5, RANK_6, RANK_7, RANK_8];

// Not-file masks for wraparound prevention
export const NOT_FILE_A = ~FILE_A & FULL;
export const NOT_FILE_H = ~FILE_H & FULL;
export const NOT_FILE_AB = ~(FILE_A | FILE_B) & FULL;
export const NOT_FILE_GH = ~(FILE_G | FILE_H) & FULL;
