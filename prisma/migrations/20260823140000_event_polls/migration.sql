-- CreateEnum
CREATE TYPE "EventPollStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EventPollQuestionType" AS ENUM ('SINGLE', 'MULTI', 'TEXT');

-- CreateTable
CREATE TABLE "EventPoll" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EventPollStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPollQuestion" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "EventPollQuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allowOther" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventPollQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPollResponse" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "userId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPollResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPollAnswer" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIds" JSONB,
    "otherText" TEXT,
    "textValue" TEXT,

    CONSTRAINT "EventPollAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPoll_organisationId_eventId_idx" ON "EventPoll"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "EventPoll_eventId_status_idx" ON "EventPoll"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventPollQuestion_pollId_sortOrder_idx" ON "EventPollQuestion"("pollId", "sortOrder");

-- CreateIndex
CREATE INDEX "EventPollQuestion_organisationId_eventId_idx" ON "EventPollQuestion"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "EventPollResponse_organisationId_eventId_idx" ON "EventPollResponse"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "EventPollResponse_attendeeId_idx" ON "EventPollResponse"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPollResponse_pollId_attendeeId_key" ON "EventPollResponse"("pollId", "attendeeId");

-- CreateIndex
CREATE INDEX "EventPollAnswer_organisationId_eventId_idx" ON "EventPollAnswer"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "EventPollAnswer_questionId_idx" ON "EventPollAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPollAnswer_responseId_questionId_key" ON "EventPollAnswer"("responseId", "questionId");

-- AddForeignKey
ALTER TABLE "EventPoll" ADD CONSTRAINT "EventPoll_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPoll" ADD CONSTRAINT "EventPoll_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollQuestion" ADD CONSTRAINT "EventPollQuestion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollQuestion" ADD CONSTRAINT "EventPollQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollQuestion" ADD CONSTRAINT "EventPollQuestion_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "EventPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollResponse" ADD CONSTRAINT "EventPollResponse_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollResponse" ADD CONSTRAINT "EventPollResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollResponse" ADD CONSTRAINT "EventPollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "EventPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollResponse" ADD CONSTRAINT "EventPollResponse_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollAnswer" ADD CONSTRAINT "EventPollAnswer_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollAnswer" ADD CONSTRAINT "EventPollAnswer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollAnswer" ADD CONSTRAINT "EventPollAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "EventPollResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPollAnswer" ADD CONSTRAINT "EventPollAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EventPollQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
