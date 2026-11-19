-- Add durable in-app notifications without changing existing records or tables.
CREATE TABLE "CareNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '/patient/overview',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CareNotification_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CareNotification_userId_createdAt_idx"
    ON "CareNotification"("userId", "createdAt");

CREATE INDEX "CareNotification_userId_readAt_createdAt_idx"
    ON "CareNotification"("userId", "readAt", "createdAt");
