'use client';

import { useEffect, useRef } from 'react';

interface Move {
  id: string;
  moveNum: number;
  san: string | null;
  uci: string;
}

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex?: number;
}

export function MoveHistory({ moves, currentMoveIndex }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new moves are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves by pairs (white move + black move)
  const movePairs: Array<{ moveNum: number; white: Move | null; black: Move | null }> = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const pairIndex = Math.floor(i / 2);

    if (!movePairs[pairIndex]) {
      movePairs[pairIndex] = { moveNum: Math.floor(i / 2) + 1, white: null, black: null };
    }

    if (i % 2 === 0) {
      movePairs[pairIndex].white = move;
    } else {
      movePairs[pairIndex].black = move;
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border-2 border-slate-700 h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-amber-400">Move History</h3>

      {moves.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          No moves yet
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar"
        >
          {movePairs.map((pair, index) => (
            <div
              key={index}
              className="flex items-center gap-3 hover:bg-slate-700 rounded px-2 py-1 transition-colors"
            >
              <span className="text-slate-500 font-mono text-sm w-8">
                {pair.moveNum}.
              </span>
              <div className="flex gap-3 flex-1">
                <span className="text-white font-mono text-sm w-16">
                  {pair.white?.san || pair.white?.uci || '-'}
                </span>
                <span className="text-white font-mono text-sm w-16">
                  {pair.black?.san || pair.black?.uci || ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}
