// Chess Types and Constants

export type Color = 'white' | 'black';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface Piece {
  type: PieceType;
  color: Color;
}

// Square indices: a1=0, b1=1, ..., h1=7, a2=8, ..., h8=63
export type Square = number; // 0-63

// Move encoding (16-bit):
// Bits 0-5: from square (0-63)
// Bits 6-11: to square (0-63)
// Bits 12-15: flags
export type Move = number;

// Move flags (bits 12-15)
export const MOVE_FLAGS = {
  QUIET: 0,
  DOUBLE_PAWN_PUSH: 1,
  KING_CASTLE: 2,
  QUEEN_CASTLE: 3,
  CAPTURE: 4,
  EN_PASSANT: 5,
  // Promotions
  KNIGHT_PROMO: 8,
  BISHOP_PROMO: 9,
  ROOK_PROMO: 10,
  QUEEN_PROMO: 11,
  KNIGHT_PROMO_CAPTURE: 12,
  BISHOP_PROMO_CAPTURE: 13,
  ROOK_PROMO_CAPTURE: 14,
  QUEEN_PROMO_CAPTURE: 15,
} as const;

// Castling rights bits
export const CASTLING = {
  WHITE_KINGSIDE: 1,   // K
  WHITE_QUEENSIDE: 2,  // Q
  BLACK_KINGSIDE: 4,   // k
  BLACK_QUEENSIDE: 8,  // q
} as const;

// Piece indices for bitboard array
export const PIECE_INDEX = {
  WHITE_PAWN: 0,
  WHITE_KNIGHT: 1,
  WHITE_BISHOP: 2,
  WHITE_ROOK: 3,
  WHITE_QUEEN: 4,
  WHITE_KING: 5,
  BLACK_PAWN: 6,
  BLACK_KNIGHT: 7,
  BLACK_BISHOP: 8,
  BLACK_ROOK: 9,
  BLACK_QUEEN: 10,
  BLACK_KING: 11,
} as const;

// Square names for convenience
export const SQUARES = {
  A1: 0, B1: 1, C1: 2, D1: 3, E1: 4, F1: 5, G1: 6, H1: 7,
  A2: 8, B2: 9, C2: 10, D2: 11, E2: 12, F2: 13, G2: 14, H2: 15,
  A3: 16, B3: 17, C3: 18, D3: 19, E3: 20, F3: 21, G3: 22, H3: 23,
  A4: 24, B4: 25, C4: 26, D4: 27, E4: 28, F4: 29, G4: 30, H4: 31,
  A5: 32, B5: 33, C5: 34, D5: 35, E5: 36, F5: 37, G5: 38, H5: 39,
  A6: 40, B6: 41, C6: 42, D6: 43, E6: 44, F6: 45, G6: 46, H6: 47,
  A7: 48, B7: 49, C7: 50, D7: 51, E7: 52, F7: 53, G7: 54, H7: 55,
  A8: 56, B8: 57, C8: 58, D8: 59, E8: 60, F8: 61, G8: 62, H8: 63,
} as const;

// File masks (columns a-h)
export const FILE_MASKS = {
  A: 0x0101010101010101n,
  B: 0x0202020202020202n,
  C: 0x0404040404040404n,
  D: 0x0808080808080808n,
  E: 0x1010101010101010n,
  F: 0x2020202020202020n,
  G: 0x4040404040404040n,
  H: 0x8080808080808080n,
} as const;

// Rank masks (rows 1-8)
export const RANK_MASKS = {
  1: 0x00000000000000FFn,
  2: 0x000000000000FF00n,
  3: 0x0000000000FF0000n,
  4: 0x00000000FF000000n,
  5: 0x000000FF00000000n,
  6: 0x0000FF0000000000n,
  7: 0x00FF000000000000n,
  8: 0xFF00000000000000n,
} as const;

// Starting FEN
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Game result
export type GameResult = 'white_wins' | 'black_wins' | 'draw' | 'ongoing';

export type DrawReason =
  | 'stalemate'
  | 'insufficient_material'
  | 'fifty_move_rule'
  | 'threefold_repetition'
  | 'agreement';

export type WinReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout';
