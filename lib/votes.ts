import { prisma } from "./prisma";
import { VotePhase } from "@prisma/client";

export type AggregateResult = {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
};

export async function getAggregateResults(
  roomId: string,
  phase: VotePhase
): Promise<AggregateResult[]> {
  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!room) return [];

  const votes = await prisma.vote.groupBy({
    by: ["optionId"],
    where: { roomId, phase },
    _count: { optionId: true },
  });

  const total = votes.reduce((sum, v) => sum + v._count.optionId, 0);

  return room.options.map((opt) => {
    const match = votes.find((v) => v.optionId === opt.id);
    const count = match ? match._count.optionId : 0;
    return {
      optionId: opt.id,
      label: opt.label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

export function statusToPhase(status: string): VotePhase | null {
  switch (status) {
    case "PRE_VOTE":
      return VotePhase.PRE;
    case "LIVE_VOTE":
      return VotePhase.LIVE;
    case "POST_VOTE":
      return VotePhase.FINAL;
    default:
      return null;
  }
}
