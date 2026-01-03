/**
 * Transposition Table Module
 *
 * Caches position evaluations to avoid re-searching the same position.
 * Uses Zobrist hashing for position identification.
 */

import { Move } from '@/types/chess';

export enum TTEntryType {
  EXACT = 0,  // Exact score
  LOWER = 1,  // Lower bound (beta cutoff)
  UPPER = 2,  // Upper bound (alpha cutoff)
}

export interface TTEntry {
  zobristHash: bigint;
  depth: number;
  score: number;
  type: TTEntryType;
  bestMove: Move | null;
  age: number;
}

/**
 * Transposition Table
 * Uses a simple hash table with replacement strategy
 */
export class TranspositionTable {
  private table: (TTEntry | null)[];
  private size: number;
  private age: number;

  constructor(sizeMB: number = 64) {
    // Each entry is ~32 bytes
    const entrySize = 32;
    const numEntries = Math.floor((sizeMB * 1024 * 1024) / entrySize);

    // Round to power of 2 for fast modulo
    this.size = 1 << Math.floor(Math.log2(numEntries));
    this.table = new Array(this.size).fill(null);
    this.age = 0;
  }

  /**
   * Get index for hash (fast modulo using bitwise AND)
   */
  private getIndex(hash: bigint): number {
    return Number(hash & BigInt(this.size - 1));
  }

  /**
   * Store position in transposition table
   */
  store(
    zobristHash: bigint,
    depth: number,
    score: number,
    type: TTEntryType,
    bestMove: Move | null
  ): void {
    const index = this.getIndex(zobristHash);
    const existing = this.table[index];

    // Replace if:
    // 1. Slot is empty
    // 2. Same position (zobrist hash match)
    // 3. Deeper search
    // 4. Old entry (different age)
    if (
      !existing ||
      existing.zobristHash === zobristHash ||
      depth >= existing.depth ||
      existing.age < this.age
    ) {
      this.table[index] = {
        zobristHash,
        depth,
        score,
        type,
        bestMove,
        age: this.age,
      };
    }
  }

  /**
   * Probe transposition table
   */
  probe(zobristHash: bigint): TTEntry | null {
    const index = this.getIndex(zobristHash);
    const entry = this.table[index];

    if (entry && entry.zobristHash === zobristHash) {
      return entry;
    }

    return null;
  }

  /**
   * Clear the table
   */
  clear(): void {
    this.table.fill(null);
    this.age = 0;
  }

  /**
   * Increment age (call at start of new search)
   */
  incrementAge(): void {
    this.age++;
  }

  /**
   * Get table statistics
   */
  getStats(): { size: number; filled: number; usage: number } {
    const filled = this.table.filter(e => e !== null).length;
    return {
      size: this.size,
      filled,
      usage: (filled / this.size) * 100,
    };
  }
}

// Global transposition table instance
export const globalTT = new TranspositionTable(64);
