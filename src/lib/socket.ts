import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './prisma';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a game room
    socket.on('join_game', async (gameId: string) => {
      socket.join(`game:${gameId}`);
      console.log(`Socket ${socket.id} joined game ${gameId}`);

      // Send current game state
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          moves: {
            orderBy: { moveNum: 'asc' },
          },
          whitePlayer: {
            select: { id: true, name: true, image: true },
          },
          blackPlayer: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      if (game) {
        socket.emit('game_state', game);
      }
    });

    // Leave a game room
    socket.on('leave_game', (gameId: string) => {
      socket.leave(`game:${gameId}`);
      console.log(`Socket ${socket.id} left game ${gameId}`);
    });

    // Handle move submission
    socket.on('make_move', async (data: {
      gameId: string;
      from: string;
      to: string;
      promotion?: string;
      uci: string;
      fen: string;
      moveNum: number;
    }) => {
      try {
        const { gameId, from, to, promotion, uci, fen, moveNum } = data;

        // Save move to database
        const move = await prisma.move.create({
          data: {
            gameId,
            from,
            to,
            promotion,
            uci,
            fen,
            moveNum,
          },
        });

        // Update game FEN
        await prisma.game.update({
          where: { id: gameId },
          data: { fen },
        });

        // Broadcast move to all players in the game
        io!.to(`game:${gameId}`).emit('move_made', {
          move,
          fen,
        });
      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('move_error', { error: 'Failed to make move' });
      }
    });

    // Handle game end
    socket.on('end_game', async (data: {
      gameId: string;
      result: string;
      status: string;
    }) => {
      try {
        const { gameId, result, status } = data;

        await prisma.game.update({
          where: { id: gameId },
          data: { result, status },
        });

        io!.to(`game:${gameId}`).emit('game_ended', { result, status });
      } catch (error) {
        console.error('Error ending game:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
