import { formatBookingOrderRef } from '@/lib/formatters';
import type { VenuePaymentResult } from '@/lib/types';

const BIN_RE = /^\d{6}$/;

function isValidBin(bin: string | null | undefined): bin is string {
  return typeof bin === 'string' && BIN_RE.test(bin.trim());
}

export function pickDynamicQrPayment(payments: VenuePaymentResult[] | undefined): VenuePaymentResult | null {
  if (!payments?.length) return null;
  const withOrder = payments.map((p, i) => ({ p, o: p.sortOrder ?? i }));
  withOrder.sort((a, b) => a.o - b.o);
  const list = withOrder.map((x) => x.p);

  const byDefault = list.find(
    (p) =>
      p.isDefaultForDynamicQr &&
      isValidBin(p.bankBin) &&
      p.accountNumber?.trim() &&
      p.accountName?.trim(),
  );
  if (byDefault) return byDefault;
  return list.find((p) => isValidBin(p.bankBin) && p.accountNumber?.trim() && p.accountName?.trim()) ?? null;
}

export function pickPrimaryManualPayment(
  payments: VenuePaymentResult[] | undefined,
): VenuePaymentResult | null {
  if (!payments?.length) return null;
  const sorted = [...payments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return sorted.find((p) => p.bank?.trim() && p.accountNumber?.trim() && p.accountName?.trim()) ?? null;
}

export function resolveStaticQrUrl(
  payments: VenuePaymentResult[] | undefined,
  primary: VenuePaymentResult | null,
): string | null {
  const fromPrimary = primary?.qrImageUrl?.trim();
  if (fromPrimary) return fromPrimary;
  if (!payments?.length) return null;
  const sorted = [...payments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const row = sorted.find((p) => p.qrImageUrl?.trim());
  return row?.qrImageUrl?.trim() ?? null;
}

export function buildVietQrImageUrl(p: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amountVnd: number;
  orderId: string;
}): string {
  const addInfo = encodeURIComponent(formatBookingOrderRef(p.orderId));
  const accountName = encodeURIComponent(p.accountName.trim());
  const bin = p.bankBin.trim();
  const acct = p.accountNumber.trim();
  const amount = Math.max(0, Math.round(p.amountVnd));
  return `https://img.vietqr.io/image/${bin}-${acct}-compact.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
}
