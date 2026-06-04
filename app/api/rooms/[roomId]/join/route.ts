import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { sessionId } = await req.json();

  if (!sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Upsert participant session
  const participant = await prisma.participantSession.upsert({
    where: { sessionId },
    update: {},
    create: { sessionId, roomId },
  });

  // Get existing votes for this participant
  const votes = await prisma.vote.findMany({
    where: { participantId: participant.id },
  });

  return NextResponse.json({ participant, room, votes });
}
