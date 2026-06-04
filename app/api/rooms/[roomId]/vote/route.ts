import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitRoomUpdate } from "@/lib/socket-server";
import { getAggregateResults, statusToPhase } from "@/lib/votes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { sessionId, optionId } = await req.json();

  if (!sessionId?.trim() || !optionId?.trim()) {
    return NextResponse.json({ error: "sessionId and optionId required" }, { status: 400 });
  }

  const room = await prisma.debateRoom.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const phase = statusToPhase(room.status);
  if (!phase) {
    return NextResponse.json({ error: "Voting is not open" }, { status: 400 });
  }

  // Verify option belongs to room
  const option = await prisma.voteOption.findFirst({
    where: { id: optionId, roomId },
  });
  if (!option) return NextResponse.json({ error: "Invalid option" }, { status: 400 });

  // Upsert participant
  const participant = await prisma.participantSession.upsert({
    where: { sessionId },
    update: {},
    create: { sessionId, roomId },
  });

  // Upsert vote (one per participant per phase)
  await prisma.vote.upsert({
    where: { participantId_phase: { participantId: participant.id, phase } },
    update: { optionId },
    create: { participantId: participant.id, roomId, optionId, phase },
  });

  const results = await getAggregateResults(roomId, phase);
  emitRoomUpdate(roomId, "results-update", { results, phase });

  return NextResponse.json({ success: true, results });
}
