import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { SectionHeader, EmptyState } from '@/components/coach';
import {
  addCoachCourt,
  getCoachInvites,
  listCoachCourts,
  removeCoachCourt,
  respondToInvite,
  searchVenuesByName,
} from '@/mobile/lib/coach-api';
import type { CoachVenueInviteResult } from '@/mobile/lib/coach-types';

type CourtLinkRow = {
  id: string;
  venueId: string;
  courtIds: string[];
  isActive: boolean;
  venue?: { name: string; address: string };
};

type VenueSearchRow = {
  id: string;
  name: string;
  address: string;
};

function normalizeCourtLinks(raw: unknown): CourtLinkRow[] {
  if (!Array.isArray(raw)) return [];
  const out: CourtLinkRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.venueId !== 'string') continue;
    const courtIds = Array.isArray(r.courtIds)
      ? r.courtIds.filter((c): c is string => typeof c === 'string')
      : [];
    let venue: CourtLinkRow['venue'];
    const vRaw = r.venue;
    if (vRaw && typeof vRaw === 'object') {
      const v = vRaw as Record<string, unknown>;
      venue = {
        name: typeof v.name === 'string' ? v.name : '',
        address: typeof v.address === 'string' ? v.address : '',
      };
    }
    out.push({
      id: r.id,
      venueId: r.venueId,
      courtIds,
      isActive: r.isActive === true,
      venue,
    });
  }
  return out;
}

export default function CoachCourtPartnershipScreen() {
  const router = useRouter();
  const { coach, token } = useCoachAuth();

  const [loading, setLoading] = useState(true);
  const [courts, setCourts] = useState<CourtLinkRow[]>([]);
  const [invites, setInvites] = useState<CoachVenueInviteResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [venueResults, setVenueResults] = useState<VenueSearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busyVenueId, setBusyVenueId] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const loadCourts = useCallback(async () => {
    if (!coach?.id) {
      setCourts([]);
      return;
    }
    try {
      const raw = await listCoachCourts(coach.id);
      setCourts(normalizeCourtLinks(raw));
    } catch {
      setCourts([]);
    }
  }, [coach?.id]);

  const loadInvites = useCallback(async () => {
    if (!coach?.id || !token) {
      setInvites([]);
      return;
    }
    try {
      const list = await getCoachInvites(coach.id, token);
      setInvites(Array.isArray(list) ? list : []);
    } catch {
      setInvites([]);
    }
  }, [coach?.id, token]);

  const refreshAll = useCallback(async () => {
    if (!coach?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([loadCourts(), loadInvites()]);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, loadCourts, loadInvites]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);


  const runVenueSearch = useCallback(async () => {
    const q = searchText.trim();
    if (!q) {
      setVenueResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const raw = await searchVenuesByName(q);
      if (!Array.isArray(raw)) {
        setVenueResults([]);
        return;
      }
      const rows: VenueSearchRow[] = raw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const v = item as Record<string, unknown>;
          if (typeof v.id !== 'string' || typeof v.name !== 'string') return null;
          return {
            id: v.id,
            name: v.name,
            address: typeof v.address === 'string' ? v.address : '',
          };
        })
        .filter((x): x is VenueSearchRow => x != null);
      setVenueResults(rows);
    } catch {
      setVenueResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchText]);

  const onAddCourt = useCallback(
    async (venueId: string) => {
      if (!coach?.id || !token) {
        Alert.alert('Sign in required', 'Coach token is required.');
        return;
      }
      setBusyVenueId(venueId);
      try {
        await addCoachCourt(coach.id, venueId, token);
        setSearchText('');
        setVenueResults([]);
        await loadCourts();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Request failed');
      } finally {
        setBusyVenueId(null);
      }
    },
    [coach?.id, loadCourts, token],
  );

  const onRemoveCourt = useCallback(
    async (venueId: string) => {
      if (!coach?.id || !token) {
        Alert.alert('Sign in required', 'Coach token is required.');
        return;
      }
      setBusyVenueId(venueId);
      try {
        await removeCoachCourt(coach.id, venueId, token);
        await loadCourts();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Request failed');
      } finally {
        setBusyVenueId(null);
      }
    },
    [coach?.id, loadCourts, token],
  );

  const onInviteAction = useCallback(
    async (inviteId: string, action: 'accept' | 'decline') => {
      if (!coach?.id || !token) return;
      setBusyInviteId(inviteId);
      try {
        await respondToInvite(coach.id, inviteId, action, token);
        await loadInvites();
        if (action === 'accept') await loadCourts();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Request failed');
      } finally {
        setBusyInviteId(null);
      }
    },
    [coach?.id, loadCourts, loadInvites, token],
  );

  const pendingInvites = useMemo(
    () => invites.filter((i) => (i.status || '').toLowerCase() === 'pending'),
    [invites],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: t.accent }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title="Court partnerships" theme={t} />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={t.accent} />
          </View>
        ) : courts.length === 0 && pendingInvites.length === 0 ? (
          <EmptyState
            title="No linked courts"
            subtitle="Add a venue you coach at, or accept an invite below."
            theme={t}
          />
        ) : null}

        {courts.map((link) => {
          const name = link.venue?.name ?? 'Venue';
          const addr = link.venue?.address ?? '';
          const courtsLabel = link.courtIds.length ? link.courtIds.join(', ') : '—';
          return (
            <View
              key={link.id}
              style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.venueTitle, { color: t.text }]} numberOfLines={2}>
                  {name}
                </Text>
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: link.isActive ? t.accentBgStrong : t.bgSurface,
                      borderColor: t.border,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: link.isActive ? t.accent : t.textSec }]}>
                    {link.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              {addr ? (
                <Text style={[styles.address, { color: t.textSec }]} numberOfLines={3}>
                  {addr}
                </Text>
              ) : null}
              <Text style={[styles.meta, { color: t.textMuted }]}>Court IDs: {courtsLabel}</Text>
              <Pressable
                disabled={busyVenueId === link.venueId || !token}
                onPress={() => onRemoveCourt(link.venueId)}
                style={({ pressed }) => [
                  styles.removeBtn,
                  {
                    borderColor: t.red,
                    opacity: pressed || busyVenueId === link.venueId ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.removeLabel, { color: t.red }]}>Remove</Text>
              </Pressable>
            </View>
          );
        })}

        <SectionHeader title="Pending invites" theme={t} />
        {pendingInvites.length === 0 ? (
          <Text style={[styles.emptyInvite, { color: t.textMuted }]}>No pending invites.</Text>
        ) : (
          pendingInvites.map((inv) => (
            <View
              key={inv.id}
              style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}
            >
              <Text style={[styles.venueTitle, { color: t.text }]} numberOfLines={2}>
                {inv.venueName ?? 'Venue invite'}
              </Text>
              <View style={styles.inviteActions}>
                <Pressable
                  disabled={busyInviteId === inv.id || !token}
                  onPress={() => onInviteAction(inv.id, 'decline')}
                  style={({ pressed }) => [
                    styles.inviteBtn,
                    {
                      borderColor: t.border,
                      backgroundColor: t.bgSurface,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.inviteBtnText, { color: t.text }]}>Decline</Text>
                </Pressable>
                <Pressable
                  disabled={busyInviteId === inv.id || !token}
                  onPress={() => onInviteAction(inv.id, 'accept')}
                  style={({ pressed }) => [
                    styles.inviteBtn,
                    styles.inviteBtnPrimary,
                    {
                      backgroundColor: t.accent,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.inviteBtnText, { color: t.bg }]}>Accept</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <SectionHeader title="Add court" theme={t} />
        <Pressable
          onPress={runVenueSearch}
          style={({ pressed }) => [
            styles.addCourtBtn,
            {
              backgroundColor: t.accent,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.addCourtBtnText, { color: t.bg }]}>Add Court</Text>
        </Pressable>
        <View style={[styles.searchWrap, { backgroundColor: t.bgInput, borderColor: t.border }]}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search venues by name"
            placeholderTextColor={t.textMuted}
            style={[styles.searchInput, { color: t.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={runVenueSearch}
            returnKeyType="search"
          />
        </View>
        {searchLoading ? (
          <ActivityIndicator style={styles.searchSpinner} color={t.accent} />
        ) : null}
        {venueResults.map((v) => (
          <Pressable
            key={v.id}
            disabled={busyVenueId === v.id || !token}
            onPress={() => onAddCourt(v.id)}
            style={({ pressed }) => [
              styles.venueRow,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.venueRowTitle, { color: t.text }]} numberOfLines={2}>
              {v.name}
            </Text>
            {v.address ? (
              <Text style={[styles.venueRowSub, { color: t.textSec }]} numberOfLines={2}>
                {v.address}
              </Text>
            ) : null}
            <Text style={[styles.addHint, { color: t.accent }]}>Tap to link</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: { fontSize: fontSize.md, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  centered: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  venueTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  pill: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  address: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  meta: {
    fontSize: fontSize.xs,
  },
  removeBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  removeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  emptyInvite: {
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  inviteBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  inviteBtnPrimary: {
    borderWidth: 0,
  },
  addCourtBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
  },
  addCourtBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  inviteBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  searchSpinner: {
    marginVertical: spacing.sm,
  },
  venueRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  venueRowTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  venueRowSub: {
    fontSize: fontSize.sm,
  },
  addHint: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
