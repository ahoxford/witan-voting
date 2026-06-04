import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rooms = await prisma.debateRoom.findMany({
    orderBy: { createdAt: "desc" },
    include: { options: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const { title, question, options } = await req.json();

  if (!title?.trim() || !question?.trim() || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json(
      { error: "title, question, and at least 2 options required" },
      { status: 400 }
    );
  }

  const room = await prisma.debateRoom.create({
    data: {
      title: title.trim(),
      question: question.trim(),
      options: {
        create: options.map((label: string, i: number) => ({
          label: label.trim(),
          order: i,
        })),
      },
    },
    include: { options: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(room, { status: 201 });
}
