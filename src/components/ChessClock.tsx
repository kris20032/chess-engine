'use client';

import { useEffect, useState } from 'react';

interface ChessClockProps {
  initialTime: number; // in seconds
  increment: number; // in seconds
  isActive: boolean;
  playerColor: 'white' | 'black';
  playerName?: string;
  onTimeOut?: () => void;
}

export function ChessClock({
  initialTime,
  increment,
  isActive,
  playerColor,
  playerName,
  onTimeOut,
}: ChessClockProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          onTimeOut?.();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeOut]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 0) return 'text-red-600';
    if (timeLeft <= 30) return 'text-red-400';
    if (timeLeft <= 60) return 'text-orange-400';
    return 'text-white';
  };

  const isLowTime = timeLeft <= 60 && timeLeft > 0;

  return (
    <div
      className={`
        p-4 rounded-xl border-2 transition-all
        ${isActive
          ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-500 shadow-lg shadow-green-500/50'
          : 'bg-slate-800 border-slate-700'
        }
        ${isLowTime && isActive ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{playerColor === 'white' ? '⚪' : '⚫'}</span>
          <span className="text-sm text-slate-300 font-semibold">
            {playerName || (playerColor === 'white' ? 'White' : 'Black')}
          </span>
        </div>
        {isActive && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </div>
      <div className={`text-4xl font-mono font-bold ${getTimeColor()} tabular-nums`}>
        {formatTime(timeLeft)}
      </div>
      {increment > 0 && (
        <div className="text-xs text-slate-400 mt-1">
          +{increment}s increment
        </div>
      )}
    </div>
  );
}
