'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';

interface Game {
  id: string;
  whiteId: string | null;
  blackId: string | null;
  status: string;
  timeControl: string | null;
  createdAt: string;
  whitePlayer?: { id: string; name: string | null; image: string | null } | null;
  blackPlayer?: { id: string; name: string | null; image: string | null } | null;
}

export default function LobbyPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [playerName, setPlayerName] = useState('Guest');

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();

      // Check if the response is an array
      if (Array.isArray(data)) {
        setGames(data);
      } else {
        console.error('Invalid response from API:', data);
        setGames([]);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeControl: '10+0',
        }),
      });

      const game = await res.json();
      router.push(`/play/${game.id}?player=${playerName}`);
    } catch (error) {
      console.error('Error creating game:', error);
      setCreating(false);
    }
  };

  const joinGame = (gameId: string) => {
    router.push(`/play/${gameId}?player=${playerName}`);
  };

  const playVsAI = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            ♔ Chess Multiplayer Lobby ♚
          </h1>
          <p className="text-xl text-slate-300">
            {isConnected ? (
              <span className="text-green-400">● Connected</span>
            ) : (
              <span className="text-red-400">● Disconnected</span>
            )}
          </p>
        </header>

        {/* Player Name Input */}
        <div className="mb-8 flex justify-center gap-4 items-center">
          <label className="text-lg font-semibold">Your Name:</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="px-4 py-2 bg-slate-800 border-2 border-slate-600 rounded-lg focus:border-amber-500 outline-none"
            placeholder="Enter your name"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={createGame}
            disabled={creating || !playerName.trim()}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : '+ Create New Game'}
          </button>
          <button
            onClick={playVsAI}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95"
          >
            🤖 Play vs AI
          </button>
        </div>

        {/* Games List */}
        <div className="bg-slate-800 rounded-2xl p-6 border-2 border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-amber-400">Available Games</h2>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading games...</div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No games available. Create one to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-700 rounded-xl p-6 hover:bg-slate-650 transition-colors border border-slate-600"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-lg font-semibold">
                          {game.status === 'waiting' ? '🟡 Waiting for opponent' : '🟢 In Progress'}
                        </span>
                        {game.timeControl && (
                          <span className="text-sm text-slate-400">⏱️ {game.timeControl}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="flex gap-6">
                          <span>
                            ⚪ White: {game.whitePlayer?.name || 'Waiting...'}
                          </span>
                          <span>
                            ⚫ Black: {game.blackPlayer?.name || 'Waiting...'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Created: {new Date(game.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      {game.status === 'waiting' && (
                        <button
                          onClick={() => joinGame(game.id)}
                          disabled={!playerName.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Join Game
                        </button>
                      )}
                      {game.status === 'active' && (
                        <button
                          onClick={() => joinGame(game.id)}
                          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold transition-all"
                        >
                          Spectate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
