import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { SectionHeader, EmptyState, StatusChip, RatingBar } from '@/components/coach';
import { listSessions } from '@/mobile/lib/coach-api';
import type { CoachSessionResult, SessionParticipantResult } from '@/mobile/lib/coach-types';

type PlayerRow = {
  userId: string;
  userName: string;
  userPhone: string;
  sessionCount: number;
  lastSessionDate: string;
};

function aggregatePlayers(sessions: CoachSessionResult[]): PlayerRow[] {
  const byUser = new Map<string, PlayerRow>();
  for (const session of sessions) {
    const parts = (session.participants ?? []) as SessionParticipantResult[];
    for (const p of parts) {
      const prev = byUser.get(p.userId);
      if (!prev) {
        byUser.set(p.userId, {
          userId: p.userId,
          userName: p.userName,
          userPhone: p.userPhone,
          sessionCount: 1,
          lastSessionDate: session.date,
        });
      } else {
        prev.sessionCount += 1;
        if (session.date > prev.lastSessionDate) {
          prev.lastSessionDate = session.date;
        }
        prev.userName = p.userName || prev.userName;
        prev.userPhone = p.userPhone || prev.userPhone;
      }
    }
  }
  return [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));
}

export default function CoachPlayersScreen() {
  const router = useRouter();
  const { coach } = useCoachAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<CoachSessionResult[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!coach?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listSessions({ coachId: coach.id, limit: 200, offset: 0 });
      setSessions(result.sessions);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  useEffect(() => {
    void load();
  }, [load]);


  const players = useMemo(() => aggregatePlayers(sessions), [sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.userName.toLowerCase().includes(q));
  }, [players, query]);

  const onPlayerPress = useCallback((p: PlayerRow) => {
    Alert.alert(p.userName, [`Phone: ${p.userPhone}`, `Sessions: ${p.sessionCount}`, `Last: ${p.lastSessionDate}`].join('\n'));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PlayerRow }) => (
      <Pressable
        onPress={() => onPlayerPress(item)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.bgCard, borderColor: t.border, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {item.userName}
          </Text>
          <StatusChip status={`${item.sessionCount} sess.`} theme={t} />
        </View>
        <Text style={[styles.meta, { color: t.textSec }]} numberOfLines={1}>
          {item.userPhone}
        </Text>
        <Text style={[styles.meta, { color: t.textMuted }]}>Last session: {item.lastSessionDate}</Text>
      </Pressable>
    ),
    [onPlayerPress],
  );

  const showRatings =
    coach &&
    (coach.ratingOverall != null ||
      coach.ratingOnTime != null ||
      coach.ratingFriendly != null ||
      coach.ratingProfessional != null ||
      coach.ratingRecommend != null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <SectionHeader title="Players" theme={t} />
          <Pressable
            onPress={() => router.push('/(coach-tabs)/earnings' as Href)}
            style={({ pressed }) => [styles.earningsLink, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="cash-outline" size={18} color={t.accent} />
            <Text style={[styles.earningsLinkText, { color: t.accent }]}>Earnings</Text>
          </Pressable>
        </View>
      </View>

      {showRatings ? (
        <View style={[styles.ratingBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
          <Text style={[styles.ratingTitle, { color: t.textSec }]}>Your ratings</Text>
          {coach.ratingOverall != null ? (
            <RatingBar label="Overall" value={coach.ratingOverall} theme={t} />
          ) : null}
          {coach.ratingOnTime != null ? (
            <RatingBar label="On time" value={coach.ratingOnTime} theme={t} />
          ) : null}
          {coach.ratingFriendly != null ? (
            <RatingBar label="Friendly" value={coach.ratingFriendly} theme={t} />
          ) : null}
          {coach.ratingProfessional != null ? (
            <RatingBar label="Pro" value={coach.ratingProfessional} theme={t} />
          ) : null}
          {coach.ratingRecommend != null ? (
            <RatingBar label="Recommend" value={coach.ratingRecommend} theme={t} />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.searchWrap, { backgroundColor: t.bgInput, borderColor: t.border }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name"
          placeholderTextColor={t.textMuted}
          style={[styles.searchInput, { color: t.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={players.length === 0 ? 'No players yet' : 'No matches'}
          subtitle={
            players.length === 0
              ? 'Players from your sessions will show up here.'
              : 'Try a different search.'
          }
          theme={t}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  ratingBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ratingTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  meta: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  earningsLinkText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
