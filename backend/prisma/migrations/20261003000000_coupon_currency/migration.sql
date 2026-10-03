-- A FIXED_AMOUNT coupon is an amount of money, but Coupon carried no currency:
-- the same "500" was applied as Rs 500 in the local store and $500 in the
-- international one. NULL means "valid in any store" and is honoured only for
-- PERCENTAGE coupons; the application refuses a FIXED_AMOUNT coupon that has
-- no currency, so existing fixed coupons must be given one to keep working.
ALTER TABLE "Coupon" ADD COLUMN "currency" "Currency";
