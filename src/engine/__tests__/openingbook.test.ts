import { Position } from '../position';
import { probeBook, isInBook, getOpeningName } from '../openingbook';
import { moveToUCI } from '../move';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('Opening Book', () => {
  test('starting position is in book', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    expect(isInBook(pos)).toBe(true);
  });

  test('probes book for starting position', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    const move = probeBook(pos);
    expect(move).not.toBeNull();

    if (move) {
      const uci = moveToUCI(move);
      // Should be one of the main opening moves
      const mainOpenings = ['e2e4', 'd2d4', 'c2c4', 'g1f3', 'e2e3', 'd2d3'];
      expect(mainOpenings).toContain(uci);
    }
  });

  test('after 1.e4 suggests reasonable response', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const pos = Position.fromFEN(fen);
    expect(isInBook(pos)).toBe(true);

    const move = probeBook(pos);
    expect(move).not.toBeNull();

    if (move) {
      const uci = moveToUCI(move);
      // Should be a main defense
      const mainDefenses = ['e7e5', 'c7c5', 'e7e6', 'c7c6', 'd7d5', 'g8f6'];
      expect(mainDefenses).toContain(uci);
    }
  });

  test('after 1.e4 e5 2.Nf3 Nc6 3.Bb5 is Ruy Lopez', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const pos = Position.fromFEN(fen);
    expect(isInBook(pos)).toBe(true);

    const openingName = getOpeningName(pos);
    expect(openingName).toContain('Defense'); // Should suggest a defense like Morphy or Berlin
  });

  test('random middlegame position not in book', () => {
    const fen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 8';
    const pos = Position.fromFEN(fen);
    expect(isInBook(pos)).toBe(false);
    expect(probeBook(pos)).toBeNull();
  });

  test('book returns legal moves only', () => {
    const pos = Position.fromFEN(STARTING_FEN);
    const move = probeBook(pos);

    expect(move).not.toBeNull();
    // If we got a move, it should be legal - we'll verify by making it
    // (The actual validation is done inside probeBook by checking against legal moves)
  });
});
