-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'PRE_VOTE', 'LIVE_VOTE', 'POST_VOTE', 'CLOSED');

-- CreateEnum
CREATE TYPE "VotePhase" AS ENUM ('PRE', 'LIVE', 'FINAL');

-- CreateTable
CREATE TABLE "DebateRoom" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "VoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "phase" "VotePhase" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteSnapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "phase" "VotePhase" NOT NULL,
    "data" JSONB NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoteOption_roomId_idx" ON "VoteOption"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_sessionId_key" ON "ParticipantSession"("sessionId");

-- CreateIndex
CREATE INDEX "ParticipantSession_roomId_idx" ON "ParticipantSession"("roomId");

-- CreateIndex
CREATE INDEX "ParticipantSession_sessionId_idx" ON "ParticipantSession"("sessionId");

-- CreateIndex
CREATE INDEX "Vote_roomId_phase_idx" ON "Vote"("roomId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_participantId_phase_key" ON "Vote"("participantId", "phase");

-- CreateIndex
CREATE INDEX "VoteSnapshot_roomId_phase_idx" ON "VoteSnapshot"("roomId", "phase");

-- AddForeignKey
ALTER TABLE "VoteOption" ADD CONSTRAINT "VoteOption_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteSnapshot" ADD CONSTRAINT "VoteSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
