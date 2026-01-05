require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('./src/generated/prisma');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a game room
    socket.on('join_game', async (gameId) => {
      socket.join(`game:${gameId}`);
      console.log(`Socket ${socket.id} joined game ${gameId}`);

      // Send current game state
      try {
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            moves: {
              orderBy: { moveNum: 'asc' },
            },
          },
        });

        if (game) {
          socket.emit('game_state', game);
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    });

    // Leave a game room
    socket.on('leave_game', (gameId) => {
      socket.leave(`game:${gameId}`);
      console.log(`Socket ${socket.id} left game ${gameId}`);
    });

    // Handle move submission
    socket.on('make_move', async (data) => {
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
        io.to(`game:${gameId}`).emit('move_made', {
          move,
          fen,
        });
      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('move_error', { error: 'Failed to make move' });
      }
    });

    // Handle game end
    socket.on('end_game', async (data) => {
      try {
        const { gameId, result, status } = data;

        await prisma.game.update({
          where: { id: gameId },
          data: { result, status },
        });

        io.to(`game:${gameId}`).emit('game_ended', { result, status });
      } catch (error) {
        console.error('Error ending game:', error);
      }
    });

    // Handle resignation
    socket.on('resign', async (data) => {
      try {
        const { gameId, resigningColor } = data;
        const result = resigningColor === 'white' ? 'black_win' : 'white_win';

        await prisma.game.update({
          where: { id: gameId },
          data: { result, status: 'completed' },
        });

        io.to(`game:${gameId}`).emit('game_ended', { result, status: 'completed', reason: 'resignation' });
      } catch (error) {
        console.error('Error handling resignation:', error);
      }
    });

    // Handle draw offer
    socket.on('offer_draw', async (data) => {
      try {
        const { gameId, offeringColor } = data;

        // Broadcast draw offer to opponent
        socket.to(`game:${gameId}`).emit('draw_offered', { offeringColor });
      } catch (error) {
        console.error('Error offering draw:', error);
      }
    });

    // Handle draw acceptance
    socket.on('accept_draw', async (data) => {
      try {
        const { gameId } = data;

        await prisma.game.update({
          where: { id: gameId },
          data: { result: 'draw', status: 'completed' },
        });

        io.to(`game:${gameId}`).emit('game_ended', { result: 'draw', status: 'completed', reason: 'agreement' });
      } catch (error) {
        console.error('Error accepting draw:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
