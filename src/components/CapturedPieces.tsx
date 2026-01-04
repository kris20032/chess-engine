'use client';

interface CapturedPiecesProps {
  fen: string;
  playerColor: 'white' | 'black';
}

const PIECE_VALUES = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
  P: 1, N: 3, B: 3, R: 5, Q: 9,
};

const PIECE_SYMBOLS = {
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
};

export function CapturedPieces({ fen, playerColor }: CapturedPiecesProps) {
  const calculateCaptured = () => {
    const startingPieces = {
      P: 8, N: 2, B: 2, R: 2, Q: 1,
      p: 8, n: 2, b: 2, r: 2, q: 1,
    };

    // Parse FEN to count pieces on board
    const fenParts = fen.split(' ');
    const position = fenParts[0];

    const currentPieces: Record<string, number> = {
      P: 0, N: 0, B: 0, R: 0, Q: 0,
      p: 0, n: 0, b: 0, r: 0, q: 0,
    };

    for (const char of position) {
      if (currentPieces.hasOwnProperty(char)) {
        currentPieces[char]++;
      }
    }

    // Calculate captured pieces
    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];

    // Black pieces captured by white
    (['p', 'n', 'b', 'r', 'q'] as const).forEach((piece) => {
      const captured = startingPieces[piece] - currentPieces[piece];
      for (let i = 0; i < captured; i++) {
        whiteCaptured.push(piece);
      }
    });

    // White pieces captured by black
    (['P', 'N', 'B', 'R', 'Q'] as const).forEach((piece) => {
      const captured = startingPieces[piece] - currentPieces[piece];
      for (let i = 0; i < captured; i++) {
        blackCaptured.push(piece);
      }
    });

    // Sort by value (descending)
    const sortByValue = (a: string, b: string) =>
      PIECE_VALUES[b as keyof typeof PIECE_VALUES] - PIECE_VALUES[a as keyof typeof PIECE_VALUES];

    whiteCaptured.sort(sortByValue);
    blackCaptured.sort(sortByValue);

    // Calculate material advantage
    const whiteValue = whiteCaptured.reduce((sum, p) => sum + PIECE_VALUES[p as keyof typeof PIECE_VALUES], 0);
    const blackValue = blackCaptured.reduce((sum, p) => sum + PIECE_VALUES[p as keyof typeof PIECE_VALUES], 0);

    return {
      whiteCaptured,
      blackCaptured,
      whiteAdvantage: whiteValue - blackValue,
    };
  };

  const { whiteCaptured, blackCaptured, whiteAdvantage } = calculateCaptured();
  const myCaptured = playerColor === 'white' ? whiteCaptured : blackCaptured;
  const opponentCaptured = playerColor === 'white' ? blackCaptured : whiteCaptured;
  const myAdvantage = playerColor === 'white' ? whiteAdvantage : -whiteAdvantage;

  return (
    <div className="space-y-2">
      {/* My captured pieces */}
      <div className="flex items-center gap-2 min-h-[32px]">
        <span className="text-xs text-slate-400 w-16">You:</span>
        <div className="flex flex-wrap gap-1">
          {myCaptured.length > 0 ? (
            myCaptured.map((piece, i) => (
              <span key={i} className="text-2xl opacity-80">
                {PIECE_SYMBOLS[piece as keyof typeof PIECE_SYMBOLS]}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-600">None</span>
          )}
        </div>
        {myAdvantage > 0 && (
          <span className="text-sm text-green-400 font-bold ml-auto">
            +{myAdvantage}
          </span>
        )}
      </div>

      {/* Opponent's captured pieces */}
      <div className="flex items-center gap-2 min-h-[32px]">
        <span className="text-xs text-slate-400 w-16">Opp:</span>
        <div className="flex flex-wrap gap-1">
          {opponentCaptured.length > 0 ? (
            opponentCaptured.map((piece, i) => (
              <span key={i} className="text-2xl opacity-80">
                {PIECE_SYMBOLS[piece as keyof typeof PIECE_SYMBOLS]}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-600">None</span>
          )}
        </div>
        {myAdvantage < 0 && (
          <span className="text-sm text-red-400 font-bold ml-auto">
            {myAdvantage}
          </span>
        )}
      </div>
    </div>
  );
}
