/**
 * Precomputed Attack Tables
 *
 * Attack tables for knights, kings, and pawns are computed at initialization
 * and stored for O(1) lookup during move generation.
 */

import {
  squareBB,
  shiftNorth,
  shiftSouth,
  shiftEast,
  shiftWest,
  shiftNorthEast,
  shiftNorthWest,
  shiftSouthEast,
  shiftSouthWest,
  NOT_FILE_A,
  NOT_FILE_H,
  NOT_FILE_AB,
  NOT_FILE_GH,
  fileOf,
  rankOf,
} from './bitboard';

// Precomputed attack tables
export const KNIGHT_ATTACKS: bigint[] = new Array(64);
export const KING_ATTACKS: bigint[] = new Array(64);
export const WHITE_PAWN_ATTACKS: bigint[] = new Array(64);
export const BLACK_PAWN_ATTACKS: bigint[] = new Array(64);

// Ray attacks for each direction from each square (used by magic bitboards)
export const RAY_ATTACKS: bigint[][] = new Array(8).fill(null).map(() => new Array(64).fill(0n));

// Direction indices
export const DIR_NORTH = 0;
export const DIR_SOUTH = 1;
export const DIR_EAST = 2;
export const DIR_WEST = 3;
export const DIR_NORTH_EAST = 4;
export const DIR_NORTH_WEST = 5;
export const DIR_SOUTH_EAST = 6;
export const DIR_SOUTH_WEST = 7;

/**
 * Initialize all precomputed attack tables
 * Called once at engine startup
 */
export function initializeAttackTables(): void {
  initializeKnightAttacks();
  initializeKingAttacks();
  initializePawnAttacks();
  initializeRayAttacks();
}

/**
 * Initialize knight attack table
 *
 * Knights move in an "L" shape: 2 squares in one direction, 1 square perpendicular
 * There are 8 possible knight moves from any square
 */
function initializeKnightAttacks(): void {
  for (let sq = 0; sq < 64; sq++) {
    const bb = squareBB(sq);
    let attacks = 0n;

    // Up 2, left 1
    attacks |= (bb << 15n) & NOT_FILE_H;
    // Up 2, right 1
    attacks |= (bb << 17n) & NOT_FILE_A;
    // Up 1, left 2
    attacks |= (bb << 6n) & NOT_FILE_GH;
    // Up 1, right 2
    attacks |= (bb << 10n) & NOT_FILE_AB;
    // Down 2, left 1
    attacks |= (bb >> 17n) & NOT_FILE_H;
    // Down 2, right 1
    attacks |= (bb >> 15n) & NOT_FILE_A;
    // Down 1, left 2
    attacks |= (bb >> 10n) & NOT_FILE_GH;
    // Down 1, right 2
    attacks |= (bb >> 6n) & NOT_FILE_AB;

    KNIGHT_ATTACKS[sq] = attacks;
  }
}

/**
 * Initialize king attack table
 *
 * Kings can move one square in any of 8 directions
 */
function initializeKingAttacks(): void {
  for (let sq = 0; sq < 64; sq++) {
    const bb = squareBB(sq);
    let attacks = 0n;

    attacks |= shiftNorth(bb);
    attacks |= shiftSouth(bb);
    attacks |= shiftEast(bb);
    attacks |= shiftWest(bb);
    attacks |= shiftNorthEast(bb);
    attacks |= shiftNorthWest(bb);
    attacks |= shiftSouthEast(bb);
    attacks |= shiftSouthWest(bb);

    KING_ATTACKS[sq] = attacks;
  }
}

/**
 * Initialize pawn attack tables
 *
 * Pawns attack diagonally forward (different for white and black)
 * Note: These are attack patterns only, not push moves
 */
function initializePawnAttacks(): void {
  for (let sq = 0; sq < 64; sq++) {
    const bb = squareBB(sq);

    // White pawns attack diagonally upward (northeast and northwest)
    WHITE_PAWN_ATTACKS[sq] = shiftNorthEast(bb) | shiftNorthWest(bb);

    // Black pawns attack diagonally downward (southeast and southwest)
    BLACK_PAWN_ATTACKS[sq] = shiftSouthEast(bb) | shiftSouthWest(bb);
  }
}

/**
 * Initialize ray attacks for sliding pieces
 *
 * For each square, compute rays in all 8 directions
 * These are used by magic bitboard generation
 */
function initializeRayAttacks(): void {
  for (let sq = 0; sq < 64; sq++) {
    const file = fileOf(sq);
    const rank = rankOf(sq);

    // North ray
    let ray = 0n;
    for (let r = rank + 1; r < 8; r++) {
      ray |= squareBB(r * 8 + file);
    }
    RAY_ATTACKS[DIR_NORTH][sq] = ray;

    // South ray
    ray = 0n;
    for (let r = rank - 1; r >= 0; r--) {
      ray |= squareBB(r * 8 + file);
    }
    RAY_ATTACKS[DIR_SOUTH][sq] = ray;

    // East ray
    ray = 0n;
    for (let f = file + 1; f < 8; f++) {
      ray |= squareBB(rank * 8 + f);
    }
    RAY_ATTACKS[DIR_EAST][sq] = ray;

    // West ray
    ray = 0n;
    for (let f = file - 1; f >= 0; f--) {
      ray |= squareBB(rank * 8 + f);
    }
    RAY_ATTACKS[DIR_WEST][sq] = ray;

    // Northeast ray
    ray = 0n;
    for (let r = rank + 1, f = file + 1; r < 8 && f < 8; r++, f++) {
      ray |= squareBB(r * 8 + f);
    }
    RAY_ATTACKS[DIR_NORTH_EAST][sq] = ray;

    // Northwest ray
    ray = 0n;
    for (let r = rank + 1, f = file - 1; r < 8 && f >= 0; r++, f--) {
      ray |= squareBB(r * 8 + f);
    }
    RAY_ATTACKS[DIR_NORTH_WEST][sq] = ray;

    // Southeast ray
    ray = 0n;
    for (let r = rank - 1, f = file + 1; r >= 0 && f < 8; r--, f++) {
      ray |= squareBB(r * 8 + f);
    }
    RAY_ATTACKS[DIR_SOUTH_EAST][sq] = ray;

    // Southwest ray
    ray = 0n;
    for (let r = rank - 1, f = file - 1; r >= 0 && f >= 0; r--, f--) {
      ray |= squareBB(r * 8 + f);
    }
    RAY_ATTACKS[DIR_SOUTH_WEST][sq] = ray;
  }
}

/**
 * Get knight attacks from a square
 */
export function getKnightAttacks(square: number): bigint {
  return KNIGHT_ATTACKS[square];
}

/**
 * Get king attacks from a square
 */
export function getKingAttacks(square: number): bigint {
  return KING_ATTACKS[square];
}

/**
 * Get pawn attacks from a square for a given color
 */
export function getPawnAttacks(square: number, isWhite: boolean): bigint {
  return isWhite ? WHITE_PAWN_ATTACKS[square] : BLACK_PAWN_ATTACKS[square];
}

/**
 * Get ray attacks in a direction from a square
 */
export function getRayAttacks(direction: number, square: number): bigint {
  return RAY_ATTACKS[direction][square];
}

// Initialize tables immediately
initializeAttackTables();
