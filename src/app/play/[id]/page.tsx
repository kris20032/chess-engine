'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveHistory } from '@/components/MoveHistory';
import { ChessClock } from '@/components/ChessClock';
import { CapturedPieces } from '@/components/CapturedPieces';
import { useSocket } from '@/hooks/useSocket';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';

export default function MultiplayerGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerName = searchParams.get('player') || 'Guest';

  const { socket, isConnected } = useSocket();
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [whiteTime, setWhiteTime] = useState<number>(600); // Default 10 minutes
  const [blackTime, setBlackTime] = useState<number>(600);
  const [timeIncrement, setTimeIncrement] = useState<number>(0);
  const [drawOffered, setDrawOffered] = useState(false);

  // Fetch game data and determine player color
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        const gameData = await res.json();

        console.log('Game data:', gameData);
        console.log('Player name:', playerName);

        // Generate a unique player ID using timestamp and random string
        const uniquePlayerId = `${playerName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store player ID in sessionStorage to maintain identity across page reloads
        const storageKey = `player-${gameId}`;
        const existingPlayerId = sessionStorage.getItem(storageKey);

        console.log('Existing player ID from storage:', existingPlayerId);
        console.log('Game whiteId:', gameData.whiteId);
        console.log('Game blackId:', gameData.blackId);

        // Determine player color based on existing assignments
        if (existingPlayerId && (gameData.whiteId === existingPlayerId || gameData.blackId === existingPlayerId)) {
          // Player has already joined this game - verify which color they are
          if (gameData.whiteId === existingPlayerId) {
            console.log('Already assigned as white');
            setPlayerColor('white');
            setGame(gameData);
            setLoading(false);
            return;
          } else if (gameData.blackId === existingPlayerId) {
            console.log('Already assigned as black');
            setPlayerColor('black');
            setGame(gameData);
            setLoading(false);
            return;
          }
        }

        // Clear old sessionStorage if it doesn't match current game state
        if (existingPlayerId) {
          console.log('Clearing stale sessionStorage');
          sessionStorage.removeItem(storageKey);
        }

        // Assign player to an open slot - strict order: white first, then black
        if (!gameData.whiteId) {
          console.log('Assigning as white player');
          sessionStorage.setItem(storageKey, uniquePlayerId);
          const updateRes = await fetch(`/api/games/${gameId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whiteId: uniquePlayerId }),
          });
          const updatedGame = await updateRes.json();
          setGame(updatedGame);
          setPlayerColor('white');
        } else if (!gameData.blackId) {
          console.log('Assigning as black player (white is already taken)');
          sessionStorage.setItem(storageKey, uniquePlayerId);
          const updateRes = await fetch(`/api/games/${gameId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blackId: uniquePlayerId }),
          });
          const updatedGame = await updateRes.json();
          setGame(updatedGame);
          setPlayerColor('black');
        } else {
          console.log('Both slots taken, spectating as white view');
          // Spectator mode - default to white view
          setPlayerColor('white');
          setGame(gameData);
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, playerName]);

  // Parse time control and initialize clocks
  useEffect(() => {
    if (!game?.timeControl) return;

    // Parse time control format "10+0" or "5+3" (minutes+increment)
    const [minutes, increment] = game.timeControl.split('+').map(Number);
    const initialSeconds = minutes * 60;

    setWhiteTime(game.whiteTimeLeft ?? initialSeconds);
    setBlackTime(game.blackTimeLeft ?? initialSeconds);
    setTimeIncrement(increment);
  }, [game]);

  // Listen for draw offers
  useEffect(() => {
    if (!socket) return;

    socket.on('draw_offered', () => {
      setDrawOffered(true);
    });

    return () => {
      socket.off('draw_offered');
    };
  }, [socket]);

  const {
    fen,
    gameState,
    selectedSquare,
    setSelectedSquare,
    legalMoves,
    makeMove,
    sideToMove,
    isInCheck,
    isMyTurn,
    moves,
  } = useMultiplayerGame(gameId, playerColor || 'white');

  const getStatusMessage = () => {
    if (gameState.status === 'checkmate') {
      return `Checkmate! ${gameState.winner === 'white' ? 'White' : 'Black'} wins!`;
    }
    if (gameState.status === 'stalemate') return 'Stalemate! Draw.';
    if (gameState.status.startsWith('draw_')) return 'Draw!';
    if (isInCheck) return `${sideToMove === 'white' ? 'White' : 'Black'} is in check!`;
    return `${sideToMove === 'white' ? 'White' : 'Black'} to move`;
  };

  if (loading || !playerColor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-2xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            ♔ Multiplayer Chess ♚
          </h1>
          <p className="text-lg text-slate-300">
            Playing as {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
            {' • '}
            {isConnected ? (
              <span className="text-green-400">● Connected</span>
            ) : (
              <span className="text-red-400">● Disconnected</span>
            )}
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr,auto] gap-8 items-start">
          {/* Chess Board */}
          <div className="order-2 lg:order-1">
            {/* Opponent's Clock (top) */}
            <div className="mb-4">
              <ChessClock
                initialTime={playerColor === 'black' ? whiteTime : blackTime}
                increment={timeIncrement}
                isActive={gameState.status === 'ongoing' && !isMyTurn}
                playerColor={playerColor === 'black' ? 'white' : 'black'}
                playerName={playerColor === 'black'
                  ? (game?.whiteId?.split('-')[0] || 'Opponent')
                  : (game?.blackId?.split('-')[0] || 'Opponent')
                }
                gameId={gameId}
              />
            </div>

            <ChessBoard
              fen={fen}
              onMove={makeMove}
              selectedSquare={selectedSquare}
              onSquareClick={setSelectedSquare}
              legalMoves={legalMoves}
              flipped={playerColor === 'black'}
              isInteractive={isMyTurn && gameState.status === 'ongoing'}
              isInCheck={isInCheck}
            />

            {/* Player's Clock (bottom) */}
            <div className="mt-4">
              <ChessClock
                initialTime={playerColor === 'white' ? whiteTime : blackTime}
                increment={timeIncrement}
                isActive={gameState.status === 'ongoing' && isMyTurn}
                playerColor={playerColor || 'white'}
                playerName={playerName}
                gameId={gameId}
              />
            </div>

            {/* Status Bar */}
            <div className="mt-4 p-4 bg-slate-800 rounded-lg text-center">
              <div className="text-xl font-semibold">
                {getStatusMessage()}
              </div>
              {!isMyTurn && gameState.status === 'ongoing' && (
                <div className="text-sm text-slate-400 mt-2">
                  Waiting for opponent...
                </div>
              )}
            </div>

            {/* Game Over Modal */}
            {gameState.status !== 'ongoing' && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm z-50 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-10 rounded-3xl shadow-2xl border-4 border-amber-500 max-w-md w-full mx-4 animate-in zoom-in-95 duration-500">
                  {gameState.status === 'checkmate' && (
                    <>
                      <div className="text-6xl text-center mb-6 animate-bounce">
                        {gameState.winner === playerColor ? '🎉' : '😢'}
                      </div>
                      <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                        {gameState.winner === playerColor ? 'You Won!' : 'You Lost!'}
                      </h2>
                      <p className="text-xl text-center text-slate-300 mb-8">
                        Checkmate! {gameState.winner === 'white' ? 'White' : 'Black'} wins!
                      </p>
                    </>
                  )}
                  {gameState.status === 'stalemate' && (
                    <>
                      <div className="text-6xl text-center mb-6">🤝</div>
                      <h2 className="text-4xl font-bold text-center mb-4 text-amber-400">
                        Stalemate!
                      </h2>
                      <p className="text-xl text-center text-slate-300 mb-8">
                        The game is a draw.
                      </p>
                    </>
                  )}
                  <div className="flex gap-4">
                    <button
                      onClick={() => router.push('/lobby')}
                      className="flex-1 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                      Back to Lobby
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Draw Offer Modal */}
            {drawOffered && gameState.status === 'ongoing' && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm z-50 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-8 rounded-3xl shadow-2xl border-4 border-orange-500 max-w-md w-full mx-4">
                  <div className="text-5xl text-center mb-4">🤝</div>
                  <h2 className="text-3xl font-bold text-center mb-4 text-amber-400">
                    Draw Offered
                  </h2>
                  <p className="text-lg text-center text-slate-300 mb-6">
                    Your opponent has offered a draw.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        socket?.emit('accept_draw', { gameId });
                        setDrawOffered(false);
                      }}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setDrawOffered(false)}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Game Info Panel */}
          <div className="order-1 lg:order-2 lg:w-80 space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-amber-400">Game Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Game ID:</span>
                  <span className="font-mono text-xs">{gameId.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Your Color:</span>
                  <span className="font-semibold">
                    {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={isMyTurn ? 'text-green-400 font-semibold' : ''}>
                    {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                  </span>
                </div>
              </div>

              {/* Captured Pieces */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-slate-400 mb-3">Captured Pieces</h4>
                <CapturedPieces fen={fen} playerColor={playerColor || 'white'} />
              </div>
            </div>

            <div className="h-96">
              <MoveHistory moves={moves} />
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-amber-400">Actions</h3>
              <div className="space-y-3">
                {gameState.status === 'ongoing' && (
                  <>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to resign?')) {
                          socket?.emit('resign', { gameId, resigningColor: playerColor });
                        }
                      }}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all"
                    >
                      🏳️ Resign
                    </button>
                    <button
                      onClick={() => {
                        socket?.emit('offer_draw', { gameId, offeringColor: playerColor });
                      }}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold transition-all"
                    >
                      🤝 Offer Draw
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push('/lobby')}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
                >
                  ← Back to Lobby
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all"
                >
                  🤖 Play vs AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
