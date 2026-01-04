'use client';

interface EvaluationBarProps {
  /**
   * Evaluation score in centipawns from white's perspective
   * Positive = white is better, negative = black is better
   */
  score: number;
  /** Optional opening name to display */
  openingName?: string | null;
}

export function EvaluationBar({ score, openingName }: EvaluationBarProps) {
  // Convert centipawns to pawns for display
  const pawns = score / 100;

  // Cap the display at ±10 pawns for the visual bar
  const cappedScore = Math.max(-10, Math.min(10, pawns));

  // Calculate percentage for white (0-100%)
  // At -10 pawns: 0%, at 0: 50%, at +10: 100%
  const whitePercentage = ((cappedScore + 10) / 20) * 100;

  // Format score for display
  const formatScore = (score: number): string => {
    const abs = Math.abs(score);
    if (abs >= 100) return 'M'; // Mate detected (score > 100 pawns)
    return abs.toFixed(1);
  };

  const displayScore = formatScore(pawns);
  const isWhiteWinning = pawns > 0;
  const isMate = Math.abs(pawns) >= 100;

  return (
    <div className="w-full space-y-2">
      {/* Opening name */}
      {openingName && (
        <div className="text-center text-sm text-amber-400 font-semibold">
          {openingName}
        </div>
      )}

      {/* Evaluation bar */}
      <div className="relative h-8 bg-slate-700 rounded-lg overflow-hidden border border-slate-600">
        {/* White's advantage (from left) */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-100 to-white transition-all duration-300"
          style={{ width: `${whitePercentage}%` }}
        />

        {/* Center line at 50% */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500 transform -translate-x-1/2" />

        {/* Score display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`
              px-3 py-0.5 rounded-full text-xs font-bold
              ${isWhiteWinning
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-800'
              }
              ${isMate ? 'animate-pulse' : ''}
            `}
          >
            {isMate ? (
              <span>
                {isWhiteWinning ? '⚪' : '⚫'} {displayScore}
              </span>
            ) : pawns === 0 ? (
              '='
            ) : (
              <span>
                {isWhiteWinning ? '+' : ''}{displayScore}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>⚫ Black</span>
        <span className="text-slate-500">
          {Math.abs(pawns) < 0.5 ? 'Equal position' :
           Math.abs(pawns) < 1.5 ? 'Slight advantage' :
           Math.abs(pawns) < 3.0 ? 'Clear advantage' :
           isMate ? 'Checkmate!' : 'Winning'}
        </span>
        <span>White ⚪</span>
      </div>
    </div>
  );
}
