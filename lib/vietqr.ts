import { formatBookingOrderRef } from '@/lib/formatters';

export type VietQrPaymentInput = {
  bankBin: string | null;
  accountName: string;
  accountNumber: string;
  isDefaultForDynamicQr: boolean;
  sortOrder?: number;
  /** Display label (e.g. bank name); optional for URL picking logic */
  bank?: string;
};

const BIN_RE = /^\d{6}$/;

function isValidBin(bin: string | null | undefined): bin is string {
  return typeof bin === 'string' && BIN_RE.test(bin.trim());
}

/**
 * PRD: default row with valid BIN + account + name, else first valid by sortOrder.
 */
export function pickDynamicQrPayment<T extends VietQrPaymentInput>(payments: T[]): T | null {
  if (!payments?.length) return null;
  const sorted = [...payments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const byDefault = sorted.find(
    (p) =>
      p.isDefaultForDynamicQr &&
      isValidBin(p.bankBin) &&
      p.accountNumber?.trim() &&
      p.accountName?.trim(),
  );
  if (byDefault) return byDefault;
  return (
    sorted.find(
      (p) =>
        isValidBin(p.bankBin) && p.accountNumber?.trim() && p.accountName?.trim(),
    ) ?? null
  );
}

/** First payment row with bank label + account + holder name (sorted by sortOrder). For manual transfer UI when dynamic VietQR is unavailable. */
export function pickPrimaryManualPayment<
  T extends { bank?: string; accountName: string; accountNumber: string; sortOrder?: number },
>(payments: T[] | undefined): T | null {
  if (!payments?.length) return null;
  const sorted = [...payments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return sorted.find((p) => p.bank?.trim() && p.accountNumber?.trim() && p.accountName?.trim()) ?? null;
}

/** Prefer static QR on the primary manual row; else first row with qrImageUrl (by sortOrder). */
export function resolveStaticQrUrl<T extends { qrImageUrl?: string | null; sortOrder?: number }>(
  payments: T[] | undefined,
  primary: T | null,
): string | null {
  const fromPrimary = primary && typeof primary.qrImageUrl === 'string' ? primary.qrImageUrl.trim() : '';
  if (fromPrimary) return fromPrimary;
  if (!payments?.length) return null;
  const sorted = [...payments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const row = sorted.find((r) => r.qrImageUrl?.trim());
  return row?.qrImageUrl?.trim() ?? null;
}

export type BuildVietQrImageUrlParams = {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amountVnd: number;
  orderId: string;
};

/**
 * VietQR image API. addInfo uses the same display ref as the app (formatBookingOrderRef).
 */
export function buildVietQrImageUrl(p: BuildVietQrImageUrlParams): string {
  const addInfo = encodeURIComponent(formatBookingOrderRef(p.orderId));
  const accountName = encodeURIComponent(p.accountName.trim());
  const bin = p.bankBin.trim();
  const acct = p.accountNumber.trim();
  const amount = Math.max(0, Math.round(p.amountVnd));
  return `https://img.vietqr.io/image/${bin}-${acct}-compact.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
}
