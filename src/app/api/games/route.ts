import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/games - List all available games
export async function GET() {
  try {
    const games = await prisma.game.findMany({
      where: {
        status: {
          in: ['waiting', 'active'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// POST /api/games - Create a new game
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { whiteId, blackId, timeControl } = body;

    // Parse time control to set initial times
    let whiteTimeLeft = null;
    let blackTimeLeft = null;
    if (timeControl) {
      const [minutes] = timeControl.split('+').map(Number);
      const seconds = minutes * 60;
      whiteTimeLeft = seconds;
      blackTimeLeft = seconds;
    }

    const game = await prisma.game.create({
      data: {
        whiteId: whiteId || null,
        blackId: blackId || null,
        timeControl: timeControl || null,
        whiteTimeLeft,
        blackTimeLeft,
        status: whiteId && blackId ? 'active' : 'waiting',
      },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
