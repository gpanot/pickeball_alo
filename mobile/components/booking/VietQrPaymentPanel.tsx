import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Share,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { cacheDirectory, documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { CheckIcon, CloseIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot, VenueResult } from '@/lib/types';
import { formatBookingOrderRef, formatVndFull } from '@/lib/formatters';
import {
  buildVietQrImageUrl,
  pickDynamicQrPayment,
  pickPrimaryManualPayment,
  resolveStaticQrUrl,
} from '@/lib/vietqr';
import { markPaymentSubmitted } from '@/lib/api';

function BankCard({
  bank,
  accountNumber,
  accountName,
  t,
  compact,
}: {
  bank: string;
  accountNumber: string;
  accountName: string;
  t: ThemeTokens;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.bankCard,
        compact && styles.bankCardCompact,
        { borderColor: t.border, backgroundColor: t.bgCard },
      ]}
    >
      <Text style={[styles.bankCardBank, compact && styles.bankCardBankCompact, { color: t.text }]}>{bank}</Text>
      <Text style={[styles.bankCardAcct, compact && styles.bankCardAcctCompact, { color: t.accent }]}>{accountNumber}</Text>
      <Text style={[styles.bankCardName, compact && styles.bankCardNameCompact, { color: t.textSec }]} numberOfLines={2}>
        {accountName}
      </Text>
    </View>
  );
}

function useCountdown(deadline: string | null | undefined) {
  const [secsLeft, setSecsLeft] = useState(() => {
    if (!deadline) return -1;
    return Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setSecsLeft(remaining);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  const mm = Math.floor(secsLeft / 60);
  const ss = secsLeft % 60;
  const display = secsLeft >= 0 ? `${mm}:${ss.toString().padStart(2, '0')}` : '';
  const expired = secsLeft === 0 && deadline != null;

  return { secsLeft, display, expired };
}

function readFileAsBase64(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(xhr.response as Blob);
    };
    xhr.onerror = () => reject(new Error('XHR failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send();
  });
}

export interface VietQrPaymentPanelProps {
  booking: BookingResult;
  venue: VenueResult;
  userId: string;
  t: ThemeTokens;
  compact?: boolean;
  scrollEnabled?: boolean;
  onBookingUpdated?: (b: BookingResult) => void;
  showSuccessHeader?: boolean;
  onShowMyBooking?: () => void;
}

export default function VietQrPaymentPanel({
  booking,
  venue,
  userId,
  t,
  compact = false,
  scrollEnabled = true,
  onBookingUpdated,
  showSuccessHeader = true,
  onShowMyBooking,
}: VietQrPaymentPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [proofBase64, setProofBase64] = useState<string | null>(null);

  const { display: timerDisplay, expired } = useCountdown(booking.paymentDeadline);

  const orderRef = formatBookingOrderRef(booking.orderId);
  const slots = booking.slots as BookingSlot[];
  const slotSummary = slots.map((s) => `${s.courtName} ${s.time}`).join(' · ');

  const payments = venue.payments ?? [];
  const dynamicPay = useMemo(() => pickDynamicQrPayment(payments), [payments]);
  const manualPay = useMemo(() => pickPrimaryManualPayment(payments.length ? payments : undefined), [payments]);

  const qrUri = useMemo(() => {
    if (dynamicPay?.bankBin) {
      return buildVietQrImageUrl({
        bankBin: dynamicPay.bankBin,
        accountNumber: dynamicPay.accountNumber,
        accountName: dynamicPay.accountName,
        amountVnd: booking.totalPrice,
        orderId: booking.orderId,
      });
    }
    return null;
  }, [dynamicPay, booking.totalPrice, booking.orderId]);

  const staticQrUrl = useMemo(
    () => (qrUri ? null : resolveStaticQrUrl(payments.length ? payments : undefined, manualPay)),
    [payments, manualPay, qrUri],
  );

  const activeQrUrl = qrUri ?? staticQrUrl;

  const payScenario = useMemo(() => {
    if (qrUri) return 3 as const;
    if (manualPay) return 2 as const;
    return 1 as const;
  }, [qrUri, manualPay]);

  const displayBank = (dynamicPay ?? manualPay)?.bank ?? '';
  const displayName = (dynamicPay ?? manualPay)?.accountName ?? '';
  const displayAcct = (dynamicPay ?? manualPay)?.accountNumber ?? '';
  const showBankCard = payScenario !== 1 && Boolean(displayAcct);

  const qrSize = compact ? 140 : 200;
  const qrPad = compact ? 6 : 10;

  const handleDownloadQr = async () => {
    if (!activeQrUrl) return;
    setError('');
    setDownloading(true);
    try {
      const base = cacheDirectory ?? documentDirectory;
      if (base) {
        const target = `${base}courtmap-qr-${Date.now()}.png`;
        const { uri } = await downloadAsync(activeQrUrl, target);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save or share QR' });
        } else {
          setError('Sharing is not available on this device');
        }
        return;
      }
      if (Platform.OS === 'ios') {
        await Share.share({ url: activeQrUrl });
      } else {
        const canOpen = await Linking.canOpenURL(activeQrUrl);
        if (canOpen) await Linking.openURL(activeQrUrl);
        else setError('Could not open the QR link');
      }
    } catch {
      setError('Could not download the QR. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  const clearProof = useCallback(() => {
    setProofUri(null);
    setProofBase64(null);
    setError('');
  }, []);

  const pickProof = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload your payment screenshot.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: false,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setProofUri(asset.uri);
      setError('');

      const b64 = await readFileAsBase64(asset.uri);
      setProofBase64(b64);
    } catch {
      setError('Could not pick image');
    }
  }, []);

  if (booking.status === 'payment_submitted') {
    return (
      <View style={[styles.submittedWrap, compact && styles.submittedWrapCompact]}>
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: t.accentBgStrong }]}>
          <CheckIcon size={compact ? 28 : 36} color={t.accent} />
        </View>
        <Text style={[styles.title, compact && styles.titleCompact, { color: t.text, textAlign: 'center' }]}>
          Payment submitted
        </Text>
        <Text style={[styles.sub, compact && styles.subCompact, { color: t.textSec, marginTop: compact ? 4 : 8 }]}>
          The venue will verify your transfer shortly.
        </Text>
        <Text style={[styles.orderBig, compact && styles.orderBigCompact, { color: t.accent, marginTop: compact ? 8 : 16 }]}>
          {orderRef}
        </Text>
        {onShowMyBooking ? (
          <Pressable
            onPress={onShowMyBooking}
            style={[
              styles.submittedCta,
              compact && styles.submittedCtaCompact,
              { backgroundColor: t.accent, marginTop: compact ? 12 : 18 },
            ]}
          >
            <Text style={[styles.submittedCtaText, compact && styles.submittedCtaTextCompact]}>Show my booking</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const handlePaid = async () => {
    if (!proofBase64) {
      setError('Please upload your payment screenshot first');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const updated = await markPaymentSubmitted(booking.id, userId, proofBase64);
      onBookingUpdated?.(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!proofBase64 && !submitting && !expired && booking.status === 'pending';

  const qrColWidth = qrSize + qrPad * 2;
  const proofMinH = qrColWidth + 8 + 44;

  const renderQrRow = (uri: string) => (
    <View style={styles.qrRow}>
      <View style={[styles.qrStack, { width: qrColWidth }]}>
        <View style={[styles.qrWhite, { padding: qrPad }]}>
          <Image
            source={{ uri }}
            style={{ width: qrSize, height: qrSize }}
            resizeMode="contain"
            accessibilityLabel="Payment QR code"
          />
        </View>
        <Pressable
          onPress={() => void handleDownloadQr()}
          disabled={downloading}
          accessibilityRole="button"
          accessibilityLabel="Download QR code"
          style={[
            styles.downloadBelowQr,
            { borderColor: t.border, backgroundColor: t.bgInput, width: qrColWidth },
            downloading && { opacity: 0.7 },
          ]}
        >
          {downloading ? (
            <ActivityIndicator color={t.accent} />
          ) : (
            <Text style={[styles.downloadBelowText, { color: t.accent }]}>Download QR</Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.proofPanelWrap, { minHeight: proofMinH }]}>
        <Pressable
          onPress={() => void pickProof()}
          style={[
            styles.proofPanel,
            {
              borderColor: proofUri ? t.accent : t.border,
              backgroundColor: proofUri ? `${t.accent}15` : t.bgInput,
              borderStyle: proofUri ? 'solid' : 'dashed',
              minHeight: proofMinH,
              padding: proofUri ? 0 : 6,
            },
          ]}
        >
          {proofUri ? (
            <View style={styles.proofPanelImageWrap}>
              <Image source={{ uri: proofUri }} style={styles.proofPanelImage} resizeMode="cover" />
            </View>
          ) : (
            <Text style={[styles.proofPanelHint, { color: t.textSec }]}>
              Tap to upload{'\n'}payment proof
            </Text>
          )}
        </Pressable>
        {proofUri ? (
          <Pressable
            onPress={clearProof}
            accessibilityRole="button"
            accessibilityLabel="Remove payment proof"
            hitSlop={8}
            style={({ pressed }) => [
              styles.proofClearBtn,
              { backgroundColor: t.bgCard, borderColor: t.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <CloseIcon size={16} color={t.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const mainContent = (
    <>
      {showSuccessHeader ? (
        <View style={[styles.headerBlock, compact && styles.headerBlockCompact]}>
          <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: t.accentBgStrong }]}>
            <CheckIcon size={compact ? 28 : 36} color={t.accent} />
          </View>
          <Text style={[styles.title, compact && styles.titleCompact, { color: t.text }]}>Booking request sent!</Text>
          <Text style={[styles.sub, compact && styles.subCompact, { color: t.textSec }]}>Pay to confirm your booking</Text>
        </View>
      ) : null}

      {timerDisplay ? (
        <View style={[styles.timerBanner, { backgroundColor: expired ? `${t.red}18` : `${t.orange}18`, borderColor: expired ? t.red : t.orange }]}>
          <Text style={{ color: expired ? t.red : t.orange, fontWeight: '800', fontSize: compact ? 13 : 15 }}>
            {expired ? 'Time expired — booking will be cancelled' : `Time left to pay: ${timerDisplay}`}
          </Text>
        </View>
      ) : null}

      <View style={[styles.summary, compact && styles.summaryCompact, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <Text style={[styles.orderBig, compact && styles.orderBigCompact, { color: t.accent }]}>{orderRef}</Text>
        <Text style={[styles.venueName, compact && styles.venueNameCompact, { color: t.text }]} numberOfLines={1}>
          {booking.venueName}
        </Text>
        <Text style={[styles.meta, compact && styles.metaCompact, { color: t.textSec }]} numberOfLines={1}>
          {booking.date} · {slotSummary}
        </Text>
        <Text style={[styles.total, compact && styles.totalCompact, { color: t.accent }]}>{formatVndFull(booking.totalPrice)}</Text>
      </View>

      <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact, { color: t.text }]}>
        {payScenario === 3 ? 'Pay via VietQR' : payScenario === 2 ? 'Pay by bank transfer' : 'Payment'}
      </Text>

      {payScenario === 1 ? (
        <View style={[styles.fallback, compact && styles.fallbackCompact, { backgroundColor: t.bgInput, borderColor: t.border }]}>
          <Text style={{ color: t.textSec, fontSize: compact ? 12 : 14, textAlign: 'center' }}>
            This venue has not added payment details yet. Please contact them to complete payment.
          </Text>
          {venue.phone ? (
            <Pressable
              onPress={() => void Linking.openURL(`tel:${venue.phone}`)}
              style={{ marginTop: compact ? 8 : 12, paddingVertical: compact ? 8 : 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.accent }}
            >
              <Text style={{ color: '#000', fontWeight: '800', fontSize: compact ? 13 : 15 }}>Call {venue.phone}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {payScenario === 3 && qrUri ? renderQrRow(qrUri) : null}

      {payScenario === 2 && staticQrUrl ? (
        <>
          {renderQrRow(staticQrUrl)}
          {!compact ? (
            <Text style={[styles.hint, { color: t.textSec }]}>
              Save the QR and upload it in your bank app. Your amount is shown on your booking above.
            </Text>
          ) : null}
        </>
      ) : payScenario === 2 && !staticQrUrl ? (
        <Text style={[styles.sub, compact && styles.subCompact, { color: t.textSec, marginBottom: 6, textAlign: 'center' }]}>
          No QR on file — use the account below.
        </Text>
      ) : null}

      {payScenario === 1 ? (
        <View style={styles.uploadStandaloneWrap}>
          <Pressable
            onPress={() => void pickProof()}
            style={[
              styles.uploadStandalone,
              {
                borderColor: proofUri ? t.accent : t.border,
                backgroundColor: proofUri ? `${t.accent}15` : t.bgInput,
                borderStyle: proofUri ? 'solid' : 'dashed',
              },
            ]}
          >
            {proofUri ? (
              <Image source={{ uri: proofUri }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: t.textSec, fontSize: 14, textAlign: 'center' }}>Tap to upload{'\n'}payment screenshot</Text>
            )}
          </Pressable>
          {proofUri ? (
            <Pressable
              onPress={clearProof}
              accessibilityRole="button"
              accessibilityLabel="Remove payment proof"
              hitSlop={8}
              style={({ pressed }) => [
                styles.proofClearBtnStandalone,
                { backgroundColor: t.bgCard, borderColor: t.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <CloseIcon size={16} color={t.text} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showBankCard ? (
        <View style={{ marginTop: compact ? 6 : 10 }}>
          <BankCard bank={displayBank} accountNumber={displayAcct} accountName={displayName} t={t} compact={compact} />
        </View>
      ) : null}
    </>
  );

  const footerContent = (
    <View style={[styles.footer, { borderTopColor: t.border }]}>
      {error ? (
        <Text style={{ color: t.red, fontSize: compact ? 11 : 13, marginBottom: 8, textAlign: 'center' }} numberOfLines={3}>
          {error}
        </Text>
      ) : null}
      {!proofBase64 && !expired ? (
        <Text style={{ color: t.textSec, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
          Upload your payment screenshot to enable submit
        </Text>
      ) : null}
      <Pressable
        onPress={() => void handlePaid()}
        disabled={!canSubmit}
        style={[
          styles.cta,
          compact && styles.ctaCompact,
          { backgroundColor: canSubmit ? t.accent : `${t.accent}40` },
          submitting && { opacity: 0.7 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={[styles.ctaText, compact && styles.ctaTextCompact, !canSubmit && { opacity: 0.5 }]}>
            I HAVE PAID
          </Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <View style={styles.shell}>
      <ScrollView
        style={styles.scrollMain}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled={scrollEnabled}
      >
        {mainContent}
      </ScrollView>
      {footerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  scrollMain: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 8, flexGrow: 1 },
  footer: {
    flexShrink: 0,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  qrRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  qrStack: {
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  qrWhite: { backgroundColor: '#fff', borderRadius: 12 },
  proofPanelWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  proofClearBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBelowQr: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBelowText: {
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  proofPanel: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  proofPanelImageWrap: {
    width: '100%',
    flex: 1,
    alignSelf: 'stretch',
    minHeight: 100,
  },
  proofPanelImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  proofPanelHint: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  uploadStandaloneWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  uploadStandalone: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  proofClearBtnStandalone: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timerBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },

  submittedWrap: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center' },
  submittedWrapCompact: { paddingVertical: 12, paddingHorizontal: 4 },
  headerBlock: { alignItems: 'center', marginBottom: 16 },
  headerBlockCompact: { marginBottom: 8 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconWrapCompact: { width: 48, height: 48, borderRadius: 24, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  titleCompact: { fontSize: 16, marginBottom: 2 },
  sub: { fontSize: 14, textAlign: 'center' },
  subCompact: { fontSize: 12 },
  summary: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  summaryCompact: { padding: 10, marginBottom: 8, borderRadius: 12 },
  orderBig: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
  orderBigCompact: { fontSize: 17, marginBottom: 4 },
  venueName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  venueNameCompact: { fontSize: 14, marginBottom: 2 },
  meta: { fontSize: 13, marginBottom: 8 },
  metaCompact: { fontSize: 11, marginBottom: 4 },
  total: { fontSize: 17, fontWeight: '800' },
  totalCompact: { fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  sectionTitleCompact: { fontSize: 13, marginBottom: 4, fontWeight: '800' },
  hint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 12, lineHeight: 18, marginTop: 4, marginBottom: 8 },
  fallback: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  fallbackCompact: { padding: 12, marginBottom: 8 },
  bankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  bankCardCompact: { padding: 10, borderRadius: 12, marginBottom: 2 },
  bankCardBank: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  bankCardBankCompact: { fontSize: 12, marginBottom: 4 },
  bankCardAcct: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  bankCardAcctCompact: { fontSize: 15, marginBottom: 2 },
  bankCardName: { fontSize: 12 },
  bankCardNameCompact: { fontSize: 11 },
  cta: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaCompact: { paddingVertical: 14, borderRadius: 12 },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  ctaTextCompact: { fontSize: 14 },
  submittedCta: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submittedCtaCompact: {
    paddingVertical: 12,
    borderRadius: 10,
  },
  submittedCtaText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  submittedCtaTextCompact: {
    fontSize: 13,
  },
});
