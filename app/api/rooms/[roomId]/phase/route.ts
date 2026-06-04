import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitRoomUpdate } from "@/lib/socket-server";
import { getAggregateResults, statusToPhase } from "@/lib/votes";
import { RoomStatus } from "@prisma/client";

// Valid phase transitions
const TRANSITIONS: Record<RoomStatus, RoomStatus | null> = {
  WAITING: RoomStatus.PRE_VOTE,
  PRE_VOTE: RoomStatus.LIVE_VOTE,
  LIVE_VOTE: RoomStatus.POST_VOTE,
  POST_VOTE: RoomStatus.CLOSED,
  CLOSED: null,
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const room = await prisma.debateRoom.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const nextStatus = TRANSITIONS[room.status];
  if (!nextStatus) {
    return NextResponse.json({ error: "Room is already closed" }, { status: 400 });
  }

  // Snapshot current results before advancing
  const currentPhase = statusToPhase(room.status);
  if (currentPhase) {
    const results = await getAggregateResults(roomId, currentPhase);
    await prisma.voteSnapshot.create({
      data: { roomId, phase: currentPhase, data: results },
    });
  }

  const updated = await prisma.debateRoom.update({
    where: { id: roomId },
    data: { status: nextStatus },
    include: { options: { orderBy: { order: "asc" } } },
  });

  const newPhase = statusToPhase(nextStatus);
  const results = newPhase ? await getAggregateResults(roomId, newPhase) : [];

  emitRoomUpdate(roomId, "room-update", { room: updated, results });

  return NextResponse.json({ room: updated, results });
}
