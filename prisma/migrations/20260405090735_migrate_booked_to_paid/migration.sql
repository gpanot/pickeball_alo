-- Legacy: "booked" removed in favor of VietQR flow; treat old approvals as paid.
UPDATE "Booking"
SET
  status = 'paid',
  "paymentConfirmedAt" = COALESCE("reviewedAt", CURRENT_TIMESTAMP),
  "reviewedAt" = COALESCE("reviewedAt", CURRENT_TIMESTAMP)
WHERE status = 'booked';
