-- Retire the redundant global "dormant" switch. The WELCOME3MO signup coupon
-- handles the free period through the real checkout flow, so this toggle is
-- unused and removed.
-- DropColumn
ALTER TABLE "AppSettings" DROP COLUMN "subscriptionModeActive";
