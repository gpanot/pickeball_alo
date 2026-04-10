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
import { Ionicons } from '@expo/vector-icons';
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

  const MAX_COURTS = 10;

  const onAddCourt = useCallback(
    async (venueId: string) => {
      if (!coach?.id || !token) {
        Alert.alert('Sign in required', 'Coach token is required.');
        return;
      }
      if (courts.length >= MAX_COURTS) {
        Alert.alert('Limit reached', `You can link up to ${MAX_COURTS} preferred courts.`);
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
    [coach?.id, courts.length, loadCourts, token],
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
        <SectionHeader title="Preferred courts" theme={t} />
        <Text style={[styles.courtCountHint, { color: t.textSec }]}>
          {courts.length}/10 courts linked. Your availability applies to all your preferred courts.
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={t.accent} />
          </View>
        ) : courts.length === 0 && pendingInvites.length === 0 ? (
          <EmptyState
            title="No preferred courts"
            subtitle="Add venues where you coach. You can link up to 10 preferred courts."
            theme={t}
          />
        ) : null}

        {courts.length > 0 && (
          <View style={[styles.courtList, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            {courts.map((link, idx) => {
              const name = link.venue?.name ?? 'Venue';
              const addr = link.venue?.address ?? '';
              return (
                <View
                  key={link.id}
                  style={[
                    styles.courtRow,
                    idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
                  ]}
                >
                  <View style={styles.courtInfo}>
                    <View style={styles.courtNameRow}>
                      <Text style={[styles.courtName, { color: t.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <View
                        style={[
                          styles.miniPill,
                          { backgroundColor: link.isActive ? t.accentBgStrong : t.bgSurface },
                        ]}
                      >
                        <Text style={[styles.miniPillText, { color: link.isActive ? t.accent : t.textSec }]}>
                          {link.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    {addr ? (
                      <Text style={[styles.courtAddr, { color: t.textMuted }]} numberOfLines={1}>
                        {addr}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    disabled={busyVenueId === link.venueId || !token}
                    onPress={() => onRemoveCourt(link.venueId)}
                    hitSlop={10}
                    style={({ pressed }) => ({
                      opacity: pressed || busyVenueId === link.venueId ? 0.5 : 1,
                      padding: 4,
                    })}
                  >
                    <Ionicons name="close-circle" size={22} color={t.red} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {pendingInvites.length > 0 && (
          <>
            <SectionHeader title="Pending invites" theme={t} />
            {pendingInvites.map((inv) => (
              <View
                key={inv.id}
                style={[styles.inviteRow, { backgroundColor: t.bgCard, borderColor: t.border }]}
              >
                <Text style={[styles.courtName, { color: t.text, flex: 1 }]} numberOfLines={1}>
                  {inv.venueName ?? 'Venue invite'}
                </Text>
                <View style={styles.inviteActions}>
                  <Pressable
                    disabled={busyInviteId === inv.id || !token}
                    onPress={() => onInviteAction(inv.id, 'decline')}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.inviteSmBtn,
                      { borderColor: t.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.inviteSmText, { color: t.textSec }]}>Decline</Text>
                  </Pressable>
                  <Pressable
                    disabled={busyInviteId === inv.id || !token}
                    onPress={() => onInviteAction(inv.id, 'accept')}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.inviteSmBtn,
                      { backgroundColor: t.accent, borderColor: t.accent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={[styles.inviteSmText, { color: t.bg }]}>Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        <SectionHeader title="Add court" theme={t} />
        {courts.length >= MAX_COURTS ? (
          <Text style={[styles.courtCountHint, { color: t.textMuted }]}>
            Maximum of {MAX_COURTS} preferred courts reached.
          </Text>
        ) : (
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
        )}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['4xl'],
    gap: spacing.sm,
  },
  centered: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  courtList: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  courtInfo: {
    flex: 1,
    minWidth: 0,
  },
  courtNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courtName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    flexShrink: 1,
  },
  miniPill: {
    borderRadius: borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  courtAddr: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 6,
  },
  inviteSmBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  inviteSmText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  addCourtBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  addCourtBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  searchWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
  searchSpinner: {
    marginVertical: spacing.xs,
  },
  venueRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  venueRowTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  venueRowSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  addHint: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  courtCountHint: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
});
