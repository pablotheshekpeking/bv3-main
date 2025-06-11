-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'CHECKED_IN';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkedInAt" TIMESTAMP(3);
