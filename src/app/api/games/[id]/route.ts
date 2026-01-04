import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/games/[id] - Get a specific game
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
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

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

// PATCH /api/games/[id] - Update a game (join, resign, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { whiteId, blackId, status, result } = body;

    const updateData: any = {};

    if (whiteId !== undefined) updateData.whiteId = whiteId;
    if (blackId !== undefined) updateData.blackId = blackId;
    if (status !== undefined) updateData.status = status;
    if (result !== undefined) updateData.result = result;

    // If both players are assigned, set status to active
    if (whiteId && blackId && !status) {
      updateData.status = 'active';
    }

    const game = await prisma.game.update({
      where: { id },
      data: updateData,
      include: {
        whitePlayer: {
          select: { id: true, name: true, image: true },
        },
        blackPlayer: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[id] - Delete a game
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.game.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    );
  }
}
