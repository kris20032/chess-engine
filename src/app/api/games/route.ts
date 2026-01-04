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
      include: {
        whitePlayer: {
          select: { id: true, name: true, image: true },
        },
        blackPlayer: {
          select: { id: true, name: true, image: true },
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

    const game = await prisma.game.create({
      data: {
        whiteId: whiteId || null,
        blackId: blackId || null,
        timeControl: timeControl || null,
        status: whiteId && blackId ? 'active' : 'waiting',
      },
      include: {
        whitePlayer: {
          select: { id: true, name: true, image: true },
        },
        blackPlayer: {
          select: { id: true, name: true, image: true },
        },
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
