import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCourtMap } from '@/context/CourtMapContext';
import { useSession } from '@/context/SessionContext';
import {
  StatusChip,
  RatingBar,
  SectionHeader,
  BottomSheet,
  StarRating,
} from '@/components/coach';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { submitReview, getCoachReviews } from '@/mobile/lib/coach-api';
import type {
  CoachSessionResult,
  CoachReviewResult,
  SessionParticipantResult,
} from '@/mobile/lib/coach-types';

function sessionStatus(s: CoachSessionResult | null): string {
  if (!s) return '';
  return (s.status ?? 'confirmed').toLowerCase();
}

function parseSessionEndMs(dateStr: string, endTime: string): number {
  return new Date(`${dateStr}T${endTime}:00+07:00`).getTime();
}

function isSessionUpcoming(s: CoachSessionResult): boolean {
  return parseSessionEndMs(s.date, s.endTime) > Date.now();
}

function formatSessionType(sessionType: string): string {
  const t = sessionType.toLowerCase();
  if (t === '1on1' || t === '1:1') return '1:1';
  if (t === 'group') return 'Group';
  return sessionType;
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { t, userId, userName } = useCourtMap();
  const { sessionId: sessionIdParam } = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = typeof sessionIdParam === 'string' ? sessionIdParam : sessionIdParam?.[0];

  const { loadSession, currentSession, loading, error, cancel } = useSession();

  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [ratingOnTime, setRatingOnTime] = useState(0);
  const [ratingFriendly, setRatingFriendly] = useState(0);
  const [ratingProfessional, setRatingProfessional] = useState(0);
  const [ratingRecommend, setRatingRecommend] = useState(0);
  const [comment, setComment] = useState('');

  const session = currentSession;
  const st = sessionStatus(session);

  useEffect(() => {
    if (!sessionId) return;
    void loadSession(sessionId);
  }, [sessionId, loadSession]);

  useEffect(() => {
    if (!session || st !== 'completed' || !userId) {
      setHasReviewed(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { reviews } = await getCoachReviews(session.coachId, 100, 0);
        if (cancelled) return;
        const found = reviews.some(
          (r: CoachReviewResult) => r.sessionId === session.id && r.userId === userId,
        );
        setHasReviewed(found);
      } catch {
        if (!cancelled) setHasReviewed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.coachId, st, userId]);

  const myParticipant = useMemo(() => {
    if (!session?.participants?.length || !userId) return null;
    return (
      session.participants.find((p: SessionParticipantResult) => p.userId === userId) ??
      session.participants[0]
    );
  }, [session, userId]);

  const proofUrl = myParticipant?.paymentProofUrl ?? null;
  const displayAmount = myParticipant?.amountDue ?? session?.totalPerPlayer ?? 0;

  const showParticipants = useMemo(() => {
    const ty = session?.sessionType?.toLowerCase() ?? '';
    return ty === 'group' || (session?.participants?.length ?? 0) > 1;
  }, [session?.sessionType, session?.participants?.length]);

  const canCancel = st === 'confirmed' && !!session && isSessionUpcoming(session);
  const canRate = st === 'completed' && !!session && !!userId && userName && !hasReviewed;

  const resetReviewForm = useCallback(() => {
    setRatingOnTime(0);
    setRatingFriendly(0);
    setRatingProfessional(0);
    setRatingRecommend(0);
    setComment('');
    setReviewError(null);
  }, []);

  const openReviewSheet = useCallback(() => {
    resetReviewForm();
    setReviewSheetOpen(true);
  }, [resetReviewForm]);

  const handleConfirmCancel = useCallback(async () => {
    if (!sessionId) return;
    setCancelSheetOpen(false);
    await cancel(sessionId);
  }, [sessionId, cancel]);

  const ratingsComplete =
    ratingOnTime >= 1 &&
    ratingFriendly >= 1 &&
    ratingProfessional >= 1 &&
    ratingRecommend >= 1;

  const handleSubmitReview = useCallback(async () => {
    if (!session || !userId || !userName.trim() || !ratingsComplete) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await submitReview(session.coachId, {
        sessionId: session.id,
        userId,
        userName: userName.trim(),
        ratingOnTime,
        ratingFriendly,
        ratingProfessional,
        ratingRecommend,
        comment: comment.trim() || undefined,
      });
      setHasReviewed(true);
      setReviewSheetOpen(false);
      resetReviewForm();
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  }, [
    session,
    userId,
    userName,
    ratingsComplete,
    ratingOnTime,
    ratingFriendly,
    ratingProfessional,
    ratingRecommend,
    comment,
    resetReviewForm,
  ]);

  const commentRemaining = 150 - comment.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
        </Pressable>
      </View>

      {!sessionId ? (
        <View style={styles.centered}>
          <Text style={[styles.muted, { color: t.textSec }]}>Missing session.</Text>
        </View>
      ) : loading && !session ? (
        <View style={styles.centered}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : error && !session ? (
        <View style={styles.centered}>
          <Text style={[styles.muted, { color: t.red }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {session ? (
            <>
              <StatusChip status={session.status ?? 'confirmed'} theme={t} />

              <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.cardTitle, { color: t.text }]}>Session</Text>
                <Text style={[styles.rowText, { color: t.text }]}>{session.date}</Text>
                <Text style={[styles.rowTextSec, { color: t.textSec }]}>
                  {session.startTime} – {session.endTime}
                </Text>
                <Text style={[styles.rowTextSec, { color: t.textSec }]}>
                  Type: {formatSessionType(session.sessionType)}
                </Text>
                <Text style={[styles.rowTextSec, { color: t.textSec }]}>
                  Coach: {session.coachName ?? '—'}
                </Text>
                <Text style={[styles.rowTextSec, { color: t.textSec }]}>Venue: {session.venueName}</Text>
              </View>

              <SectionHeader title="Payment" theme={t} />
              <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.rowText, { color: t.text }]}>
                  Status: {session.paymentStatus}
                </Text>
                <Text style={[styles.rowTextSec, { color: t.textSec }]}>
                  Amount: {displayAmount.toLocaleString('vi-VN')} ₫
                </Text>
                {proofUrl ? (
                  <View style={styles.proofBlock}>
                    <Text style={[styles.proofLabel, { color: t.textSec }]}>Proof</Text>
                    <Image source={{ uri: proofUrl }} style={styles.proofImage} resizeMode="contain" />
                  </View>
                ) : null}
              </View>

              {showParticipants ? (
                <>
                  <SectionHeader title="Participants" theme={t} />
                  <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                    {session.participants.map((p: SessionParticipantResult, i: number) => (
                      <View
                        key={p.id}
                        style={[
                          styles.participantRow,
                          i < session.participants.length - 1
                            ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }
                            : null,
                        ]}
                      >
                        <Text style={[styles.participantName, { color: t.text }]} numberOfLines={1}>
                          {p.userName}
                        </Text>
                        <Text style={[styles.participantPay, { color: t.textSec }]} numberOfLines={1}>
                          {p.paymentStatus}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {canCancel ? (
                <Pressable
                  onPress={() => setCancelSheetOpen(true)}
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    {
                      backgroundColor: t.red,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.dangerBtnText, { color: t.text }]}>Cancel Session</Text>
                </Pressable>
              ) : null}

              {canRate ? (
                <Pressable
                  onPress={openReviewSheet}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: t.accentBgStrong,
                      borderColor: t.accent,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.primaryBtnText, { color: t.text }]}>Rate this session</Text>
                </Pressable>
              ) : null}

              {error && session ? (
                <Text style={[styles.inlineErr, { color: t.red }]}>{error}</Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}

      <BottomSheet visible={cancelSheetOpen} onClose={() => setCancelSheetOpen(false)} theme={t}>
        <Text style={[styles.sheetTitle, { color: t.text }]}>Cancel this session?</Text>
        <Text style={[styles.sheetBody, { color: t.textSec }]}>
          This cannot be undone. Cancellation rules from the coach still apply.
        </Text>
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => setCancelSheetOpen(false)}
            style={({ pressed }) => [
              styles.sheetSecondary,
              { borderColor: t.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.sheetSecondaryText, { color: t.text }]}>Keep session</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirmCancel}
            style={({ pressed }) => [
              styles.sheetDanger,
              { backgroundColor: t.red, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.sheetDangerText, { color: t.text }]}>Yes, cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet visible={reviewSheetOpen} onClose={() => setReviewSheetOpen(false)} theme={t}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={[styles.sheetTitle, { color: t.text }]}>Rate this session</Text>
          <Text style={[styles.sheetBody, { color: t.textSec }]}>
            All ratings use 1–5 stars. Comment is optional (max 150 characters).
          </Text>

          <View style={styles.ratingBlock}>
            <Text style={[styles.ratingLabel, { color: t.text }]}>On time</Text>
            <StarRating value={ratingOnTime} onChange={setRatingOnTime} theme={t} />
            <RatingBar label=" " value={ratingOnTime} theme={t} />
          </View>
          <View style={styles.ratingBlock}>
            <Text style={[styles.ratingLabel, { color: t.text }]}>Friendly</Text>
            <StarRating value={ratingFriendly} onChange={setRatingFriendly} theme={t} />
            <RatingBar label=" " value={ratingFriendly} theme={t} />
          </View>
          <View style={styles.ratingBlock}>
            <Text style={[styles.ratingLabel, { color: t.text }]}>Professional</Text>
            <StarRating value={ratingProfessional} onChange={setRatingProfessional} theme={t} />
            <RatingBar label=" " value={ratingProfessional} theme={t} />
          </View>
          <View style={styles.ratingBlock}>
            <Text style={[styles.ratingLabel, { color: t.text }]}>Recommend</Text>
            <StarRating value={ratingRecommend} onChange={setRatingRecommend} theme={t} />
            <RatingBar label=" " value={ratingRecommend} theme={t} />
          </View>

          <Text style={[styles.ratingLabel, { color: t.text }]}>Comment</Text>
          <TextInput
            value={comment}
            onChangeText={(v) => setComment(v.slice(0, 150))}
            placeholder="Share feedback (optional)"
            placeholderTextColor={t.textMuted}
            multiline
            maxLength={150}
            style={[
              styles.commentInput,
              {
                color: t.text,
                backgroundColor: t.bgInput,
                borderColor: t.border,
              },
            ]}
          />
          <Text style={[styles.charCount, { color: t.textMuted }]}>{commentRemaining} left</Text>

          {reviewError ? <Text style={[styles.inlineErr, { color: t.red }]}>{reviewError}</Text> : null}

          <Pressable
            onPress={handleSubmitReview}
            disabled={!ratingsComplete || reviewSubmitting}
            style={({ pressed }) => [
              styles.submitReviewBtn,
              {
                backgroundColor: t.accent,
                opacity: !ratingsComplete || reviewSubmitting ? 0.45 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {reviewSubmitting ? (
              <ActivityIndicator color={t.bg} />
            ) : (
              <Text style={[styles.submitReviewText, { color: t.bg }]}>Submit</Text>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  muted: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  rowText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  rowTextSec: {
    fontSize: fontSize.sm,
  },
  proofBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  proofLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  participantName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  participantPay: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  dangerBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  inlineErr: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  sheetBody: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
    lineHeight: fontSize.md * 1.35,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  sheetSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sheetDanger: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  sheetDangerText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  ratingBlock: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  ratingLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  commentInput: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  submitReviewBtn: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitReviewText: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
