import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAggregateResults } from "@/lib/votes";
import { VotePhase } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const format = req.nextUrl.searchParams.get("format") || "json";

  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const phases = await Promise.all(
    [VotePhase.PRE, VotePhase.LIVE, VotePhase.FINAL].map(async (phase) => ({
      phase,
      results: await getAggregateResults(roomId, phase),
    }))
  );

  const exportData = {
    room: { id: room.id, title: room.title, question: room.question, status: room.status },
    phases,
    exportedAt: new Date().toISOString(),
  };

  if (format === "csv") {
    const rows = ["phase,option,count,percentage"];
    for (const { phase, results } of phases) {
      for (const r of results) {
        rows.push(`${phase},${JSON.stringify(r.label)},${r.count},${r.percentage}`);
      }
    }
    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="results-${roomId}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="results-${roomId}.json"`,
    },
  });
}
