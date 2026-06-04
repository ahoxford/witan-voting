import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitRoomUpdate } from "@/lib/socket-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const room = await prisma.debateRoom.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Delete all votes, participants, and snapshots; reset status
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { roomId } }),
    prisma.participantSession.deleteMany({ where: { roomId } }),
    prisma.voteSnapshot.deleteMany({ where: { roomId } }),
    prisma.debateRoom.update({
      where: { id: roomId },
      data: { status: "WAITING" },
    }),
  ]);

  const updated = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: { options: { orderBy: { order: "asc" } } },
  });

  emitRoomUpdate(roomId, "room-reset", { room: updated });

  return NextResponse.json({ success: true, room: updated });
}
