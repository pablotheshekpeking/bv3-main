-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "holdId" TEXT;

-- CreateTable
CREATE TABLE "ApartmentHold" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "expiryTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApartmentHold_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApartmentHold" ADD CONSTRAINT "ApartmentHold_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentHold" ADD CONSTRAINT "ApartmentHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "ApartmentHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;
