/**
 * Zobrist Hashing
 *
 * Generates unique 64-bit hashes for chess positions.
 * Uses XOR operations for efficient incremental updates.
 *
 * The hash is computed by XORing:
 * - Random number for each piece on each square
 * - Random number for side to move (if black)
 * - Random numbers for each castling right
 * - Random number for en passant file (if applicable)
 */

// Random number generator (PRNG) for reproducible initialization
class PRNG {
  private state: bigint;

  constructor(seed: bigint = 1070372n) {
    this.state = seed;
  }

  /**
   * Generate a random 64-bit number
   * Uses xorshift64 algorithm
   */
  next(): bigint {
    let x = this.state;
    x ^= x << 13n;
    x ^= x >> 7n;
    x ^= x << 17n;
    x &= 0xFFFFFFFFFFFFFFFFn; // Keep 64 bits
    this.state = x;
    return x;
  }
}

// Zobrist random numbers
// [piece][square] - 12 pieces * 64 squares = 768 values
export const ZOBRIST_PIECES: bigint[][] = [];

// Side to move (XOR when black to move)
export let ZOBRIST_SIDE: bigint;

// Castling rights (4 values: K, Q, k, q)
export const ZOBRIST_CASTLING: bigint[] = [];

// En passant file (8 values: a-h)
export const ZOBRIST_EN_PASSANT: bigint[] = [];

/**
 * Initialize all Zobrist random numbers
 * Called once at engine startup
 */
export function initializeZobrist(): void {
  const prng = new PRNG(1070372n); // Fixed seed for reproducibility

  // Piece-square values
  for (let piece = 0; piece < 12; piece++) {
    ZOBRIST_PIECES[piece] = [];
    for (let square = 0; square < 64; square++) {
      ZOBRIST_PIECES[piece][square] = prng.next();
    }
  }

  // Side to move
  ZOBRIST_SIDE = prng.next();

  // Castling rights
  for (let i = 0; i < 4; i++) {
    ZOBRIST_CASTLING[i] = prng.next();
  }

  // En passant files
  for (let i = 0; i < 8; i++) {
    ZOBRIST_EN_PASSANT[i] = prng.next();
  }
}

/**
 * Compute full Zobrist hash for a position
 */
export function computeZobristHash(
  bitboards: bigint[],
  sideToMove: 'white' | 'black',
  castlingRights: number,
  enPassantSquare: number
): bigint {
  let hash = 0n;

  // Hash pieces
  for (let piece = 0; piece < 12; piece++) {
    let bb = bitboards[piece];
    while (bb !== 0n) {
      const square = bitScanForward(bb);
      hash ^= ZOBRIST_PIECES[piece][square];
      bb &= bb - 1n; // Clear LSB
    }
  }

  // Hash side to move
  if (sideToMove === 'black') {
    hash ^= ZOBRIST_SIDE;
  }

  // Hash castling rights
  if (castlingRights & 1) hash ^= ZOBRIST_CASTLING[0]; // K
  if (castlingRights & 2) hash ^= ZOBRIST_CASTLING[1]; // Q
  if (castlingRights & 4) hash ^= ZOBRIST_CASTLING[2]; // k
  if (castlingRights & 8) hash ^= ZOBRIST_CASTLING[3]; // q

  // Hash en passant file
  if (enPassantSquare >= 0) {
    const file = enPassantSquare & 7;
    hash ^= ZOBRIST_EN_PASSANT[file];
  }

  return hash;
}

/**
 * Update hash for moving a piece
 */
export function hashMovePiece(hash: bigint, piece: number, from: number, to: number): bigint {
  hash ^= ZOBRIST_PIECES[piece][from]; // Remove from source
  hash ^= ZOBRIST_PIECES[piece][to];   // Add to destination
  return hash;
}

/**
 * Update hash for adding a piece
 */
export function hashAddPiece(hash: bigint, piece: number, square: number): bigint {
  return hash ^ ZOBRIST_PIECES[piece][square];
}

/**
 * Update hash for removing a piece
 */
export function hashRemovePiece(hash: bigint, piece: number, square: number): bigint {
  return hash ^ ZOBRIST_PIECES[piece][square];
}

/**
 * Update hash for side to move change
 */
export function hashSideToMove(hash: bigint): bigint {
  return hash ^ ZOBRIST_SIDE;
}

/**
 * Update hash for castling rights change
 */
export function hashCastling(hash: bigint, oldRights: number, newRights: number): bigint {
  const changed = oldRights ^ newRights;
  if (changed & 1) hash ^= ZOBRIST_CASTLING[0];
  if (changed & 2) hash ^= ZOBRIST_CASTLING[1];
  if (changed & 4) hash ^= ZOBRIST_CASTLING[2];
  if (changed & 8) hash ^= ZOBRIST_CASTLING[3];
  return hash;
}

/**
 * Update hash for en passant square change
 */
export function hashEnPassant(hash: bigint, oldSquare: number, newSquare: number): bigint {
  if (oldSquare >= 0) {
    hash ^= ZOBRIST_EN_PASSANT[oldSquare & 7];
  }
  if (newSquare >= 0) {
    hash ^= ZOBRIST_EN_PASSANT[newSquare & 7];
  }
  return hash;
}

// Helper function (duplicated to avoid circular dependency)
function bitScanForward(bb: bigint): number {
  if (bb === 0n) return -1;

  const debruijn64 = 0x03f79d71b4cb0a89n;
  const index64: number[] = [
    0, 1, 48, 2, 57, 49, 28, 3, 61, 58, 50, 42, 38, 29, 17, 4,
    62, 55, 59, 36, 53, 51, 43, 22, 45, 39, 33, 30, 24, 18, 12, 5,
    63, 47, 56, 27, 60, 41, 37, 16, 54, 35, 52, 21, 44, 32, 23, 11,
    46, 26, 40, 15, 34, 20, 31, 10, 25, 14, 19, 9, 13, 8, 7, 6
  ];

  const isolated = bb & (-bb);
  const idx = Number((isolated * debruijn64) >> 58n) & 63;
  return index64[idx];
}

// Initialize Zobrist hashing on module load
initializeZobrist();
