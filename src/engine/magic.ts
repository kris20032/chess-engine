/**
 * Magic Bitboards for Sliding Pieces
 *
 * Magic bitboards enable O(1) attack generation for rooks and bishops
 * by using a hash table lookup with "magic" multiplication.
 *
 * The key insight: for a sliding piece, the relevant blockers are only
 * those pieces on the rays the piece can travel. Edge squares don't
 * matter since the piece stops there anyway.
 */

import {
  squareBB,
  popCount,
  bitScanForward,
  fileOf,
  rankOf,
  testBit,
  EMPTY,
} from './bitboard';
import {
  RAY_ATTACKS,
  DIR_NORTH,
  DIR_SOUTH,
  DIR_EAST,
  DIR_WEST,
  DIR_NORTH_EAST,
  DIR_NORTH_WEST,
  DIR_SOUTH_EAST,
  DIR_SOUTH_WEST,
} from './attacks';

/**
 * Magic entry for a square
 */
export interface MagicEntry {
  mask: bigint;        // Relevant occupancy mask (excludes edges)
  magic: bigint;       // Magic multiplier
  shift: number;       // Bits to shift after multiplication
  attacks: bigint[];   // Precomputed attack table indexed by magic hash
}

// Magic tables for bishops and rooks
export const BISHOP_MAGICS: MagicEntry[] = new Array(64);
export const ROOK_MAGICS: MagicEntry[] = new Array(64);

// Precomputed magic numbers (found through trial and error)
// These are well-known magic numbers that work efficiently
const ROOK_MAGIC_NUMBERS: bigint[] = [
  0x8a80104000800020n, 0x140002000100040n, 0x2801880a0017001n, 0x100081001000420n,
  0x200020010080420n, 0x3001c0002010008n, 0x8480008002000100n, 0x2080088004402900n,
  0x800098204000n, 0x2024401000200040n, 0x100802000801000n, 0x120800800801000n,
  0x208808088000400n, 0x2802200800400n, 0x2200800100020080n, 0x801000060821100n,
  0x80044006422000n, 0x100808020004000n, 0x12108a0010204200n, 0x140848010000802n,
  0x481828014002800n, 0x8094004002004100n, 0x4010040010010802n, 0x20008806104n,
  0x100400080208000n, 0x2040002120081000n, 0x21200680100081n, 0x20100080080080n,
  0x2000a00200410n, 0x20080800400n, 0x80088400100102n, 0x80004600042881n,
  0x4040008040800020n, 0x440003000200801n, 0x4200011004500n, 0x188020010100100n,
  0x14800401802800n, 0x2080040080800200n, 0x124080204001001n, 0x200046502000484n,
  0x480400080088020n, 0x1000422010034000n, 0x30200100110040n, 0x100021010009n,
  0x2002080100110004n, 0x202008004008002n, 0x20020004010100n, 0x2048440040820001n,
  0x101002200408200n, 0x40802000401080n, 0x4008142004410100n, 0x2060820c0120200n,
  0x1001004080100n, 0x20c020080040080n, 0x2935610830022400n, 0x44440041009200n,
  0x280001040802101n, 0x2100190040002085n, 0x80c0084100102001n, 0x4024081001000421n,
  0x20030a0244872n, 0x12001008414402n, 0x2006104900a0804n, 0x1004081002402n,
];

const BISHOP_MAGIC_NUMBERS: bigint[] = [
  0x40040844404084n, 0x2004208a004208n, 0x10190041080202n, 0x108060845042010n,
  0x581104180800210n, 0x2112080446200010n, 0x1080820820060210n, 0x3c0808410220200n,
  0x4050404440404n, 0x21001420088n, 0x24d0080801082102n, 0x1020a0a020400n,
  0x40308200402n, 0x4011002100800n, 0x401484104104005n, 0x801010402020200n,
  0x400210c3880100n, 0x404022024108200n, 0x810018200204102n, 0x4002801a02003n,
  0x85040820080400n, 0x810102c808880400n, 0xe900410884800n, 0x8002020480840102n,
  0x220200865090201n, 0x2010100a02021202n, 0x152048408022401n, 0x20080002081110n,
  0x4001001021004000n, 0x800040400a011002n, 0xe4004081011002n, 0x1c004001012080n,
  0x8004200962a00220n, 0x8422100208500202n, 0x2000402200300c08n, 0x8646020080080080n,
  0x80020a0200100808n, 0x2010004880111000n, 0x623000a080011400n, 0x42008c0340209202n,
  0x209188240001000n, 0x400408a884001800n, 0x110400a6080400n, 0x1840060a44020800n,
  0x90080104000041n, 0x201011000808101n, 0x1a2208080504f080n, 0x8012020600211212n,
  0x500861011240000n, 0x180806108200800n, 0x4000020e01040044n, 0x300000261044000an,
  0x802241102020002n, 0x20906061210001n, 0x5a84841004010310n, 0x4010801011c04n,
  0xa010109502200n, 0x4a02012000n, 0x500201010098b028n, 0x8040002811040900n,
  0x28000010020204n, 0x6000020202d0240n, 0x8918844842082200n, 0x4010011029020020n,
];

// Number of bits in the index for each square (for bishops and rooks)
const BISHOP_BITS: number[] = [
  6, 5, 5, 5, 5, 5, 5, 6,
  5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 7, 7, 7, 7, 5, 5,
  5, 5, 7, 9, 9, 7, 5, 5,
  5, 5, 7, 9, 9, 7, 5, 5,
  5, 5, 7, 7, 7, 7, 5, 5,
  5, 5, 5, 5, 5, 5, 5, 5,
  6, 5, 5, 5, 5, 5, 5, 6,
];

const ROOK_BITS: number[] = [
  12, 11, 11, 11, 11, 11, 11, 12,
  11, 10, 10, 10, 10, 10, 10, 11,
  11, 10, 10, 10, 10, 10, 10, 11,
  11, 10, 10, 10, 10, 10, 10, 11,
  11, 10, 10, 10, 10, 10, 10, 11,
  11, 10, 10, 10, 10, 10, 10, 11,
  11, 10, 10, 10, 10, 10, 10, 11,
  12, 11, 11, 11, 11, 11, 11, 12,
];

/**
 * Generate the relevant occupancy mask for a rook on a given square
 * Excludes edge squares (since the piece stops at edges anyway)
 */
function generateRookMask(square: number): bigint {
  let mask = 0n;
  const file = fileOf(square);
  const rank = rankOf(square);

  // North (exclude rank 8)
  for (let r = rank + 1; r < 7; r++) {
    mask |= squareBB(r * 8 + file);
  }
  // South (exclude rank 1)
  for (let r = rank - 1; r > 0; r--) {
    mask |= squareBB(r * 8 + file);
  }
  // East (exclude file h)
  for (let f = file + 1; f < 7; f++) {
    mask |= squareBB(rank * 8 + f);
  }
  // West (exclude file a)
  for (let f = file - 1; f > 0; f--) {
    mask |= squareBB(rank * 8 + f);
  }

  return mask;
}

/**
 * Generate the relevant occupancy mask for a bishop on a given square
 * Excludes edge squares
 */
function generateBishopMask(square: number): bigint {
  let mask = 0n;
  const file = fileOf(square);
  const rank = rankOf(square);

  // Northeast
  for (let r = rank + 1, f = file + 1; r < 7 && f < 7; r++, f++) {
    mask |= squareBB(r * 8 + f);
  }
  // Northwest
  for (let r = rank + 1, f = file - 1; r < 7 && f > 0; r++, f--) {
    mask |= squareBB(r * 8 + f);
  }
  // Southeast
  for (let r = rank - 1, f = file + 1; r > 0 && f < 7; r--, f++) {
    mask |= squareBB(r * 8 + f);
  }
  // Southwest
  for (let r = rank - 1, f = file - 1; r > 0 && f > 0; r--, f--) {
    mask |= squareBB(r * 8 + f);
  }

  return mask;
}

/**
 * Generate rook attacks for a given square and blocker configuration
 * (Used during initialization to build attack tables)
 */
function generateRookAttacks(square: number, blockers: bigint): bigint {
  let attacks = 0n;
  const file = fileOf(square);
  const rank = rankOf(square);

  // North
  for (let r = rank + 1; r < 8; r++) {
    const sq = r * 8 + file;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }
  // South
  for (let r = rank - 1; r >= 0; r--) {
    const sq = r * 8 + file;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }
  // East
  for (let f = file + 1; f < 8; f++) {
    const sq = rank * 8 + f;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }
  // West
  for (let f = file - 1; f >= 0; f--) {
    const sq = rank * 8 + f;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }

  return attacks;
}

/**
 * Generate bishop attacks for a given square and blocker configuration
 */
function generateBishopAttacks(square: number, blockers: bigint): bigint {
  let attacks = 0n;
  const file = fileOf(square);
  const rank = rankOf(square);

  // Northeast
  for (let r = rank + 1, f = file + 1; r < 8 && f < 8; r++, f++) {
    const sq = r * 8 + f;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }
  // Northwest
  for (let r = rank + 1, f = file - 1; r < 8 && f >= 0; r++, f--) {
    const sq = r * 8 + f;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }
  // Southeast
  for (let r = rank - 1, f = file + 1; r >= 0 && f < 8; r--, f++) {
    const sq = r * 8 + f;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }
  // Southwest
  for (let r = rank - 1, f = file - 1; r >= 0 && f >= 0; r--, f--) {
    const sq = r * 8 + f;
    attacks |= squareBB(sq);
    if (testBit(blockers, sq)) break;
  }

  return attacks;
}

/**
 * Generate all possible occupancy configurations for a mask
 * Returns an array of all 2^n configurations where n = popcount(mask)
 */
function generateOccupancies(mask: bigint): bigint[] {
  const bits: number[] = [];
  let m = mask;
  while (m !== 0n) {
    bits.push(bitScanForward(m));
    m &= m - 1n;
  }

  const count = 1 << bits.length;
  const occupancies: bigint[] = new Array(count);

  for (let i = 0; i < count; i++) {
    let occ = 0n;
    for (let j = 0; j < bits.length; j++) {
      if (i & (1 << j)) {
        occ |= squareBB(bits[j]);
      }
    }
    occupancies[i] = occ;
  }

  return occupancies;
}

/**
 * Initialize magic bitboards for a single square
 */
function initializeMagicForSquare(
  square: number,
  isRook: boolean
): MagicEntry {
  const mask = isRook ? generateRookMask(square) : generateBishopMask(square);
  const magic = isRook ? ROOK_MAGIC_NUMBERS[square] : BISHOP_MAGIC_NUMBERS[square];
  const bits = isRook ? ROOK_BITS[square] : BISHOP_BITS[square];
  const shift = 64 - bits;

  const occupancies = generateOccupancies(mask);
  const attacks: bigint[] = new Array(1 << bits).fill(0n);

  for (const occ of occupancies) {
    const index = Number((occ * magic) >> BigInt(shift));
    const attack = isRook
      ? generateRookAttacks(square, occ)
      : generateBishopAttacks(square, occ);
    attacks[index] = attack;
  }

  return { mask, magic, shift, attacks };
}

/**
 * Initialize all magic bitboards
 * Called once at engine startup
 */
export function initializeMagicBitboards(): void {
  for (let sq = 0; sq < 64; sq++) {
    ROOK_MAGICS[sq] = initializeMagicForSquare(sq, true);
    BISHOP_MAGICS[sq] = initializeMagicForSquare(sq, false);
  }
}

/**
 * Get rook attacks from a square given board occupancy
 */
export function getRookAttacks(square: number, occupancy: bigint): bigint {
  const entry = ROOK_MAGICS[square];
  if (!entry) return 0n; // Safety check
  const index = Number(((occupancy & entry.mask) * entry.magic) >> BigInt(entry.shift));
  return entry.attacks[index] ?? 0n;
}

/**
 * Get bishop attacks from a square given board occupancy
 */
export function getBishopAttacks(square: number, occupancy: bigint): bigint {
  const entry = BISHOP_MAGICS[square];
  if (!entry) return 0n; // Safety check
  const index = Number(((occupancy & entry.mask) * entry.magic) >> BigInt(entry.shift));
  return entry.attacks[index] ?? 0n;
}

/**
 * Get queen attacks (combination of rook and bishop attacks)
 */
export function getQueenAttacks(square: number, occupancy: bigint): bigint {
  return getRookAttacks(square, occupancy) | getBishopAttacks(square, occupancy);
}

// Initialize magic bitboards immediately
initializeMagicBitboards();
