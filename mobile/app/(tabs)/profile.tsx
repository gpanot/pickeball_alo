import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BackIcon, CalendarIcon, HeartIcon, CoachIcon } from '@/components/Icons';
import { Ionicons } from '@expo/vector-icons';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import { useCourtMap } from '@/context/CourtMapContext';

export default function ProfileRoute() {
  const router = useRouter();
  const ctx = useCourtMap();
  const {
    t,
    userName,
    userPhone,
    backFromProfile,
    handleSaveProfile,
    loadBookings,
    goSavedTab,
    logoutPlayer,
  } = ctx;

  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(userName);
    setPhone(userPhone);
  }, [userName, userPhone]);

  const inputStyle = {
    width: '100%' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: t.bgInput,
    borderWidth: 1,
    borderColor: t.border,
    color: t.text,
    fontSize: 15,
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ScreenTopBar t={t} contentStyle={styles.topBarInner}>
        <Pressable onPress={backFromProfile}>
          <BackIcon color={t.text} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>Profile</Text>
      </ScreenTopBar>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <View style={[styles.avatar, { backgroundColor: t.accentBg, borderColor: t.accent }]}>
          <Text style={{ fontSize: 32 }}>🏓</Text>
        </View>
        <View style={{ gap: 12, marginBottom: 24 }}>
          <View>
            <Text style={[styles.label, { color: t.textMuted }]}>Name</Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={t.textMuted}
            />
          </View>
          <View>
            <Text style={[styles.label, { color: t.textMuted }]}>Phone</Text>
            <TextInput
              style={inputStyle}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={t.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <Pressable
          onPress={() => {
            handleSaveProfile(name.trim(), phone.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          style={[styles.saveBtn, { backgroundColor: t.accent }]}
        >
          <Text style={styles.saveBtnText}>{saved ? '✓ SAVED' : 'SAVE'}</Text>
        </Pressable>
        <View style={{ gap: 10, marginTop: 24 }}>
          <Pressable
            onPress={() => {
              void loadBookings();
              router.push('/(tabs)/(bookings)');
            }}
            style={[styles.link, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <CalendarIcon color={t.accent} />
            <Text style={[styles.linkText, { color: t.text }]}>My Bookings</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              goSavedTab();
            }}
            style={[styles.link, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <HeartIcon color={t.accent} />
            <Text style={[styles.linkText, { color: t.text }]}>Saved Courts</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/(coach)/my-credits' as any)}
            style={[styles.link, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Ionicons name="wallet-outline" size={20} color={t.accent} />
            <Text style={[styles.linkText, { color: t.text }]}>My Credits</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/(coach)' as any)}
            style={[styles.link, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <CoachIcon size={20} color={t.accent} />
            <Text style={[styles.linkText, { color: t.text }]}>Find a Coach</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Log out player',
                'This clears your local player profile and starts a fresh anonymous session.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log out', style: 'destructive', onPress: logoutPlayer },
                ],
              )
            }
            style={[styles.link, { backgroundColor: t.bgCard, borderColor: t.red }]}
          >
            <Text style={[styles.linkText, { color: t.red }]}>Log out Player</Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    paddingBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '700' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  saveBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  linkText: { fontSize: 15, fontWeight: '600' },
});
