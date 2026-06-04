import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAggregateResults, statusToPhase } from "@/lib/votes";
import { VotePhase } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const currentPhase = statusToPhase(room.status);
  const currentResults = currentPhase
    ? await getAggregateResults(roomId, currentPhase)
    : [];

  // For results page, get all phases
  const allPhases = await Promise.all(
    [VotePhase.PRE, VotePhase.LIVE, VotePhase.FINAL].map(async (phase) => ({
      phase,
      results: await getAggregateResults(roomId, phase),
    }))
  );

  return NextResponse.json({ room, currentPhase, currentResults, allPhases });
}
